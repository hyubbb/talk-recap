import type { ChatMessage } from "./types";

export interface MemberGroup {
  id: string;
  displayName: string;
  /** 대화에 등장한 원래 이름들 (닉네임 변경 포함) */
  names: string[];
  messageCount: number;
  isBot: boolean;
}

const BOT_NAMES = /^(ChatGPT|오픈채팅봇|카카오톡 봇|Bot)$/i;

/**
 * 원래 이름들을 사람 단위로 묶는 기본 제안을 만든다.
 * "홍길동"과 "홍길동 길동이"처럼 한쪽이 다른 쪽의 첫 단어이면 같은 사람으로 본다.
 * 최종 판단은 사용자가 화면에서 한다.
 */
export function suggestMembers(messages: ChatMessage[]): MemberGroup[] {
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.author, (counts.get(m.author) ?? 0) + 1);

  const names = [...counts.keys()].sort((a, b) => a.length - b.length);
  const root = new Map<string, string>();
  for (const n of names) {
    const head = n.split(/\s+/)[0];
    const parent = names.find(
      (o) => o !== n && root.get(o) === o && (o === head || o.split(/\s+/)[0] === head),
    );
    root.set(n, parent ?? n);
  }

  const groups = new Map<string, MemberGroup>();
  for (const n of names) {
    const r = root.get(n)!;
    const g = groups.get(r) ?? {
      id: `m${groups.size + 1}`,
      displayName: r,
      names: [],
      messageCount: 0,
      isBot: BOT_NAMES.test(r),
    };
    g.names.push(n);
    g.messageCount += counts.get(n)!;
    groups.set(r, g);
  }
  for (const g of groups.values()) {
    // 표시 이름은 가장 많이 쓴 이름. "홍길동 길동이"처럼 별명이 붙은 쪽을 선호한다.
    g.displayName = [...g.names].sort(
      (a, b) => (counts.get(b)! - counts.get(a)!) || b.length - a.length,
    )[0];
  }
  return [...groups.values()]
    .sort((a, b) => b.messageCount - a.messageCount)
    .map((g, i) => ({ ...g, id: `m${i + 1}` }));
}

/** 원래 이름 → 멤버 id */
export function authorIndex(groups: MemberGroup[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const g of groups) for (const n of g.names) idx.set(n, g.id);
  return idx;
}
