"use client";

import { getFontEmbedCSS, toBlob } from "html-to-image";

let fontCss: Promise<string> | null = null;

/**
 * DOM 노드를 PNG로 저장한다 (html-to-image, 클라이언트 렌더).
 * 노드는 CSS 크기(width×height)로 그려져 있고, pixelRatio로 목표 해상도를 맞춘다.
 * Pretendard·Galmuri @font-face를 한 번 읽어 임베드해서 한글이 깨지지 않게 한다.
 * 모바일(공유 시트 지원)이면 공유 시트, 아니면 다운로드.
 */
export async function saveNodeAsPng(
  node: HTMLElement,
  opts: { width: number; height: number; fileName: string; filter?: (n: HTMLElement) => boolean },
): Promise<"shared" | "downloaded"> {
  const rect = node.getBoundingClientRect();
  // 목표 크기를 정확히 맞춘다 (반올림으로 1919px이 되지 않게)
  const pixelRatio = opts.width / rect.width;
  fontCss ??= getFontEmbedCSS(node).catch(() => "");
  const blob = await toBlob(node, {
    pixelRatio,
    canvasWidth: opts.width / pixelRatio,
    canvasHeight: opts.height / pixelRatio,
    cacheBust: false,
    fontEmbedCSS: await fontCss,
    filter: (n) => !(n instanceof HTMLElement && n.dataset.noCapture !== undefined) && (opts.filter?.(n as HTMLElement) ?? true),
  });
  if (!blob) throw new Error("이미지를 만들지 못했어요.");
  const file = new File([blob], opts.fileName, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], title: "톡방 Wrapped" });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
      // 사용자 제스처가 만료된 경우 등: 다운로드로 대체
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
