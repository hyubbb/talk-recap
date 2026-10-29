"use client";

import { useCallback, useSyncExternalStore } from "react";
import { storeKey } from "@/lib/storageKeys";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage 문자열 하나. 서버 렌더와 첫 하이드레이션에서는 undefined(아직 모름) */
export function useLocalValue(key: string): [string | null | undefined, (v: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined,
  );
  const set = useCallback(
    (v: string | null) => {
      try {
        if (v === null) localStorage.removeItem(key);
        else localStorage.setItem(key, v);
      } catch {}
      emit();
    },
    [key],
  );
  return [value, set];
}

/** 공유 링크에서 "나는 누구?"로 고른 이름. ""면 구경만, null이면 아직 안 고름 */
export function useMe(shareId: string | null) {
  return useLocalValue(storeKey("me", shareId ?? "local"));
}

/** 브라우저별 익명 투표 키 */
export function voterKey(): string {
  const k = storeKey("voter");
  let v = read(k);
  if (!v) {
    v = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(k, v);
    } catch {}
  }
  return v;
}
