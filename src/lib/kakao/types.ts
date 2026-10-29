export type MessageKind =
  | "text"
  | "photo"
  | "video"
  | "emoticon"
  | "file"
  | "deleted"
  | "link";

/**
 * 카톡 메시지 한 개.
 * ts는 "대화에 찍힌 벽시계 시각"을 UTC 필드에 그대로 담은 값이다.
 * (시간대 변환 없이 getUTCHours() 등으로 원래 시각을 그대로 읽는다.)
 */
export interface ChatMessage {
  ts: number;
  author: string;
  text: string;
  kind: MessageKind;
}

export interface SystemEvent {
  ts: number;
  text: string;
}

export type ExportFormat =
  | "mobile-dot" // 2026. 7. 19. 오후 5:03, 이름 : 내용 (iOS 계열)
  | "mobile-korean" // 2026년 7월 19일 오후 5:03, 이름 : 내용 (안드로이드 계열)
  | "pc-bracket" // [이름] [오후 5:03] 내용 (PC 텍스트)
  | "english" // Jul 19, 2026 at 5:03 PM, Name : text
  | "csv" // Date,User,Message (맥 PC 저장)
  | "unknown";

export interface ParsedChat {
  format: ExportFormat;
  title: string | null;
  messages: ChatMessage[];
  system: SystemEvent[];
  /** 메시지로도, 이어지는 줄로도 해석하지 못한 줄 수 (형식 감지 품질 확인용) */
  unparsedLines: number;
  /** 해석 못 한 줄 앞 3개 ("형식 제보"용, 보여주기 전에 이름을 가린다) */
  unparsedSamples: string[];
}
