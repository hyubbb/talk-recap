import type {
  ChatMessage,
  ExportFormat,
  MessageKind,
  ParsedChat,
  SystemEvent,
} from "./types";

const AMPM_KO: Record<string, "AM" | "PM"> = { 오전: "AM", 오후: "PM" };
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** 벽시계 시각을 UTC 필드에 담는다. */
export function wallClock(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  ampm?: string | null,
): number {
  let hour = h;
  const ap = ampm ? (AMPM_KO[ampm] ?? ampm.toUpperCase()) : null;
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return Date.UTC(y, mo - 1, d, hour, mi);
}

// ── 줄 단위 패턴 ───────────────────────────────────────────────
// 2026. 7. 19. 오후 5:03, 이름 : 내용   (24시간제·AM/PM 표기도 허용)
const RE_DOT_MSG =
  /^(\d{4})\. ?(\d{1,2})\. ?(\d{1,2})\.? (?:(오전|오후|AM|PM) )?(\d{1,2}):(\d{2})(?: ?(AM|PM))?, (.+?) : ([\s\S]*)$/;
// 2026. 7. 19. 오후 5:03: 시스템 메시지
const RE_DOT_SYS =
  /^(\d{4})\. ?(\d{1,2})\. ?(\d{1,2})\.? (?:(오전|오후|AM|PM) )?(\d{1,2}):(\d{2})(?: ?(AM|PM))?[:,] (.+)$/;
// 2026년 7월 19일 오후 5:03, 이름 : 내용
const RE_KO_MSG =
  /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (?:(오전|오후) )?(\d{1,2}):(\d{2}), (.+?) : ([\s\S]*)$/;
const RE_KO_SYS =
  /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (?:(오전|오후) )?(\d{1,2}):(\d{2}),? (.+)$/;
// Jul 19, 2026 at 5:03 PM, Name : text   /   July 19, 2026, 5:03 PM, Name : text
const RE_EN_MSG =
  /^([A-Za-z]{3,9}) (\d{1,2}), (\d{4})(?:,| at) (\d{1,2}):(\d{2}) ?(AM|PM)?, (.+?) : ([\s\S]*)$/;
const RE_EN_SYS =
  /^([A-Za-z]{3,9}) (\d{1,2}), (\d{4})(?:,| at) (\d{1,2}):(\d{2}) ?(AM|PM)?[:,] (.+)$/;
// PC 텍스트: --------------- 2026년 7월 19일 일요일 ---------------
const RE_PC_DATE = /^-{3,} ?(\d{4})년 (\d{1,2})월 (\d{1,2})일.*-{3,}$/;
// [이름] [오후 5:03] 내용
const RE_PC_MSG = /^\[(.+?)\] \[(오전|오후|AM|PM) ?(\d{1,2}):(\d{2})\] ([\s\S]*)$/;
// 날짜 구분선(모바일): 2026년 7월 19일 일요일 / Sunday, July 19, 2026
const RE_DAY_DIVIDER =
  /^(\d{4}년 \d{1,2}월 \d{1,2}일 \S+요일|[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4})$/;
const RE_HEADER = /^(저장한 날짜|Date Saved|Saved on)\s*:/;
const SYSTEM_HINT =
  /(님이 .*초대했습니다|님이 나갔습니다|님이 들어왔습니다|님을 내보냈습니다|채팅방 관리자가|invited|left this chatroom|joined this chatroom)/;

export function classifyKind(text: string): MessageKind {
  const t = text.trim();
  if (/^(사진|Photo)( \d+장)?$/.test(t) || /^사진 \d+장$/.test(t)) return "photo";
  if (/^(동영상|Video)$/.test(t)) return "video";
  if (/^(이모티콘|Emoticon|Sticker)$/.test(t)) return "emoticon";
  if (/^(파일|File): /.test(t)) return "file";
  if (/^(삭제된 메시지입니다\.|This message was deleted\.)$/.test(t)) return "deleted";
  if (/^https?:\/\/\S+$/.test(t)) return "link";
  return "text";
}

function detectTitle(lines: string[]): string | null {
  for (const l of lines.slice(0, 5)) {
    const m = l.match(/^(.+?) (님과 카카오톡 대화|카카오톡 대화)$/);
    if (m) return m[1];
    const e = l.match(/^Talk_|^KakaoTalk Chats with (.+)$/);
    if (e && e[1]) return e[1];
  }
  return null;
}

/** CSV(맥 PC 저장) — "Date","User","Message" */
function parseCsv(text: string): ParsedChat {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const messages: ChatMessage[] = [];
  let unparsed = 0;
  for (const r of rows.slice(1)) {
    const m = r[0]?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!m || r.length < 3) { unparsed++; continue; }
    const text = r.slice(2).join(",");
    messages.push({
      ts: wallClock(+m[1], +m[2], +m[3], +m[4], +m[5]),
      author: r[1],
      text,
      kind: classifyKind(text),
    });
  }
  return { format: "csv", title: null, messages, system: [], unparsedLines: unparsed };
}

/**
 * 카카오톡 내보내기 텍스트 하나를 파싱한다.
 * 형식은 줄마다 판별하므로 섞여 있어도 동작한다.
 */
