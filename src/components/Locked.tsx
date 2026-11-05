import Link from "next/link";

/**
 * 잠긴 칸: 샘플 결과·무료 미리 보기에서 "여기부터는 내 대화로" 를 보여준다.
 * 실제 내용은 그리지 않고 흐린 자리만 보여준다 (내용이 새지 않게, DOM도 가볍게).
 */
export function Locked({
  title,
  hint = "우리 방이면 여기에 누가 나올까요?",
  cta = { href: "/new", label: "내 대화로 분석하기" },
  lines = 3,
  className = "",
}: {
  title: string;
  hint?: string;
  cta?: { href: string; label: string } | null;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-dusk p-5 ${className}`}>
      <div className="flex flex-col gap-2.5 blur-[3px] select-none" aria-hidden>
        <span className="h-5 w-2/5 rounded-full bg-dusk-2" />
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="h-3.5 rounded-full bg-dusk-2" style={{ width: `${92 - i * 14}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-night/55 px-5 text-center">
        <p className="text-[15px] font-bold">
          <span aria-hidden className="mr-1">🔒</span>
          {title}
        </p>
        <p className="text-[13px] text-haze">{hint}</p>
        {cta && (
          <Link href={cta.href} className="mt-1 rounded-full bg-spark px-4 py-1.5 text-[13px] font-bold text-spark-ink">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
