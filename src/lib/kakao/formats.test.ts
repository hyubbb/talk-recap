import { describe, expect, it } from "vitest";
import { parseKakaoText } from "./parse";
import { maskSampleLine, needsFormatReport } from "./formatReport";

// T9: 실제 내보내기 형식을 지어낸 내용으로 재현한 샘플

const WINDOWS_PC = `도토리 님과 카카오톡 대화
저장한 날짜 : 2026-10-26 19:08:00

--------------- 2026년 7월 19일 일요일 ---------------
도토리님이 고등어님을 초대했습니다.
[도토리] [오후 5:03] 다들 모여
[고등어] [오후 5:04] 넵
[고등어] [오후 5:04] 여러 줄
두 번째 줄
--------------- 2026년 7월 20일 월요일 ---------------
[감자] [오전 12:01] 자정 지났다
`;

const MAC_PC_24H = `도토리 님과 카카오톡 대화
저장한 날짜 : 2026-10-26 19:08:00

--------------- 2026년 7월 19일 일요일 ---------------
[도토리] [17:03] 24시간제
[고등어] [00:15] 새벽
`;

const ANDROID = `도토리 님과 카카오톡 대화
저장한 날짜 : 2026년 10월 26일 오후 7:08

2026년 7월 19일 일요일
2026년 7월 19일 오후 5:03, 도토리님이 고등어님을 초대했습니다.
2026년 7월 19일 오후 5:04, 도토리 : 사진
2026년 7월 19일 오후 5:05, 고등어 : 이모티콘
2026년 7월 19일 오전 12:05, 고등어 : 늦었다
`;

const ANDROID_DOT = `2026년 7월 19일 일요일
2026. 7. 19. 17:03, 도토리 : 24시간제 안드로이드
`;

const IOS_ENGLISH = `Talk_2026.10.26 19:08-1.txt
Date Saved : Oct 26, 2026 at 7:08\u202fPM

Sunday, July 19, 2026
Jul 19, 2026 at 5:03\u202fPM: Dotori invited Mackerel.
Jul 19, 2026 at 5:03\u202fPM, Dotori : hello
Jul 19, 2026 at 12:10\u202fAM, Mackerel : late night
`;

const ANDROID_ENGLISH = `Sunday, July 19, 2026
July 19, 2026, 5:03 PM, Dotori : hello there
July 19, 2026, 5:04 PM, Mackerel : hi
`;

const PC_ENGLISH = `Talk with Dotori
Date Saved : 2026-10-26 19:08:00

--------------- Sunday, July 19, 2026 ---------------
Dotori invited Mackerel.
[Dotori] [5:03 PM] hello
[Mackerel] [12:30 AM] night owl
`;

describe("내보내기 형식 (T9)", () => {
  it("윈도우 PC: 날짜 구분선, 시스템 메시지, 여러 줄, 날짜 바뀜", () => {
    const r = parseKakaoText(WINDOWS_PC);
    expect(r.format).toBe("pc-bracket");
    expect(r.messages).toHaveLength(4);
    expect(r.system).toHaveLength(1);
    expect(r.messages[2].text).toBe("여러 줄\n두 번째 줄");
    const last = new Date(r.messages[3].ts);
    expect([last.getUTCDate(), last.getUTCHours()]).toEqual([20, 0]);
    expect(r.unparsedLines).toBe(0);
  });

  it("PC 24시간제", () => {
    const r = parseKakaoText(MAC_PC_24H);
    expect(r.messages.map((m) => new Date(m.ts).getUTCHours())).toEqual([17, 0]);
  });

  it("안드로이드 한글", () => {
    const r = parseKakaoText(ANDROID);
    expect(r.format).toBe("mobile-korean");
    expect(r.messages).toHaveLength(3);
    expect(r.messages[0].kind).toBe("photo");
    expect(new Date(r.messages[2].ts).getUTCHours()).toBe(0);
    expect(r.unparsedLines).toBe(0);
  });

  it("안드로이드 점 형식 24시간제", () => {
    const r = parseKakaoText(ANDROID_DOT);
    expect(r.messages).toHaveLength(1);
    expect(new Date(r.messages[0].ts).getUTCHours()).toBe(17);
  });

  it("iOS 영문 설정 (좁은 공백 U+202F)", () => {
    const r = parseKakaoText(IOS_ENGLISH);
    expect(r.format).toBe("english");
    expect(r.messages).toHaveLength(2);
    expect(r.system).toHaveLength(1);
    expect(new Date(r.messages[1].ts).getUTCHours()).toBe(0);
  });

  it("안드로이드 영문 설정", () => {
    const r = parseKakaoText(ANDROID_ENGLISH);
    expect(r.messages.map((m) => m.author)).toEqual(["Dotori", "Mackerel"]);
    expect(new Date(r.messages[0].ts).getUTCHours()).toBe(17);
  });

  it("PC 영문 설정", () => {
    const r = parseKakaoText(PC_ENGLISH);
    expect(r.format).toBe("pc-bracket");
    expect(r.messages).toHaveLength(2);
    expect(r.system).toHaveLength(1);
    expect(new Date(r.messages[1].ts).getUTCHours()).toBe(0);
    expect(new Date(r.messages[0].ts).getUTCMonth()).toBe(6);
  });

  it("모르는 줄은 세고 앞 3개를 샘플로 남긴다", () => {
    const r = parseKakaoText(`2026. 7. 19. 오후 5:03, 도토리 : 안녕
2026. 7. 19. 오후 5:04, 고등어 : 반가워
`);
    expect(r.unparsedLines).toBe(0);
    // 첫 메시지 앞에 시스템 메시지가 있어 last가 없는 상태의 모르는 줄
    const u = parseKakaoText(`2026. 7. 19. 오후 5:03: 도토리님이 들어왔습니다.
19/07/2026 17:03 - 도토리: 처음 보는 형식
19/07/2026 17:04 - 고등어: 둘
19/07/2026 17:05 - 고등어: 셋
19/07/2026 17:06 - 고등어: 넷
`);
    expect(u.unparsedLines).toBe(4);
    expect(u.unparsedSamples).toHaveLength(3);
  });
});

describe("형식 제보", () => {
  it("1% 넘으면 안내", () => {
    expect(needsFormatReport(1, 1000)).toBe(false);
    expect(needsFormatReport(20, 1000)).toBe(true);
    expect(needsFormatReport(0, 0)).toBe(false);
  });

  it("이름과 내용은 가리고 형식은 남긴다", () => {
    const out = maskSampleLine("2026/07/19 17:03 - 도토리: 오늘 점심 뭐 먹지 010-1234-5678", ["도토리"]);
    expect(out).not.toContain("도토리");
    expect(out).not.toContain("점심");
    expect(out).not.toContain("1234");
    expect(out).toContain("2026/07/19 17:03 - ○○:");
  });
});
