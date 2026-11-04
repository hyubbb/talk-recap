import type { RoomStats } from "../kakao/stats";
import { MIN_SAMPLE, laughRanking } from "../kakao/fun";
import { GHOST_MIN_DAYS, SUMMON_MIN_CALLS, waitLabel } from "../kakao/records";
import { isSensitive } from "../quiz/sensitive";

/** "내 기록" 타일 한 칸 (리포트 타일과 같은 모양) */
export interface MyFact {
  key: string;
  label: string;
  value: string;
  caption: string;
  who: string[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number) => n.toLocaleString("ko-KR");

/**
 * 한 멤버의 기록 모음. 방 전체 순위 대신 "나"를 기준으로 다시 묶는다.
 * 숫자는 전부 stats에서, 표본이 적은 기록은 뺀다.
 */
export function myFacts(stats: RoomStats, id: string): MyFact[] {
  const ranked = [...stats.members].sort((a, b) => b.messages - a.messages);
  const rank = ranked.findIndex((m) => m.id === id);
  const me = ranked[rank];
  if (!me) return [];
  const out: MyFact[] = [];

  out.push({
    key: "rank", label: "수다 순위", value: `${rank + 1}위`,
    caption: `${ranked.length}명 중 · 메시지 ${num(me.messages)}개, 전체의 ${pct(me.share)}`, who: [],
  });

  let peak = 0;
  for (let h = 1; h < 24; h++) if (me.hours[h] > me.hours[peak]) peak = h;
  if (me.messages > 0) out.push({ key: "peak", label: "제일 말 많은 시간", value: `${peak}시`, caption: `밤 10시~새벽 2시에 ${pct(me.nightRatio)}`, who: [] });

  // 가장 많이 주고받은 사람 (양방향 답장 합)
  let buddy: { id: string; count: number } | null = null;
  for (const other of stats.members) {
    if (other.id === id) continue;
    const count = (stats.replies[id]?.[other.id] ?? 0) + (stats.replies[other.id]?.[id] ?? 0);
    if (count > 0 && (!buddy || count > buddy.count)) buddy = { id: other.id, count };
  }
  if (buddy) out.push({ key: "buddy", label: "제일 많이 주고받은 사람", value: `${num(buddy.count)}번`, caption: "말이 끝나고 10분 안에 서로 이어 말한 횟수", who: [id, buddy.id] });

  const top = me.catchphrases.find((c) => !isSensitive(c.text) && /[\p{L}\p{N}]/u.test(c.text));
  if (top) out.push({ key: "phrase", label: "내 말버릇", value: `‘${top.text.trim()}’`, caption: `${num(top.count)}번 썼어요`, who: [] });

  const fun = stats.fun;
  if (fun) {
    const laughs = laughRanking(fun);
    const li = laughs.findIndex((l) => l.memberId === id);
    if (li >= 0) out.push({ key: "laugh", label: "웃음 버튼", value: pct(laughs[li].ratio), caption: `말하면 1분 안에 ㅋㅋ가 터질 확률 · 방에서 ${li + 1}위`, who: [] });
    const u = fun.unanswered.find((x) => x.memberId === id);
    if (u && u.turns >= MIN_SAMPLE) out.push({ key: "lonely", label: "허공에 외친 말", value: pct(u.ratio), caption: "30분 넘게 아무도 안 받은 말의 비율", who: [] });
  }

  const rec = stats.records;
  if (rec) {
    const g = rec.ghosts.find((x) => x.memberId === id);
    if (g && g.days >= GHOST_MIN_DAYS) out.push({ key: "ghost", label: "최장 잠수", value: `${g.days}일`, caption: `그동안 메시지 ${num(g.missed)}개가 쌓였어요`, who: [] });
    const s = rec.summons.find((x) => x.memberId === id);
    if (s && s.calls >= SUMMON_MIN_CALLS) out.push({ key: "summon", label: "부르면 출동", value: waitLabel(s.median), caption: `이름이 불리고 말하기까지 (${num(s.calls)}번 중 중간값)`, who: [] });
  }

  if (stats.members.length >= 2) {
    out.push({ key: "opener", label: "첫 마디", value: `${num(me.firstOfDay)}일`, caption: "그날 방을 처음 깨운 날", who: [] });
    out.push({ key: "closer", label: "불 끈 횟수", value: `${num(me.lastWord)}번`, caption: "내 말 뒤로 3시간 넘게 조용해졌어요", who: [] });
  }
  return out;
}
