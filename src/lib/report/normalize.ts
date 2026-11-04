import type { Report } from "../llm/schema";

/**
 * 예전 버전 결과(꼭지·명장면·한줄평·어워드 인용이 없고 변화/스트레스/챙김 칸이 있던 모양)를
 * 지금 모양으로 맞춘다. 예전 칸은 꼭지로 옮겨서 정보가 사라지지 않게 한다.
 */
type LegacyMember = Partial<Report["members"][number]> & { change?: string; stress?: string; care?: string };

/** 화면에서 따옴표를 씌우므로 AI가 붙인 겉 따옴표(" ' “ ‘ 「)는 벗긴다 */
export function unquote(text: string): string {
  let t = text.trim();
  for (;;) {
    const m = t.match(/^(["'“”‘’「『])([\s\S]*)["'“”‘’」』]$/);
    // '흠' 장인 '흠'처럼 안에 같은 따옴표가 또 있으면 겉 따옴표가 아니다
    if (!m || m[2].includes(m[1])) return t;
    t = m[2].trim();
  }
}

export function normalizeReport(report: Report): Report {
  return {
    ...report,
    members: report.members.map((raw) => {
      const base = raw as LegacyMember & Report["members"][number];
      const m = { ...base, archetype: unquote(base.archetype), oneLiner: unquote(base.oneLiner ?? "") };
      if (Array.isArray(m.sections) && Array.isArray(m.scenes)) return m;
      const legacy: [string, string | undefined][] = [
        ["변화", m.change],
        ["유머", m.humor],
        ["스트레스 받을 때", m.stress],
        ["챙기는 방식", m.care],
      ];
      return {
        ...m,
        scenes: m.scenes ?? [],
        sections: m.sections ?? legacy.filter(([, t]) => t).map(([title, text]) => ({ title, text: text!, quotes: [] })),
      };
    }),
    awards: report.awards.map((a) => ({ ...a, quotes: a.quotes ?? [] })),
  };
}
