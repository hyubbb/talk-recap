import { describe, expect, it } from "vitest";
import { mergeParsed, parseKakaoText, sortSplitFiles } from "./parse";

// 모든 샘플은 지어낸 이름과 문장이다. 실제 대화는 레포에 넣지 않는다.
const MOBILE_DOT = `﻿Talk_2026.10.26 19:08-1.txt
저장한 날짜 : 2026. 10. 26. 오후 7:08



2026년 7월 19일 일요일
2026. 7. 19. 오후 5:03: 가나다님이 라마바님을 초대했습니다.
2026. 7. 19. 오후 5:03, 가나다 : 선수입장
2026. 7. 19. 오후 5:26, 라마바 : 여러 줄
두 번째 줄

세 번째 줄
2026. 7. 19. 오전 12:05, 가나다 : 사진
2026. 7. 19. 오후 12:30, 가나다 : 이모티콘
`;

const MOBILE_KOREAN = `가나다 님과 카카오톡 대화
저장한 날짜 : 2026년 10월 26일 오후 7:08

2026년 7월 19일 일요일
2026년 7월 19일 오후 5:03, 가나다님이 라마바님을 초대했습니다.
2026년 7월 19일 오후 5:04, 가나다 : 안녕
2026년 7월 19일 오후 5:05, 라마바 : 반가워
`;

const PC = `가나다 님과 카카오톡 대화
저장한 날짜 : 2026-10-26 19:08:00

--------------- 2026년 7월 19일 일요일 ---------------
가나다님이 라마바님을 초대했습니다.
[가나다] [오후 5:03] 안녕
[라마바] [오전 9:01] 아침
이어지는 줄
`;

const ENGLISH = `Talk_2026.10.26 19:08-1.txt
Date Saved : Oct 26, 2026 at 7:08 PM

Sunday, July 19, 2026
Jul 19, 2026 at 5:03 PM, Gana : hello
Jul 19, 2026 at 12:10 AM, Rama : late night
`;

const CSV = `Date,User,Message
2026-07-19 17:03:00,"가나다","안녕, 반가워"
2026-07-19 17:04:00,"라마바","줄
바꿈"
`;

describe("parseKakaoText", () => {
  it("모바일 점 형식: 시스템 메시지, 여러 줄, 오전 12시, 미디어", () => {
    const r = parseKakaoText(MOBILE_DOT);
    expect(r.format).toBe("mobile-dot");
    expect(r.system).toHaveLength(1);
    expect(r.messages).toHaveLength(4);
    expect(r.messages[1].text).toBe("여러 줄\n두 번째 줄\n\n세 번째 줄");
    expect(new Date(r.messages[0].ts).getUTCHours()).toBe(17);
    expect(new Date(r.messages[2].ts).getUTCHours()).toBe(0);
    expect(new Date(r.messages[3].ts).getUTCHours()).toBe(12);
    expect(r.messages[2].kind).toBe("photo");
    expect(r.messages[3].kind).toBe("emoticon");
    expect(r.unparsedLines).toBe(0);
  });

  it("모바일 한글 날짜 형식", () => {
    const r = parseKakaoText(MOBILE_KOREAN);
    expect(r.format).toBe("mobile-korean");
    expect(r.title).toBe("가나다");
    expect(r.system).toHaveLength(1);
    expect(r.messages.map((m) => m.author)).toEqual(["가나다", "라마바"]);
  });

  it("PC 대괄호 형식", () => {
    const r = parseKakaoText(PC);
    expect(r.format).toBe("pc-bracket");
    expect(r.system).toHaveLength(1);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[1].text).toBe("아침\n이어지는 줄");
    expect(new Date(r.messages[1].ts).getUTCHours()).toBe(9);
  });

  it("영문 형식", () => {
    const r = parseKakaoText(ENGLISH);
    expect(r.format).toBe("english");
    expect(r.messages).toHaveLength(2);
    expect(new Date(r.messages[1].ts).getUTCHours()).toBe(0);
  });

  it("CSV 형식: 쉼표와 줄바꿈이 든 셀", () => {
    const r = parseKakaoText(CSV);
    expect(r.format).toBe("csv");
    expect(r.messages[0].text).toBe("안녕, 반가워");
    expect(r.messages[1].text).toBe("줄\n바꿈");
  });
});

describe("분할 파일", () => {
  it("이름 끝 번호 순으로 정렬", () => {
    const sorted = sortSplitFiles([{ name: "Talk-10.txt" }, { name: "Talk-2.txt" }, { name: "Talk-1.txt" }]);
    expect(sorted.map((f) => f.name)).toEqual(["Talk-1.txt", "Talk-2.txt", "Talk-10.txt"]);
  });

  it("메시지 20만 개도 콜스택 에러 없이 합침 (CSV 단일 파일)", () => {
    const rows = ["Date,User,Message"];
    for (let i = 0; i < 200_000; i++) rows.push(`2025-01-01 09:00:00,"가나다","메시지 ${i}"`);
    const m = mergeParsed([parseKakaoText(rows.join("\n"))]);
    expect(m.messages).toHaveLength(200_000);
  });

  it("경계 중복을 지우고 시간순으로 합침", () => {
    const a = parseKakaoText("2026. 7. 19. 오후 5:03, 가나다 : 하나\n2026. 7. 19. 오후 5:04, 가나다 : 둘\n");
    const b = parseKakaoText("2026. 7. 19. 오후 5:04, 가나다 : 둘\n2026. 7. 19. 오후 5:05, 라마바 : 셋\n");
    const m = mergeParsed([a, b]);
    expect(m.messages.map((x) => x.text)).toEqual(["하나", "둘", "셋"]);
  });
});
