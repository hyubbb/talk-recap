import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSharedReport } from "@/lib/share/repo";

export const alt = "Talk Recap 결과 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// globals.css @theme 토큰과 같은 값 (next/og는 CSS 변수를 읽지 못한다)
const NIGHT = "#17142e";
const MOON = "#f3efff";
const HAZE = "#a9a3c9";
const SPARK = "#ffc53d";

const fontPath = (f: string) => join(process.cwd(), "node_modules/pretendard/dist/public/static", f);

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

/** 카톡 링크 미리보기. 방 제목·기간·메시지 수·멤버 색 점만 쓰고 인용 문장은 넣지 않는다. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bold, regular, shared] = await Promise.all([
    readFile(fontPath("Pretendard-ExtraBold.otf")),
    readFile(fontPath("Pretendard-Regular.otf")),
    getSharedReport(id),
  ]);

  const title = shared?.saved.report.title ?? "Talk Recap";
  const stats = shared?.saved.stats;
  const colors = (shared?.saved.members ?? []).slice(0, 12).map((m) => m.color);
  const sub = stats
    ? `${fmt(stats.start)} ~ ${fmt(stats.end)} · 메시지 ${stats.totalMessages.toLocaleString("ko-KR")}개`
    : "만료됐거나 삭제된 링크예요";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NIGHT,
          color: MOON,
          padding: "72px 80px",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: SPARK, fontWeight: 800 }}>Talk Recap</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 18 ? 64 : 80,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            {title.length > 40 ? `${title.slice(0, 39)}…` : title}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: HAZE }}>{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {colors.map((c, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: 22, background: c }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 800, style: "normal" },
        { name: "Pretendard", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
