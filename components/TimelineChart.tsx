"use client";

import { useMemo, useState } from "react";
import { addDays } from "@/lib/dates";
import {
  fmtDate,
  fmtShort,
  HORIZON,
  summarize,
  type LineKey,
  type PlanSettings,
  type Work,
} from "@/lib/plan";

type Props = {
  work: Work;
  settings: PlanSettings;
  today: string;
  examDays: number;
  /** Son 14 günün gerçek günlük ortalaması; veri yoksa null. */
  actualPerDay: number | null;
};

const LINES: { key: LineKey; label: string; color: string; width: number }[] = [
  { key: "konu", label: "Konu", color: "var(--accent)", width: 2 },
  { key: "soru", label: "Soru", color: "var(--soru)", width: 2 },
  { key: "birlesik", label: "Konu + Soru", color: "var(--foreground)", width: 2.5 },
];

const W = 360;
const H = 240;
const PAD = { l: 34, r: 12, t: 14, b: 30 };

export default function TimelineChart({ work, settings, today, examDays, actualPerDay }: Props) {
  const [mode, setMode] = useState<"hedef" | "gercek">("hedef");
  const [weighted, setWeighted] = useState(true);
  const canWeight = !!work.w;
  const useActual = mode === "gercek" && actualPerDay !== null;
  const perDay = useActual ? actualPerDay : undefined;
  const sum = useMemo(
    () => summarize(work, settings, { examDays, perDay, weighted }),
    [work, settings, examDays, perDay, weighted],
  );

  const finishes = LINES.map((l) => sum.finishDays[l.key]).filter((v): v is number => v !== null);
  const xmax = Math.min(HORIZON, Math.max(28, examDays, ...finishes) + 7);
  const weeks = Math.ceil(xmax / 7);
  const labelEvery = weeks <= 14 ? 1 : weeks <= 28 ? 2 : weeks <= 56 ? 4 : 8;

  const x = (d: number) => PAD.l + (d / xmax) * (W - PAD.l - PAD.r);
  const y = (p: number) => PAD.t + (1 - p / 100) * (H - PAD.t - PAD.b);

  const valueAt = (key: LineKey, i: number) => sum.curve[key][i];

  const paths = LINES.map((l) => {
    const pts: string[] = [];
    for (let i = 0; i <= Math.min(xmax, HORIZON); i++) {
      pts.push(`${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(valueAt(l.key, i)).toFixed(1)}`);
    }
    return { ...l, d: pts.join(" ") };
  });

  const examX = x(Math.min(examDays, xmax));
  const examVisible = examDays >= 0 && examDays <= xmax;

  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-line p-0.5 text-xs">
          <button
            onClick={() => setMode("hedef")}
            className={`rounded-full px-3 py-1 ${mode === "hedef" ? "bg-accent-soft text-accent" : "text-muted"}`}
          >
            Hedef tempo
          </button>
          <button
            onClick={() => actualPerDay !== null && setMode("gercek")}
            disabled={actualPerDay === null}
            className={`rounded-full px-3 py-1 disabled:opacity-40 ${
              mode === "gercek" ? "bg-accent-soft text-accent" : "text-muted"
            }`}
            title={actualPerDay === null ? "Son 14 günde kayıt yok" : undefined}
          >
            Gerçek tempo
          </button>
        </div>
        <span className="text-xs text-muted">
          günde {sum.perDay.toFixed(1).replace(".", ",")} birim
        </span>
      </div>
      {canWeight && (
        <label className="mb-2 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={weighted}
            onChange={(e) => setWeighted(e.target.checked)}
          />
          Sınav ağırlıklı (çok soru çıkan konu daha değerli)
        </label>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Haftalara göre hazırlık yüzdesi projeksiyonu">
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(p)} y2={y(p)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.l - 5} y={y(p) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
              {p}
            </text>
          </g>
        ))}
        {Array.from({ length: weeks + 1 }, (_, w) => {
          const d = w * 7;
          if (d > xmax) return null;
          const labeled = w % labelEvery === 0;
          return (
            <g key={w}>
              <line
                x1={x(d)}
                x2={x(d)}
                y1={H - PAD.b}
                y2={H - PAD.b + (labeled ? 4 : 2)}
                stroke="var(--muted)"
                strokeWidth={1}
              />
              {labeled && (
                <text x={x(d)} y={H - PAD.b + 14} textAnchor="middle" fontSize={8.5} fill="var(--muted)">
                  {fmtShort(addDays(today, d))}
                </text>
              )}
            </g>
          );
        })}
        <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={8.5} fill="var(--muted)">
          hafta hafta (gün/ay)
        </text>

        {examVisible && (
          <g>
            <line x1={examX} x2={examX} y1={PAD.t} y2={H - PAD.b} stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={examX - 3} y={PAD.t + 9} textAnchor="end" fontSize={9} fill="var(--warn)" fontWeight={600}>
              Sınav
            </text>
          </g>
        )}
        <line x1={x(0)} x2={x(0)} y1={PAD.t} y2={H - PAD.b} stroke="var(--muted)" strokeWidth={1} />

        {/* Üç hat çoğu zaman üst üste biner: ortada birleşik, üstünde konu (düz), altında soru (kesikli). */}
        {[paths[2], paths[0], paths[1]].map((l) => (
          <path
            key={l.key}
            d={l.d}
            // Hatlar çoğu zaman birebir örtüştüğü için konu/soru birkaç piksel ayrı çizilir.
            transform={l.key === "konu" ? "translate(0,-2.5)" : l.key === "soru" ? "translate(0,2.5)" : undefined}
            fill="none"
            stroke={l.color}
            strokeWidth={l.key === "birlesik" ? 3 : 2}
            strokeOpacity={1}
            strokeLinejoin="round"
            strokeLinecap={l.key === "soru" ? "butt" : "round"}
            strokeDasharray={l.key === "soru" ? "6 5" : undefined}
          />
        ))}
        {LINES.map((l) => {
          const f = sum.finishDays[l.key];
          if (f === null || f > xmax) return null;
          return <circle key={l.key} cx={x(f)} cy={y(100)} r={3.5} fill={l.color} stroke="var(--card)" strokeWidth={1.5} />;
        })}
        {examVisible &&
          LINES.map((l) => (
            <circle key={l.key} cx={examX} cy={y(sum.atExam[l.key])} r={2.5} fill="var(--card)" stroke={l.color} strokeWidth={1.5} />
          ))}
      </svg>

      <ul className="mt-2 divide-y divide-line text-xs">
        {LINES.map((l) => {
          const f = sum.finishDays[l.key];
          const delta = f === null ? null : examDays - f;
          return (
            <li key={l.key} className="flex items-start justify-between gap-3 py-2">
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="w-4 rounded"
                  style={{
                    height: l.key === "birlesik" ? 3 : 2,
                    background: l.key === "soru" ? `repeating-linear-gradient(90deg, ${l.color} 0 4px, transparent 4px 7px)` : l.color,
                    
                  }}
                />
                {l.label}
              </span>
              <span className="text-right text-muted">
                <span className="text-foreground">şimdi %{Math.round(sum.pct[l.key])}</span> · sınavda{" "}
                <span className="text-foreground">%{Math.round(sum.atExam[l.key])}</span>
                <br />
                {f === null
                  ? "3 yıl içinde bitmiyor"
                  : f === 0
                    ? "tamamlandı"
                    : `biter: ${fmtDate(addDays(today, f))}${
                        delta !== null ? (delta >= 0 ? ` (sınavdan ${delta} gün önce)` : ` (sınavdan ${-delta} gün sonra)`) : ""
                      }`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
