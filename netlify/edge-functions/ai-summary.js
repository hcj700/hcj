// /api/ai-summary : Claude로 AI 요약보고서 생성(Edge Function, 스트리밍)
// - 일반 함수의 실행시간 제한(수십 초)을 피하려고 Edge Function에서 응답을 흘려보냅니다.
// - 지시문은 서버에 고정(../lib/prompt.mjs), 클라이언트는 수치 데이터만 보냅니다.
// - 같은 데이터는 30분간 캐시, 사이트 전체 호출은 시간당 AI_MAX_PER_HOUR회로 제한합니다.
import { getStore } from "@netlify/blobs";
import prompt from "../lib/prompt.mjs";

export const config = { path: "/api/ai-summary" };

const env = (k, d) => {
  try { const v = globalThis.Netlify && globalThis.Netlify.env.get(k); return v || d; } catch { return d; }
};
const json = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const kst = () => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date()).replace(/-/g, ".");
const CACHE_TTL = 30 * 60 * 1000;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "지원하지 않는 요청입니다." });
  const apiKey = env("ANTHROPIC_API_KEY", "");
  if (!apiKey) return json(400, { ok: false, error: "AI 기능이 설정되지 않았습니다. Netlify 환경변수 ANTHROPIC_API_KEY를 등록해 주십시오." });

  const raw = await req.text();
  if (!raw || raw.length > 100 * 1024) return json(400, { ok: false, error: "요청 크기가 올바르지 않습니다." });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "JSON 형식이 올바르지 않습니다." }); }
  const payload = body && body.payload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload["지표"])) {
    return json(400, { ok: false, error: "성과 데이터 형식이 올바르지 않습니다." });
  }
  const force = !!body.force;
  const model = env("AI_MODEL", "claude-sonnet-5-5");
  const maxPerHour = Number(env("AI_MAX_PER_HOUR", "30")) || 30;

  const stable = Object.assign({}, payload);
  delete stable["기간경과율"]; delete stable["마감까지_남은일수"];
  const sig = await sha256(JSON.stringify(stable));

  let store = null;
  try { store = getStore({ name: "aid-dashboard", consistency: "strong" }); } catch (e) { console.log("[AI] 저장소 사용 불가:", e.message); }

  // 캐시
  if (store && !force) {
    try {
      const c = await store.get("ai/cache", { type: "json" });
      if (c && c.sig === sig && Date.now() - c.ts < CACHE_TTL) return json(200, Object.assign({}, c.res, { cached: true }));
    } catch (e) { /* 캐시 없음 */ }
  }
  // 시간당 호출 제한
  if (store) {
    try {
      const now = Date.now();
      const calls = ((await store.get("ai/calls", { type: "json" })) || []).filter((t) => now - t < 3600 * 1000);
      if (calls.length >= maxPerHour) {
        return json(429, { ok: false, error: "AI 요약 요청이 1시간 한도(" + maxPerHour + "회)를 넘었습니다. 잠시 후 다시 시도하거나 자동 집계 보고를 이용해 주십시오." });
      }
      calls.push(now);
      await store.setJSON("ai/calls", calls);
    } catch (e) { console.log("[AI] 호출 기록 실패:", e.message); }
  }

  const user = prompt.user.replace("{asof}", kst()).replace("{payload}", JSON.stringify(payload, null, 1));
  let upstream;
  try {
    upstream = await fetch(env("AI_BASE_URL", "https://api.anthropic.com").replace(/\/$/, "") + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2000, stream: true, system: prompt.system, messages: [{ role: "user", content: user }] }),
    });
  } catch (e) {
    return json(502, { ok: false, error: "AI 서비스에 연결하지 못했습니다. (" + e.message + ")" });
  }
  if (!upstream.ok) {
    let msg = "";
    try { const j = await upstream.json(); msg = (j.error && j.error.message) || ""; } catch { /* 무시 */ }
    const hint = { 401: "API 키가 올바르지 않습니다.", 403: "API 키 권한을 확인해 주십시오.", 404: "모델 이름(AI_MODEL)을 확인해 주십시오.",
      429: "AI 서비스 사용량 한도에 도달했습니다.", 529: "AI 서비스가 일시적으로 혼잡합니다." }[upstream.status] || "";
    return json(502, { ok: false, error: (hint + " (HTTP " + upstream.status + ") " + msg).trim() });
  }

  // Anthropic SSE → 간단한 SSE({t}, {done}, {error})로 변환해 전달
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();
  let full = "", usedModel = model, buf = "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o) => controller.enqueue(enc.encode("data: " + JSON.stringify(o) + "\n\n"));
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            let ev;
            try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
            if (ev.type === "message_start" && ev.message && ev.message.model) usedModel = ev.message.model;
            else if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { full += ev.delta.text; send({ t: ev.delta.text }); }
            else if (ev.type === "error") send({ error: (ev.error && ev.error.message) || "AI 응답 중 오류가 발생했습니다." });
          }
        }
        const res = { ok: true, text: full, model: usedModel, generatedAt: kst() };
        if (store && full) { try { await store.setJSON("ai/cache", { sig, ts: Date.now(), res }); } catch { /* 무시 */ } }
        send({ done: true, model: usedModel, generatedAt: res.generatedAt });
      } catch (e) {
        send({ error: "AI 응답을 받는 중 연결이 끊겼습니다. (" + e.message + ")" });
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" } });
};
