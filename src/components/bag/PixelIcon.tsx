import { ICONS, PALETTE, matchIcon, type IconKey } from "@/lib/bag/icons";

/** 10×10 픽셀 아이콘을 SVG rect로 그린다 (이미지 저장 때도 그대로 찍힌다) */
export function PixelIcon({ icon, size = 48, label }: { icon: IconKey; size?: number; label?: string }) {
  const rows = ICONS[icon];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />)),
      )}
    </svg>
  );
}

export function ItemIcon({ item, size }: { item: string; size?: number }) {
  return <PixelIcon icon={matchIcon(item)} size={size} />;
}
