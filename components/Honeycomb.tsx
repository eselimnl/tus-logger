"use client";

import { useId, useMemo, useState } from "react";
import type { Cell } from "@/lib/honeycomb";

type Props = {
  cells: Cell[];
  colors: Record<string, string>;
  /** konu id → 0..1. 1 = tam yanar (ışıltılı), arası = kısmi parlaklık, 0 = sönük. */
  levels: Record<number, number>;
  names: Record<number, string>;
  captions: Record<number, string>;
  label: string;
};

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return `${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`;
  }).join(" ");
}

export default function Honeycomb({ cells, colors, levels, names, captions, label }: Props) {
  const uid = useId().replace(/:/g, "");
  const [sel, setSel] = useState<number | null>(null);

  const { viewBox, dersler } = useMemo(() => {
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const pad = 1.2;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) + pad - minX;
    const h = Math.max(...ys) + pad - minY;
    const order = [...new Set(cells.map((c) => c.ders))];
    return { viewBox: `${minX} ${minY} ${w} ${h}`, dersler: order };
  }, [cells]);

  const level = (c: Cell) => levels[c.topicId] ?? 0;
  const lit = cells.filter((c) => level(c) >= 1);
  const selected = sel === null ? null : cells[sel];

  return (
    <figure className="rounded-3xl bg-[#0b1210] p-4 text-[#d3dfd9]">
      <svg viewBox={viewBox} role="img" aria-label={label} className="mx-auto block w-full">
        <defs>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.55" />
          </filter>
        </defs>

        {/* parlama katmanı: yanan hücrelerin bulanık kopyası */}
        <g filter={`url(#${uid}-glow)`} opacity="0.85" aria-hidden="true">
          {lit.map((c, i) => (
            <polygon key={i} points={hexPoints(c.x, c.y, 0.95)} fill={colors[c.ders]} />
          ))}
        </g>

        {cells.map((c, i) => {
          const l = level(c);
          const color = colors[c.ders];
          const on = l >= 1;
          return (
            <polygon
              key={i}
              points={hexPoints(c.x, c.y, 0.9)}
              fill={color}
              fillOpacity={on ? 1 : l > 0 ? 0.16 + 0.6 * l : 0.13}
              stroke={sel === i ? "#ffffff" : color}
              strokeOpacity={sel === i ? 1 : on ? 0.9 : 0.35}
              strokeWidth={sel === i ? 0.14 : 0.06}
              onClick={() => setSel(sel === i ? null : i)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
      </svg>

      <p className="mt-3 min-h-10 text-center text-sm" aria-live="polite">
        {selected ? (
          <>
            <span className="text-[#9db0a7]">{selected.ders}</span>
            <br />
            <span className="font-medium text-white">{names[selected.topicId]}</span>
            <span className="text-[#9db0a7]"> · {captions[selected.topicId]}</span>
          </>
        ) : (
          <span className="text-[#7d8f86]">Bir hücreye dokun: hangi konunun sorusu olduğunu gösterir.</span>
        )}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {dersler.map((d) => {
          const own = cells.filter((c) => c.ders === d);
          const n = own.filter((c) => level(c) >= 1).length;
          return (
            <li key={d} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[d] }} />
              <span className="min-w-0 flex-1 truncate">{d}</span>
              <span className="tabular-nums text-[#9db0a7]">
                {n}/{own.length}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
