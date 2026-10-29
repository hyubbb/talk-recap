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
      <ul className="flex flex-col gap-3">
        {LINES.map((l, i) => (
          <li key={i} className="bubble-in" style={{ animationDelay: `${i * 220}ms` }}>
            {/* 이름은 아바타 폭만큼 들여서 말풍선과 같은 선에 맞추고, 아바타는 말풍선 세로 가운데에 둔다 */}
            <span className="mb-1 block pl-9 text-[12px] text-haze">{l.who}</span>
            <div className="flex items-center gap-2">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-night"
                style={{ background: memberColor(l.color) }}
                aria-hidden
              >
                {l.who.slice(0, 1)}
              </span>
              <span className="inline-block rounded-[var(--radius-bubble)] rounded-tl-[6px] bg-dusk-2 px-3.5 py-2 text-[15px]">
                {l.text}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
