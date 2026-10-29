"use client";

import { useAtom } from "jotai";
import { useState } from "react";
import { aliasesAtom, groupsAtom } from "@/state/upload";
import type { MemberGroup } from "@/lib/kakao/members";
import { initialOf, memberColor } from "@/lib/ui/colors";

const NAME_MAX = 20;

/**
 * 멤버 확인: 표시 이름 바꾸기, 같은 사람 합치기, 분석에서 빼기, 부르는 별명 추가.
 * 바뀔 때마다 onChange로 통계를 다시 계산한다.
 */
export function MemberEditor({
  onChange,
}: {
  onChange: (groups: MemberGroup[], aliases: Record<string, string[]>) => void;
}) {
  const [groups, setGroups] = useAtom(groupsAtom);
  const [aliases, setAliases] = useAtom(aliasesAtom);
  const people = groups.filter((g) => !g.isBot);
  const excluded = groups.filter((g) => g.isBot);

  const commit = (next: MemberGroup[], nextAliases = aliases) => {
    setGroups(next);
    onChange(next, nextAliases);
  };

  const rename = (id: string, displayName: string) =>
    setGroups(groups.map((g) => (g.id === id ? { ...g, displayName } : g)));

  // 이름 칸에서 나갈 때 정리: 앞뒤 공백 제거, 비우면 원래 이름, 다른 멤버와 같으면 되돌린다
  // (결과·스토리·퀴즈가 이름으로 사람을 구분하므로 겹치면 안 된다)
  const [nameError, setNameError] = useState<{ id: string; text: string } | null>(null);
  const [before, setBefore] = useState<Record<string, string>>({});
  const finishRename = (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    let name = g.displayName.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
    let error: string | null = null;
    if (!name) {
      name = before[id] ?? g.names[0];
      error = "이름이 비어 있어서 원래대로 돌려놨어요.";
    } else if (people.some((o) => o.id !== id && o.displayName.trim() === name)) {
      name = before[id] ?? g.names[0];
      error = "다른 멤버와 이름이 같아요. 다른 이름으로 바꿔 주세요.";
    }
    setNameError(error ? { id, text: error } : null);
    const next = groups.map((x) => (x.id === id ? { ...x, displayName: name } : x));
    commit(next);
  };

  const merge = (fromId: string, intoId: string) => {
    const from = groups.find((g) => g.id === fromId)!;
    commit(
      groups
        .filter((g) => g.id !== fromId)
        .map((g) =>
          g.id === intoId
            ? { ...g, names: [...g.names, ...from.names], messageCount: g.messageCount + from.messageCount }
            : g,
        ),
    );
  };

  const toggleExclude = (id: string) =>
    commit(groups.map((g) => (g.id === id ? { ...g, isBot: !g.isBot } : g)));

  const setAlias = (id: string, raw: string) => {
    const next = { ...aliases, [id]: raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean) };
    setAliases(next);
    onChange(groups, next);
  };

  return (
    <div className="flex flex-col gap-3">
      {people.map((g, i) => (
        <div key={g.id} className="rounded-[var(--radius-card)] bg-dusk p-4">
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-night"
              style={{ background: memberColor(i) }}
              aria-hidden
            >
              {initialOf(g.displayName)}
            </span>
            <label className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-dashed border-haze/40 px-2 py-1 focus-within:border-solid focus-within:border-spark focus-within:bg-dusk-2">
              <input
                value={g.displayName}
                maxLength={NAME_MAX}
                onFocus={() => setBefore((b) => ({ ...b, [g.id]: g.displayName }))}
                onChange={(e) => rename(g.id, e.target.value)}
                onBlur={() => finishRename(g.id)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                aria-label={`${g.names[0]}의 표시 이름 (눌러서 바꾸기)`}
                aria-describedby={nameError?.id === g.id ? `name-err-${g.id}` : undefined}
                className="min-w-0 flex-1 bg-transparent text-[17px] font-bold outline-none"
              />
              <span aria-hidden className="shrink-0 text-[13px] text-haze group-focus-within:hidden">
                ✎
              </span>
            </label>
            <span className="tabular shrink-0 text-[14px] text-haze">{g.messageCount.toLocaleString()}개</span>
          </div>

          {nameError?.id === g.id && (
            <p id={`name-err-${g.id}`} role="alert" className="mt-2 text-[13px] text-danger">
              {nameError.text}
            </p>
          )}
          {(g.names.length > 1 || g.displayName !== g.names[0]) && (
            <p className="mt-2 text-[13px] text-haze">대화방 이름: {g.names.join(", ")}</p>
          )}

          <label className="mt-3 block text-[13px] text-haze">
            다른 사람들이 부르는 별명
            <input
              defaultValue={(aliases[g.id] ?? []).join(", ")}
              onBlur={(e) => setAlias(g.id, e.target.value)}
              placeholder="예: 도토리, 도토"
              className="mt-1 h-10 w-full rounded-[10px] bg-dusk-2 px-3 text-[15px] text-moon outline-none placeholder:text-haze/60"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <select
              value=""
              onChange={(e) => e.target.value && merge(g.id, e.target.value)}
              aria-label={`${g.displayName}을(를) 다른 멤버와 합치기`}
              className="h-9 flex-1 rounded-[10px] bg-dusk-2 px-2 text-[13px] text-haze"
            >
              <option value="">같은 사람과 합치기…</option>
              {people
                .filter((o) => o.id !== g.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.displayName}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => toggleExclude(g.id)}
              className="h-9 rounded-[10px] bg-dusk-2 px-3 text-[13px] text-haze"
            >
              분석에서 빼기
            </button>
          </div>
        </div>
      ))}

      {excluded.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-dusk-2 p-4">
          <p className="text-[13px] text-haze">분석에서 빠진 이름 (봇 포함)</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {excluded.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => toggleExclude(g.id)}
                  className="h-8 rounded-full bg-dusk px-3 text-[13px]"
                  title="다시 포함하기"
                >
                  {g.displayName} · 다시 넣기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
