/**
 * 브라우저 저장소(localStorage/sessionStorage) 키. 모든 키는 "talk-recap:"으로 시작한다.
 * 예전 이름(tokbang-wrapped) 시절 키 "tokbang:*"는 처음 키를 만들 때 한 번 새 키로 옮긴다.
 * 이미 새 키가 있으면 새 키를 그대로 두고 예전 키만 지운다.
 */
export const STORE_PREFIX = "talk-recap:";
const LEGACY_PREFIX = "tokbang:";

let migrated = false;

export function migrateLegacyKeys(): void {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  for (const store of [localStorage, sessionStorage]) {
    try {
      const old: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k?.startsWith(LEGACY_PREFIX)) old.push(k);
      }
      for (const k of old) {
        const next = STORE_PREFIX + k.slice(LEGACY_PREFIX.length);
        const value = store.getItem(k);
        if (value !== null && store.getItem(next) === null) store.setItem(next, value);
        store.removeItem(k);
      }
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 건너뛴다
    }
  }
}

/** storeKey("report", id) → "talk-recap:report:{id}" */
export function storeKey(...parts: string[]): string {
  migrateLegacyKeys();
  return STORE_PREFIX + parts.join(":");
}
