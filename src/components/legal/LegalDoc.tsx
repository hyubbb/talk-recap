import Link from "next/link";
import type { ReactNode } from "react";

/** 약관·방침 공통 틀. 본문 폭 560px, 조항마다 앵커 */
export function LegalDoc({ title, effective, children }: { title: string; effective: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="font-pixel text-[15px]">
          Talk Recap
        </Link>
      </header>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-[13px] text-haze">시행일 {effective}</p>
      <div className="mt-8 flex flex-col gap-8 text-[14px] leading-[1.75] text-moon/90">{children}</div>
    </main>
  );
}

export function Article({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-2 text-[17px] font-bold text-moon">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-[14px] bg-dusk">
      <table className="w-full min-w-[480px] border-collapse text-left text-[13px] leading-[1.6]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-dusk-2 px-3 py-2 font-semibold text-haze">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className="border-b border-dusk-2 px-3 py-2 last:border-b-0">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}
