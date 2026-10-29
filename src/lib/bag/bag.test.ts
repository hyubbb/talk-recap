import { describe, expect, it } from "vitest";
import { ICONS, KEYWORDS, matchIcon, PALETTE } from "./icons";

describe("픽셀 아이콘", () => {
  it("30개 이상, 전부 10×10, 팔레트 글자만", () => {
    const keys = Object.keys(ICONS);
    expect(keys.length).toBeGreaterThanOrEqual(30);
    for (const k of keys) {
      const rows = ICONS[k as keyof typeof ICONS];
      expect(rows, k).toHaveLength(10);
      for (const r of rows) {
        expect(r.length, `${k}: ${r}`).toBe(10);
        for (const ch of r) expect(ch === "." || ch in PALETTE, `${k}: ${ch}`).toBe(true);
      }
    }
  });

  it("키워드 테이블의 아이콘이 모두 존재", () => {
    for (const [icon] of KEYWORDS) expect(icon in ICONS).toBe(true);
  });
});

describe("matchIcon", () => {
  it.each([
    ["컵라면", "noodle"],
    ["신라면 컵", "noodle"],
    ["무선 이어폰", "earphones"],
    ["에어팟 케이스", "earphones"],
    ["헤드폰", "headphones"],
    ["휴대폰", "phone"],
    ["보조배터리", "battery"],
    ["충전기", "charger"],
    ["노트북", "laptop"],
    ["카드지갑", "wallet"],
    ["교통카드", "card"],
    ["접이식 우산", "umbrella"],
    ["러닝 운동화", "sneakers"],
    ["아이스 아메리카노", "coffee"],
    ["에너지 음료", "drink"],
    ["읽다 만 소설책", "book"],
    ["다이어리", "notebook"],
    ["선글라스", "sunglasses"],
    ["립밤", "lipstick"],
    ["물티슈", "tissue"],
    ["강아지 간식", "pet"],
    ["닌텐도 스위치", "game"],
    ["정체불명의 영수증", "ticket"],
    ["알 수 없는 물건", "box"],
    ["", "box"],
  ])("%s → %s", (item, icon) => {
    expect(matchIcon(item)).toBe(icon);
  });
});
