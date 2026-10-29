import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // 카톡 미리보기 이미지(next/og)에서 런타임에 읽는 한글 폰트
  outputFileTracingIncludes: {
    "/s/[id]/opengraph-image": ["./node_modules/pretendard/dist/public/static/Pretendard-{ExtraBold,Regular}.otf"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
