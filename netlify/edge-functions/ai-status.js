// /api/ai-status : AI 요약 사용 가능 여부(API 키 등록 여부만 알려 주며 키 자체는 노출하지 않음)
export const config = { path: "/api/ai-status" };

export default async () => {
  let key = "", model = "claude-sonnet-5-5";
  try {
    key = (globalThis.Netlify && globalThis.Netlify.env.get("ANTHROPIC_API_KEY")) || "";
    model = (globalThis.Netlify && globalThis.Netlify.env.get("AI_MODEL")) || model;
  } catch { /* 무시 */ }
  return new Response(JSON.stringify({ enabled: !!key, model }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};
