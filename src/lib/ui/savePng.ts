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
  opts: {
    width: number;
    height: number;
    fileName: string;
    filter?: (n: HTMLElement) => boolean;
    /** true면 저장 이미지 맨 아래에 로고 띠를 붙인다 (화면의 카드에는 로고 없음, 내용과 겹치지 않음) */
    footer?: boolean;
  },
): Promise<"shared" | "downloaded"> {
  const rect = node.getBoundingClientRect();
  // 목표 크기를 정확히 맞춘다 (반올림으로 1919px이 되지 않게)
  const pixelRatio = opts.width / rect.width;
  fontCss ??= getFontEmbedCSS(node).catch(() => "");
  const target = opts.footer ? withFooter(node, rect.width, rect.width * (opts.height / opts.width)) : null;
  let blob: Blob | null;
  try {
    blob = await toBlob(target ?? node, {
      pixelRatio,
      canvasWidth: opts.width / pixelRatio,
      canvasHeight: opts.height / pixelRatio,
      cacheBust: false,
      fontEmbedCSS: await fontCss,
      // 합성 노드는 화면 밖(left:-100000px)에 붙어 있으니 캡처본에서는 제자리로 돌린다
      style: target ? { position: "static", left: "0", top: "0" } : undefined,
      filter: (n) => !(n instanceof HTMLElement && n.dataset.noCapture !== undefined) && (opts.filter?.(n as HTMLElement) ?? true),
    });
  } finally {
    target?.remove();
  }
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

/**
 * 저장용 합성 노드: 카드 복제본(위) + 로고 띠(아래)를 같은 비율 안에 세로로 쌓는다.
 * 화면 밖에 잠깐 붙였다가 캡처 후 지운다. 카드 복제본은 띠 높이만큼 줄어든다.
 */
function withFooter(node: HTMLElement, width: number, height: number): HTMLElement {
  const cs = getComputedStyle(node);
  const footerH = Math.round(height * 0.075);

  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: cs.borderRadius,
    background: cs.backgroundColor,
  } satisfies Partial<CSSStyleDeclaration>);

  const card = node.cloneNode(true) as HTMLElement;
  Object.assign(card.style, {
    aspectRatio: "auto",
    width: "100%",
    height: `${height - footerH}px`,
    flex: "0 0 auto",
    borderRadius: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  card.querySelectorAll("[data-watermark]").forEach((el) => el.remove());

  const footer = document.createElement("div");
  Object.assign(footer.style, {
    height: `${footerH}px`,
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 6%",
    background: "var(--color-night)",
    color: "var(--color-moon)",
  } satisfies Partial<CSSStyleDeclaration>);
  const logo = document.createElement("span");
  logo.textContent = "톡방 Wrapped";
  Object.assign(logo.style, { fontFamily: "var(--font-pixel)", fontSize: `${Math.round(footerH * 0.36)}px` });
  const dot = document.createElement("span");
  dot.textContent = "우리 방도 분석해 보기";
  Object.assign(dot.style, {
    fontFamily: "var(--font-sans)",
    fontSize: `${Math.round(footerH * 0.26)}px`,
    color: "var(--color-haze)",
  });
  footer.append(logo, dot);

  wrap.append(card, footer);
  document.body.appendChild(wrap);
  return wrap;
}
