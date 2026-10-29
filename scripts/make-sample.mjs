// 지어낸 단톡방 샘플을 만든다. 실제 사람·대화와 무관하다.
// 사용: node scripts/make-sample.mjs > fixtures/sample-kakao.txt
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (a) => a[Math.floor(rand() * a.length)];

const members = [
  { name: "도토리 김", w: 0.34, night: 0.35, lines: ["흠", "흠;;", "아니 근데", "ㅋㅋㅋㅋ 미쳤다", "오늘 회사 왜이럼", "퇴근하고 싶다", "이거 봄?", "사진", "이모티콘"] },
  { name: "고등어 박", w: 0.28, night: 0.15, lines: ["ㅋㅋㅋㅋㅋㅋㅋㅋ", "도토리 또 흠이야?", "점심 뭐 먹지", "아 진짜?", "개웃기네", "이모티콘", "집에 가고 싶다"] },
  { name: "감자", w: 0.24, night: 0.05, lines: ["이번 주 금요일 다들 되나요", "회식 장소 정함", "정산할게요", "고생추", "다들 뭐함??", "등산 갈 사람"] },
  { name: "고구마 최", w: 0.14, night: 0.02, lines: ["네", "넵", "저 언급한 것만 보고 있어요", "그냥 씹을게요", "줘팰까요"] },
];

const pad = (n) => String(n).padStart(2, "0");
const ampm = (h) => (h < 12 ? "오전" : "오후");
const h12 = (h) => (h % 12 === 0 ? 12 : h % 12);

const out = ["Talk_2026.10.26 19:08-1.txt", "저장한 날짜 : 2026. 10. 26. 오후 7:08", "", "", ""];
out.push("2026. 7. 19. 오후 5:03: 도토리 김님이 고구마 최님을 초대했습니다.");
const start = Date.UTC(2026, 6, 19);
for (let day = 0; day < 100; day++) {
  const n = 10 + Math.floor(rand() * 40);
  const times = [];
  for (let i = 0; i < n; i++) {
    let r = rand();
    const m = members.find((x) => (r -= x.w) < 0) ?? members[0];
    const night = rand() < m.night;
    const hour = night ? 22 + Math.floor(rand() * 5) : 9 + Math.floor(rand() * 13);
    times.push({ m, t: hour * 60 + Math.floor(rand() * 60) });
  }
  times.sort((a, b) => a.t - b.t);
  for (const { m, t } of times) {
    const d = new Date(start + day * 86400000 + (t % 1440) * 60000);
    const h = d.getUTCHours();
    out.push(
      `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}. ${ampm(h)} ${h12(h)}:${pad(d.getUTCMinutes())}, ${m.name} : ${pick(m.lines)}`,
    );
  }
}
console.log(out.join("\n"));
