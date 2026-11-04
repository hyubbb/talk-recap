import type { FunFact } from "@/lib/kakao/fun";

/** "숫자로 본 우리 방": 기록마다 이름표·큰 숫자·주인공·설명이 있는 타일 */
export function FunFacts({ facts, nameOf, colorOf }: { facts: FunFact[]; nameOf: (id: string) => string; colorOf: (id: string) => string }) {
  // 이름이 둘인 랠리, 글자가 긴 유행어는 한 줄을 다 쓴다.
  // 반 칸 타일이 줄에 혼자 남으면(다음이 넓은 타일이거나 마지막) 그것도 한 줄로 늘린다.
  const alwaysWide = (f: FunFact) => f.key === "rally" || f.key === "origin";
  const wideAt: boolean[] = [];
  let col = 0;
  for (let i = 0; i < facts.length; i++) {
    const next = facts[i + 1];
    const wide = alwaysWide(facts[i]) || (col === 0 && (!next || alwaysWide(next)));
    wideAt.push(wide);
    col = wide ? 0 : (col + 1) % 2;
  }
  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5">
        {facts.map((f, i) => {
          const wide = wideAt[i];
          return (
            <li key={f.key} className={`flex flex-col rounded-[16px] bg-dusk p-4 ${wide ? "col-span-2" : ""}`}>
              <p className="font-pixel text-[12px] text-spark">{f.label}</p>
              <p className="tabular mt-2 truncate text-[30px] leading-[1.1] font-black tracking-[-0.03em]">{f.value}</p>
              {f.who.length > 0 && (
                <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-bold">
                  {f.who.map((id, k) => (
                    <span key={id} className="flex min-w-0 items-center gap-1.5">
                      {k > 0 && <span className="font-normal text-haze">↔</span>}
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
                      <span className="truncate">{nameOf(id)}</span>
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-1 text-[13px] leading-[1.45] text-haze">{f.caption}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] text-haze">AI가 아니라 대화에서 직접 센 숫자예요</p>
    </>
  );
}
