"use client";

import { useRef, useState } from "react";

export function Dropzone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => /\.(zip|txt|csv)$/i.test(f.name));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={`rounded-[24px] border-2 border-dashed p-6 transition ${
        over ? "border-spark bg-dusk-2" : "border-dusk-2 bg-dusk"
      }`}
    >
      <p className="text-[17px] font-bold">대화 파일을 여기에 놓아 주세요</p>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-haze">
        카카오톡에서 내보낸 zip, txt, csv 파일. 여러 개로 나뉜 파일은 한꺼번에 올리면 순서대로 이어 붙여요.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-5 h-12 w-full rounded-[14px] bg-spark text-[16px] font-bold text-spark-ink disabled:opacity-50"
      >
        {busy ? "읽는 중…" : "파일 고르기"}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".zip,.txt,.csv"
        className="hidden"
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