export function parseKakaoText(raw: string): ParsedChat {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = text.slice(0, 200).split("\n")[0].trim();
  if (/^"?Date"?,"?User"?,"?Message"?/i.test(firstLine)) return parseCsv(text);

  const lines = text.split("\n");
  const messages: ChatMessage[] = [];
  const system: SystemEvent[] = [];
  const counts: Record<ExportFormat, number> = {
    "mobile-dot": 0, "mobile-korean": 0, "pc-bracket": 0, english: 0, csv: 0, unknown: 0,
  };
  let pcDate: [number, number, number] | null = null;
  let last: ChatMessage | null = null;
  let unparsed = 0;

  const push = (fmt: ExportFormat, ts: number, author: string, body: string) => {
    counts[fmt]++;
    last = { ts, author: author.trim(), text: body, kind: classifyKind(body) };
    messages.push(last);
  };
  const sys = (ts: number, body: string) => {
    system.push({ ts, text: body.trim() });
    last = null;
  };

  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(RE_DOT_MSG))) {
      push("mobile-dot", wallClock(+m[1], +m[2], +m[3], +m[5], +m[6], m[4] ?? m[7]), m[8], m[9]);
    } else if ((m = line.match(RE_KO_MSG))) {
      push("mobile-korean", wallClock(+m[1], +m[2], +m[3], +m[5], +m[6], m[4]), m[7], m[8]);
    } else if ((m = line.match(RE_PC_MSG)) && pcDate) {
      push("pc-bracket", wallClock(pcDate[0], pcDate[1], pcDate[2], +m[3], +m[4], m[2]), m[1], m[5]);
    } else if ((m = line.match(RE_EN_MSG)) && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
      const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
      push("english", wallClock(+m[3], mo, +m[2], +m[4], +m[5], m[6]), m[7], m[8]);
    } else if ((m = line.match(RE_PC_DATE))) {
      pcDate = [+m[1], +m[2], +m[3]];
      last = null;
    } else if ((m = line.match(RE_DOT_SYS))) {
      sys(wallClock(+m[1], +m[2], +m[3], +m[5], +m[6], m[4] ?? m[7]), m[8]);
    } else if ((m = line.match(RE_KO_SYS)) && !RE_DAY_DIVIDER.test(line)) {
      sys(wallClock(+m[1], +m[2], +m[3], +m[5], +m[6], m[4]), m[7]);
    } else if ((m = line.match(RE_EN_SYS)) && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
      const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
      sys(wallClock(+m[3], mo, +m[2], +m[4], +m[5], m[6]), m[7]);
    } else if (RE_DAY_DIVIDER.test(line.trim()) || RE_HEADER.test(line) || line.trim() === "") {
      // 날짜 구분선, 헤더, 빈 줄: 이어지는 메시지 안의 빈 줄일 수 있으므로 last가 있으면 보존
      if (line.trim() === "" && last) (last as ChatMessage).text += "\n";
    } else if (pcDate && SYSTEM_HINT.test(line) && !line.startsWith("[")) {
      sys(pcDate ? wallClock(pcDate[0], pcDate[1], pcDate[2], 0, 0) : 0, line);
    } else if (last) {
      (last as ChatMessage).text += "\n" + line;
      (last as ChatMessage).kind = "text";
    } else if (messages.length || system.length) {
      // 첫 메시지 전의 줄은 파일 헤더(제목, 저장 날짜)로 보고 세지 않는다
      unparsed++;
    }
  }

  for (const msg of messages) msg.text = msg.text.replace(/\n+$/, "");

  const format = (Object.entries(counts) as [ExportFormat, number][])
    .sort((a, b) => b[1] - a[1])[0];
  return {
    format: format[1] > 0 ? format[0] : "unknown",
    title: detectTitle(lines),
    messages,
    system,
    unparsedLines: unparsed,
  };
}

/** 파일 이름 끝의 -1, -2 … 순서대로 정렬 (분할 저장 대응) */
export function sortSplitFiles<T extends { name: string }>(files: T[]): T[] {
  const key = (n: string) => {
    const m = n.match(/-(\d+)\.(txt|csv)$/i);
    return m ? +m[1] : 0;
  };
  return [...files].sort((a, b) => key(a.name) - key(b.name) || a.name.localeCompare(b.name));
}

/** 여러 파일의 파싱 결과를 시간순으로 합치고, 경계에서 생긴 중복을 제거한다. */
export function mergeParsed(parts: ParsedChat[]): ParsedChat {
  const messages: ChatMessage[] = [];
  const system: SystemEvent[] = [];
  const same = (a: ChatMessage, b: ChatMessage) =>
    a.ts === b.ts && a.author === b.author && a.text === b.text;
  for (const p of parts) {
    // 파일 경계에서 앞 파일 끝과 겹치는 구간(최대 20개)만 건너뛴다.
    // 같은 분에 같은 말을 연달아 보낸 정상 메시지는 지우지 않는다.
    let overlap = 0;
    for (let k = Math.min(20, messages.length, p.messages.length); k > 0; k--) {
      const tail = messages.slice(messages.length - k);
      if (tail.every((t, i) => same(t, p.messages[i]))) { overlap = k; break; }
    }
    messages.push(...p.messages.slice(overlap));
    system.push(...p.system);
  }
  // 파일 순서가 뒤섞여 있어도 안정적으로 시간순 정렬
  const ordered = messages
    .map((m, i) => [m, i] as const)
    .sort((a, b) => a[0].ts - b[0].ts || a[1] - b[1])
    .map(([m]) => m);
  const formats = parts.map((p) => p.format).filter((f) => f !== "unknown");
  return {
    format: formats[0] ?? "unknown",
    title: parts.find((p) => p.title)?.title ?? null,
    messages: ordered,
    system: system.sort((a, b) => a.ts - b.ts),
    unparsedLines: parts.reduce((s, p) => s + p.unparsedLines, 0),
  };
}
