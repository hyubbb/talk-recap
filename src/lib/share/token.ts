import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SLUG_LENGTH = 14;
const SLUG_RE = /^[0-9A-Za-z]{12,32}$/;

/** crypto.randomBytes로 편향 없는 base62 문자열을 만든다 (256 % 62 편향을 거부 샘플링으로 제거). */
export function randomBase62(length: number): string {
  let out = "";
  while (out.length < length) {
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i];
      if (b < 248) out += BASE62[b % 62]; // 248 = 62 * 4
    }
  }
  return out;
}

/** 공유 링크 슬러그. 14자 base62 ≈ 83비트라 추측 불가능. */
export function newSlug(): string {
  return randomBase62(SLUG_LENGTH);
}

export function isValidSlug(id: string): boolean {
  return SLUG_RE.test(id);
}

/** 삭제 토큰. 응답에 한 번만 돌려주고 DB에는 해시만 둔다. */
export function newDeleteToken(): string {
  return randomBase62(32);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** 토큰 해시를 상수 시간으로 비교한다. */
export function verifyToken(token: string | null | undefined, storedHash: string): boolean {
  if (!token || token.length > 200 || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
