import type { ChatMessage } from "./types";
import { maskSensitive } from "./privacy";

export interface Chunk {
  index: number;
  start: number;
  end: number;
  lines: number;
  bytes: number;
  text: string;
}

export interface ChunkOptions {
  /** 구간당 최대 줄 수 (기본 8,000) */
  maxLines?: number;
  /** 구간당 최대 바이트 (기본 350KB) */
  maxBytes?: number;
}

const enc = new TextEncoder();
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * LLM에 보낼 압축 형식: "M/D HH:MM 이름: 내용"
 * 이어지는 줄은 두 칸 들여쓴다. 민감정보는 가린다.
 */
export function compactLine(m: ChatMessage, name: string): string {
  const d = new Date(m.ts);
  const head = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${name}: `;
  const body = m.kind === "text" || m.kind === "link" ? maskSensitive(m.text).text : `(${m.kind})`;
  return head + body.replace(/\n/g, "\n  ");
}

interface Item { line: string; ts: number; day: string; bytes: number; lines: number }

/**
 * 메시지를 구간으로 나눈다. 크기 한도를 넘으면 가장 가까운 날짜 경계에서 자르고,
 * 하루 분량만으로 한도를 넘으면 그 자리에서 자른다.
 */
export function chunkMessages(
  messages: ChatMessage[],
  nameOf: (author: string) => string | null,
  opts: ChunkOptions = {},
): Chunk[] {
  const maxLines = opts.maxLines ?? 8000;
  const maxBytes = opts.maxBytes ?? 350_000;
  const chunks: Chunk[] = [];
  let buf: Item[] = [];
  let bytes = 0;
  let lines = 0;

  const emit = (items: Item[]) => {
    if (!items.length) return;
    const text = items.map((i) => i.line).join("\n");
    chunks.push({
      index: chunks.length,
      start: items[0].ts,
      end: items[items.length - 1].ts,
      lines: items.reduce((s, i) => s + i.lines, 0),
      bytes: enc.encode(text).length,
      text,
    });
  };

  for (const m of messages) {
    const name = nameOf(m.author);
    if (!name) continue;
    const line = compactLine(m, name);
    const item: Item = {
      line,
      ts: m.ts,
      day: new Date(m.ts).toISOString().slice(0, 10),
      bytes: enc.encode(line).length + 1,
      lines: line.split("\n").length,
    };
    if (buf.length && (bytes + item.bytes > maxBytes || lines + item.lines > maxLines)) {
      // 버퍼 안에서 마지막으로 날짜가 바뀐 지점을 찾는다
      let cut = buf.length;
      for (let i = buf.length - 1; i > 0; i--) {
        if (buf[i].day !== buf[i - 1].day) { cut = i; break; }
      }
      if (item.day !== buf[buf.length - 1].day) cut = buf.length;
      emit(buf.slice(0, cut));
      buf = buf.slice(cut);
      bytes = buf.reduce((s, i) => s + i.bytes, 0);
      lines = buf.reduce((s, i) => s + i.lines, 0);
    }
    buf.push(item);
    bytes += item.bytes;
    lines += item.lines;
  }
  emit(buf);
  return chunks;
}
