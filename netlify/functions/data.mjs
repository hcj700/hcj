// /api/data : 성과 데이터 조회(GET)·저장(POST). 로그인 없이 누구나 수정할 수 있으며, 저장할 때마다 이전 버전을 백업합니다.
import seed from "../lib/seed.mjs";
import { openStore, json, kstNow, validate, backupCurrent } from "../lib/common.mjs";

export const config = { path: "/api/data" };

export default async (req) => {
  const store = openStore();

  if (req.method === "GET") {
    const data = (await store.get("data", { type: "json" })) || seed;
    return json(200, data);
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "지원하지 않는 요청입니다." });

  const text = await req.text();
  if (!text || text.length > 1_000_000) return json(400, { ok: false, error: "요청 크기가 올바르지 않습니다." });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: "JSON 형식이 올바르지 않습니다." }); }

  const data = body && body.data;
  const err = validate(data);
  if (err) return json(400, { ok: false, error: err });
  const by = String(data.meta.updatedBy || "").trim().slice(0, 40);
  if (!by) return json(400, { ok: false, error: "수정자 이름을 입력해 주십시오." });

  const cur = (await store.get("data", { type: "json" })) || seed;
  const curRev = Number((cur.meta && cur.meta.rev) || 0);
  // 동시 수정 방지: 불러온 뒤 다른 사람이 먼저 저장했으면 거절
  if (body.baseRev !== undefined && Number(body.baseRev) !== curRev) {
    return json(409, {
      ok: false,
      error: "다른 사용자가 먼저 저장했습니다(" + (cur.meta.updatedAt || "-") + ", " + (cur.meta.updatedBy || "-") + "). 다시 불러온 뒤 수정해 주십시오.",
    });
  }

  await backupCurrent(store, cur, "저장 전 자동 백업");
  data.meta.updatedBy = by;
  data.meta.updatedAt = kstNow();
  data.meta.rev = curRev + 1;
  await store.setJSON("data", data);
  console.log("[저장]", by, data.meta.updatedAt, "rev", data.meta.rev);
  return json(200, { ok: true, updatedAt: data.meta.updatedAt, rev: data.meta.rev });
};
