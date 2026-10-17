// /api/history : 변경 이력 조회(GET), 이전 버전으로 되돌리기(POST {key, by})
import seed from "../lib/seed.mjs";
import { openStore, json, kstNow, backupCurrent } from "../lib/common.mjs";

export const config = { path: "/api/history" };

export default async (req) => {
  const store = openStore();

  if (req.method === "GET") {
    const index = (await store.get("backups-index", { type: "json" })) || [];
    return json(200, { ok: true, items: index.slice(0, 30) });
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "지원하지 않는 요청입니다." });

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "JSON 형식이 올바르지 않습니다." }); }
  const key = String((body && body.key) || "");
  const by = String((body && body.by) || "").trim().slice(0, 40);
  if (!/^backups\/\d{15}$/.test(key)) return json(400, { ok: false, error: "되돌릴 버전이 올바르지 않습니다." });
  if (!by) return json(400, { ok: false, error: "수정자 이름을 입력해 주십시오." });

  const old = await store.get(key, { type: "json" });
  if (!old) return json(404, { ok: false, error: "해당 버전을 찾을 수 없습니다(보관 기간 경과)." });

  const cur = (await store.get("data", { type: "json" })) || seed;
  await backupCurrent(store, cur, "되돌리기 전 자동 백업");
  const restoredFrom = (old.meta && old.meta.updatedAt) || "-";
  old.meta = Object.assign({}, old.meta, {
    updatedAt: kstNow(),
    updatedBy: by + " (" + restoredFrom + " 버전으로 되돌림)",
    rev: Number((cur.meta && cur.meta.rev) || 0) + 1,
  });
  await store.setJSON("data", old);
  console.log("[되돌리기]", by, key);
  return json(200, { ok: true, updatedAt: old.meta.updatedAt, rev: old.meta.rev });
};
