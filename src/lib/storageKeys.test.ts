import { beforeEach, describe, expect, it, vi } from "vitest";

/** 테스트용 메모리 Storage (jsdom 없이) */
class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", localStorage);
vi.stubGlobal("sessionStorage", sessionStorage);

describe("storeKey / 예전 키 옮기기", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  it("tokbang:* 키를 talk-recap:*으로 옮기고 예전 키는 지운다", async () => {
    localStorage.setItem("tokbang:report:abc", '{"id":"abc"}');
    localStorage.setItem("tokbang:voter", "v1");
    sessionStorage.setItem("tokbang:report:s1", "{}");
    localStorage.setItem("other:key", "x");
    const { storeKey } = await import("./storageKeys");
    expect(storeKey("report", "abc")).toBe("talk-recap:report:abc");
    expect(localStorage.getItem("talk-recap:report:abc")).toBe('{"id":"abc"}');
    expect(localStorage.getItem("talk-recap:voter")).toBe("v1");
    expect(sessionStorage.getItem("talk-recap:report:s1")).toBe("{}");
    expect(localStorage.getItem("tokbang:report:abc")).toBeNull();
    expect(localStorage.getItem("other:key")).toBe("x");
  });

  it("새 키가 이미 있으면 덮어쓰지 않는다", async () => {
    localStorage.setItem("talk-recap:voter", "new");
    localStorage.setItem("tokbang:voter", "old");
    const { storeKey } = await import("./storageKeys");
    storeKey("voter");
    expect(localStorage.getItem("talk-recap:voter")).toBe("new");
    expect(localStorage.getItem("tokbang:voter")).toBeNull();
  });
});
