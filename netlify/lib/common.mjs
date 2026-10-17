// 서버 함수 공통 도구
import { getStore } from "@netlify/blobs";

export const STORE_NAME = "aid-dashboard";
export const MAX_BACKUPS = 50;

export function openStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// 한국 시간 "YYYY-MM-DD HH:mm"
export function kstNow() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

export function validate(data) {
  if (!data || typeof data !== "object") return "데이터 형식이 올바르지 않습니다.";
  if (!data.meta || typeof data.meta !== "object") return "meta 항목이 없습니다.";
  if (!Array.isArray(data.indicators) || !data.indicators.length) return "indicators 항목이 없습니다.";
  for (const ind of data.indicators) {
    if (!Array.isArray(ind.subs) || !ind.subs.length) return "세부지수가 없습니다: " + (ind.name || "");
    for (const s of ind.subs) {
      const cur = s.current;
      if (cur !== null && cur !== undefined && (typeof cur !== "number" || !isFinite(cur) || cur < 0)) return "현재값은 0 이상의 숫자이거나 비워 두어야 합니다: " + s.name;
      for (const k of ["weight", "target26", "target27"]) {
        if (typeof s[k] !== "number" || !(s[k] > 0)) return k + " 값이 올바르지 않습니다: " + s.name;
      }
    }
  }
  if (data.actions !== undefined && !Array.isArray(data.actions)) return "actions 항목 형식이 올바르지 않습니다.";
  return null;
}

// 현재 데이터를 백업하고 이력 목록을 갱신(최근 MAX_BACKUPS개 보관)
export async function backupCurrent(store, cur, reason) {
  const key = "backups/" + String(Date.now()).padStart(15, "0");
  await store.setJSON(key, cur);
  const index = (await store.get("backups-index", { type: "json" })) || [];
  index.unshift({
    key,
    savedAt: kstNow(),
    reason,
    versionUpdatedAt: (cur.meta && cur.meta.updatedAt) || "-",
    versionUpdatedBy: (cur.meta && cur.meta.updatedBy) || "-",
  });
  const removed = index.splice(MAX_BACKUPS);
  await store.setJSON("backups-index", index);
  for (const r of removed) {
    try { await store.delete(r.key); } catch (e) { /* 무시 */ }
  }
}
