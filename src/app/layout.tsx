import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk Recap",
  description: "카카오톡 단톡방을 올리면 멤버 분석, 관계, MBTI 추론, What's in my bag까지 한 번에.",
};

export const viewport: Viewport = {
  themeColor: "#17142e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-dvh flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
