import { memberColor } from "@/lib/ui/colors";

// 랜딩 데모용 가상의 단톡방 (실제 사람 아님)
const LINES: { who: string; color: number; text: string }[] = [
  { who: "도토리", color: 0, text: "흠" },
  { who: "고등어", color: 3, text: "또 흠이야? ㅋㅋㅋ" },
  { who: "도토리", color: 0, text: "흠;;" },
  { who: "감자", color: 2, text: "이번 주 금요일 다들 되나요" },
];

export function HeroChat() {
  return (
    <div className="mt-8 rounded-[24px] bg-dusk p-4" aria-label="분석 예시">
      <ul className="flex flex-col gap-2">
        {LINES.map((l, i) => (
          <li
            key={i}
            className="bubble-in flex items-end gap-2"
            style={{ animationDelay: `${i * 220}ms` }}
          >
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-night"
              style={{ background: memberColor(l.color) }}
              aria-hidden
            >
              {l.who.slice(0, 1)}
            </span>
            <div>
              <span className="mb-1 block text-[12px] text-haze">{l.who}</span>
              <span className="inline-block rounded-[var(--radius-bubble)] rounded-tl-[6px] bg-dusk-2 px-3.5 py-2 text-[15px]">
                {l.text}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div
        className="bubble-in mt-4 rounded-[18px] p-4 text-night"
        style={{ background: memberColor(0), animationDelay: `${LINES.length * 220 + 200}ms` }}
      >
        <p className="font-pixel text-[13px]">말버릇 왕</p>
        <p className="tabular mt-1 text-[44px] leading-none font-black tracking-[-0.04em]">1,175번</p>
        <p className="mt-2 text-[14px] font-medium">도토리가 100일 동안 &lsquo;흠&rsquo;을 보낸 횟수</p>
      </div>
    </div>
  );
}
