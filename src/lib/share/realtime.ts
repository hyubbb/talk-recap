import "server-only";

import type { ObjectionEvent } from "@/lib/objection/rules";

/**
 * Realtime Broadcast REST로 report:{id} 채널에 바뀐 반박·집계를 보낸다.
 * 대화 원문은 보내지 않는다(반박 문장과 표 수만). 채널 이름은 추측 불가능한 공유 슬러그다.
 */
export async function notifyReport(reportId: string, payload: ObjectionEvent): Promise<void> {
  const event = "objections";
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ topic: `report:${reportId}`, event, payload, private: false }] }),
    });
    if (!res.ok) console.error(`[realtime] broadcast failed: ${res.status}`);
  } catch {
    console.error("[realtime] broadcast failed");
  }
}
