"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "@/lib/dates";
import { saveSettings } from "@/lib/mutations";
import {
  buildAdvice,
  computeWork,
  durationLabel,
  fmtDate,
  LIMITS,
  summarize,
  type PlanSettings,
} from "@/lib/plan";
import { createClient } from "@/lib/supabase/client";
import type { Progress } from "@/lib/types";
import TimelineChart from "./TimelineChart";

type Props = {
  today: string;
  examDays: number;
  topicCount: number;
  weights: Record<number, number>;
  progress: Progress[];
  saved: PlanSettings;
  actualPerDay: number | null;
};

export default function PlanEditor({ today, examDays, topicCount, weights, progress, saved, actualPerDay }: Props) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [s, setS] = useState(saved);
  const [base, setBase] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(s) !== JSON.stringify(base);
  const work = useMemo(() => computeWork(topicCount, progress, s, weights), [topicCount, progress, s, weights]);
  const sum = useMemo(() => summarize(work, s, { examDays }), [work, s, examDays]);
  const actual = useMemo(
    () => (actualPerDay === null ? null : summarize(work, s, { examDays, perDay: actualPerDay })),
    [work, s, examDays, actualPerDay],
  );
  const advice = useMemo(
    () => buildAdvice(sum, s, today, topicCount, actual, actualPerDay),
    [sum, s, today, topicCount, actual, actualPerDay],
  );
  const set = (p: Partial<PlanSettings>) => setS((x) => ({ ...x, ...p }));

  // Elle soru payı seçiliyken günlük konu/soru dağılımı
  const share = s.soru_share ?? sum.autoSoruShare;
  const soruPerDay = ((sum.perDay * share) / 100).toFixed(1).replace(".", ",");
  const konuPerDay = ((sum.perDay * (100 - share)) / 100).toFixed(1).replace(".", ",");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveSettings(sb, s);
      setBase(s);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  const F = sum.finishDays.birlesik;

  return (
    <main className="flex-1 px-4 pb-24 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
      <p className="mt-1 text-sm text-muted">
        Her konu için kaç adım yapacağını ve günlük hedefini sen belirle. Grafik anında güncellenir.
      </p>

      <section className="mt-4 space-y-2">
        <Stepper
          label="Tekrar sayısı"
          hint="ilk çalışmadan sonra"
          value={s.tekrar_count}
          range={LIMITS.tekrar}
          onChange={(v) => set({ tekrar_count: v })}
        />
        <Stepper
          label="Soru turu"
          hint="konu başına"
          value={s.soru_count}
          range={LIMITS.soru}
          onChange={(v) => set({ soru_count: v })}
        />
        <Stepper
          label="Günlük hedef"
          hint="birim (çalışma, tekrar veya soru)"
          value={s.daily_goal}
          range={LIMITS.goal}
          onChange={(v) => set({ daily_goal: v })}
        />
        <Stepper
          label="Haftada çalışılan gün"
          hint="nöbet, izin vb. için"
          value={s.days_per_week}
          range={LIMITS.days}
          onChange={(v) => set({ days_per_week: v })}
        />
      </section>

      <section className="mt-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Soru payı</p>
            <p className="text-xs text-muted">Günlük hedefin ne kadarı soru çözümüne gitsin</p>
          </div>
          <button
            onClick={() => set({ soru_share: s.soru_share === null ? sum.autoSoruShare : null })}
            className={`rounded-full border px-3 py-1 text-xs ${
              s.soru_share === null ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
            }`}
          >
            Otomatik
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={share}
          disabled={s.soru_share === null || s.soru_count === 0}
          onChange={(e) => set({ soru_share: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--soru)] disabled:opacity-50"
          aria-label="Soru payı yüzdesi"
        />
        <p className="text-xs text-muted">
          %{share} soru · günde ≈ {konuPerDay} konu birimi + {soruPerDay} soru birimi
        </p>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Toplam" value={`${sum.total}`} sub="birim" />
        <Mini label="Yapılan" value={`${sum.done}`} sub={`%${Math.round(sum.pct.birlesik)}`} />
        <Mini label="Kalan" value={`${sum.remaining}`} sub="birim" />
      </section>

      <section className="mt-3 rounded-2xl border border-line bg-card p-4">
        <p className="text-xs text-muted">Bu planla</p>
        <p className="mt-1 text-lg font-semibold">
          {F === null ? "3 yıl içinde bitmiyor" : F === 0 ? "Tamamlandı" : fmtDate(addDays(today, F))}
        </p>
        {F !== null && F > 0 && <p className="text-xs text-muted">{durationLabel(F)}</p>}
        <p className="mt-2 text-sm">
          Sınav gününe hazırlık (sınav ağırlıklı): <b className="text-accent">%{Math.round(sum.atExam.birlesik)}</b>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sum.neededGoal > s.daily_goal && sum.neededGoal <= LIMITS.goal[1] && (
            <button
              onClick={() => set({ daily_goal: sum.neededGoal, days_per_week: s.days_per_week })}
              className="rounded-full border border-accent px-3 py-1.5 text-xs text-accent"
            >
              Sınava yetişecek hedefi uygula (günde {sum.neededGoal})
            </button>
          )}
          {sum.neededGoalBuffer !== s.daily_goal && sum.neededGoalBuffer <= LIMITS.goal[1] && sum.remaining > 0 && (
            <button
              onClick={() => set({ daily_goal: sum.neededGoalBuffer })}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-muted"
            >
              Sınavdan 2 hafta önce bitir (günde {sum.neededGoalBuffer})
            </button>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Zaman çizelgesi</h2>
        <TimelineChart work={work} settings={s} today={today} examDays={examDays} actualPerDay={actualPerDay} />
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Öneriler</h2>
        <ul className="space-y-2">
          {advice.map((a, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 text-sm ${
                a.tone === "warn" ? "bg-warn-soft text-warn" : a.tone === "good" ? "bg-accent-soft text-accent" : "border border-line bg-card text-muted"
              }`}
            >
              {a.text}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-[3.25rem] z-10 border-t border-line bg-card/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md gap-2">
            <button onClick={() => setS(base)} className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted">
              Geri al
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:text-[#06201c]"
            >
              {busy ? "Kaydediliyor…" : "Planı kaydet"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Stepper({
  label,
  hint,
  value,
  range,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  range: readonly [number, number];
  onChange: (v: number) => void;
}) {
  const btn = "h-10 w-10 rounded-full border border-line text-lg disabled:opacity-30";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className={btn} onClick={() => onChange(value - 1)} disabled={value <= range[0]} aria-label={`${label} azalt`}>
          −
        </button>
        <span className="w-6 text-center text-lg font-semibold">{value}</span>
        <button className={btn} onClick={() => onChange(value + 1)} disabled={value >= range[1]} aria-label={`${label} artır`}>
          +
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
