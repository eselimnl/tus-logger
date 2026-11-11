"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  addTopic,
  bulkMark,
  markOnboarded,
  removeTopic,
  renameTopic,
  restoreTopic,
  saveSettings,
} from "@/lib/mutations";
import { LIMITS, type PlanSettings } from "@/lib/plan";
import { createClient } from "@/lib/supabase/client";
import type { Checkpoint, Progress, Topic } from "@/lib/types";

type Marks = Set<Checkpoint>;

const KONU = (k: number) => `tekrar${k}` as Checkpoint;
const SORU = (k: number) => `soru${k}` as Checkpoint;
const labelOf = (cp: Checkpoint) =>
  cp.startsWith("tekrar") ? `${cp.slice(6)}. konu tekrarı` : `${cp.slice(4)}. soru tekrarı`;
const isSeries = (a: Checkpoint, b: Checkpoint) => a.replace(/\d+$/, "") === b.replace(/\d+$/, "");
const num = (cp: Checkpoint) => Number(cp.replace(/\D+/, ""));

/** Basamaklı işaretleme: k. tekrarı işaretlemek öncekileri de işaretler, kaldırmak sonrakileri de kaldırır. */
function toggled(marks: Marks, cp: Checkpoint, on: boolean, all: Checkpoint[]): Marks {
  const n = new Set(marks);
  for (const o of all) {
    if (!isSeries(o, cp)) continue;
    if (on && num(o) <= num(cp)) n.add(o);
    if (!on && num(o) >= num(cp)) n.delete(o);
  }
  return n;
}

export default function OnboardingView({
  topics: initial,
  progress,
  settings,
}: {
  topics: Topic[];
  progress: Progress[];
  settings: PlanSettings;
}) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [topics, setTopics] = useState(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [plan, setPlan] = useState(settings);
  const steps = useMemo<Checkpoint[]>(
    () => [
      ...Array.from({ length: plan.tekrar_count }, (_, i) => KONU(i + 1)),
      ...Array.from({ length: plan.soru_count }, (_, i) => SORU(i + 1)),
    ],
    [plan.tekrar_count, plan.soru_count],
  );
  const progressById = useMemo(() => new Map(progress.map((p) => [p.topic_id, p])), [progress]);
  const initialMarks = useMemo(() => {
    const m = new Map<number, Marks>();
    for (const p of progress) {
      const row = p as unknown as Record<string, string | null>;
      const set = new Set<Checkpoint>();
      for (const cp of [...Array.from({ length: 5 }, (_, i) => KONU(i + 1)), ...Array.from({ length: 4 }, (_, i) => SORU(i + 1))])
        if (row[`${cp}_at`]) set.add(cp);
      m.set(p.topic_id, set);
    }
    return m;
  }, [progress]);
  const [marks, setMarks] = useState(initialMarks);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = topics.filter((t) => !t.hidden);
  const hidden = topics.filter((t) => t.hidden);
  const dersler = useMemo(() => [...new Set(topics.map((t) => t.ders))], [topics]);
  const get = (id: number): Marks => marks.get(id) ?? new Set<Checkpoint>();
  const setStepFor = (ids: number[], cp: Checkpoint, on: boolean) =>
    setMarks((m) => {
      const n = new Map(m);
      for (const id of ids) n.set(id, toggled(m.get(id) ?? new Set(), cp, on, steps));
      return n;
    });

  const changed = useMemo(() => {
    const out: { topicId: number; calisma?: boolean; steps: Partial<Record<Checkpoint, boolean>> }[] = [];
    for (const t of visible) {
      const a = marks.get(t.id) ?? new Set<Checkpoint>();
      const b = initialMarks.get(t.id) ?? new Set<Checkpoint>();
      const diff: Partial<Record<Checkpoint, boolean>> = {};
      for (const cp of steps) if (a.has(cp) !== b.has(cp)) diff[cp] = a.has(cp);
      if (Object.keys(diff).length === 0) continue;
      const anyKonu = steps.some((cp) => cp.startsWith("tekrar") && a.has(cp));
      out.push({
        topicId: t.id,
        ...(anyKonu && !progressById.get(t.id)?.calisma_at ? { calisma: true } : {}),
        steps: diff,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, initialMarks, topics, steps]);

  const konuSteps = steps.filter((c) => c.startsWith("tekrar"));
  const nKonu = visible.filter((t) => get(t.id).size > 0 && konuSteps.some((c) => get(t.id).has(c))).length;
  const nSoru = visible.filter((t) => steps.some((c) => c.startsWith("soru") && get(t.id).has(c))).length;

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şey ters gitti.");
    }
  }

  const rename = (t: Topic) =>
    run(async () => {
      const name = draft.trim();
      if (name && name !== t.konu) {
        await renameTopic(sb, t, name);
        setTopics((l) => l.map((x) => (x.id === t.id ? { ...x, konu: name, original: x.custom ? undefined : x.original ?? x.konu } : x)));
      }
      setEditing(null);
    });

  const remove = (t: Topic) =>
    run(async () => {
      if (!confirm(t.custom ? `"${t.konu}" silinsin mi?` : `"${t.konu}" listenden gizlensin mi? (Sonra geri getirebilirsin)`)) return;
      await removeTopic(sb, t);
      setTopics((l) => (t.custom ? l.filter((x) => x.id !== t.id) : l.map((x) => (x.id === t.id ? { ...x, hidden: true } : x))));
    });

  const restore = (t: Topic) =>
    run(async () => {
      await restoreTopic(sb, t.id);
      setTopics((l) => l.map((x) => (x.id === t.id ? { ...x, hidden: false } : x)));
    });

  const add = (ders: string) =>
    run(async () => {
      if (!newName.trim()) return;
      const bolum = topics.find((t) => t.ders === ders)?.bolum ?? "";
      const t = await addTopic(sb, ders, bolum, newName);
      setTopics((l) => [...l, t]);
      setNewName("");
      setAdding(null);
    });

  async function finish(skip: boolean) {
    setBusy(true);
    await run(async () => {
      if (!skip) {
        await saveSettings(sb, plan);
        await bulkMark(sb, changed);
      }
      await markOnboarded(sb);
      router.replace("/");
      router.refresh();
    });
    setBusy(false);
  }

  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition-colors ${
      on ? "border-accent bg-accent text-white dark:text-[#06201c]" : "border-line text-muted"
    }`;

  if (step === 1) {
    return (
      <main className="flex-1 px-4 pb-32 pt-6">
        <p className="text-xs text-muted">Adım 1 / 2</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hoş geldin 👋</h1>
        <p className="mt-1 text-sm text-muted">
          Önce planını kuralım: her konuyu kaç kez tekrar etmek, kaç tur soru çözmek istiyorsun? Önerilen 3 konu tekrarı
          + 2 soru tekrarı. Günlük hedefini ve diğer ayarları sonra Plan sekmesinden değiştirebilirsin.
        </p>
        <div className="mt-5 space-y-2">
          <Stepper
            label="Konu tekrarı sayısı"
            hint="her konu için"
            value={plan.tekrar_count}
            range={LIMITS.tekrar}
            onChange={(v) => setPlan((p) => ({ ...p, tekrar_count: v }))}
          />
          <Stepper
            label="Soru tekrarı sayısı"
            hint="her konu için"
            value={plan.soru_count}
            range={LIMITS.soru}
            onChange={(v) => setPlan((p) => ({ ...p, soru_count: v }))}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Her konu için toplam {plan.tekrar_count + plan.soru_count} adım ({plan.tekrar_count} konu tekrarı +{" "}
          {plan.soru_count} soru tekrarı).
        </p>
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-md gap-2">
            <button
              onClick={() => finish(true)}
              disabled={busy}
              className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted disabled:opacity-60"
            >
              Şimdilik atla
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white dark:text-[#06201c]"
            >
              Devam
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pb-32 pt-6">
      <p className="text-xs text-muted">Adım 2 / 2</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Şimdiye kadarki ilerlemen</h1>
      <p className="mt-1 text-sm text-muted">
        Tamamladığın konu ve soru tekrarlarını işaretle; hepsi tek seferde kaydedilir. 2. tekrarı işaretlersen 1. tekrar da
        işaretlenir. Konu adlarını değiştirebilir, konu ekleyip silebilirsin. Sonradan Hesap sayfasından geri dönebilirsin.
      </p>
      <p className="mt-2 text-sm">
        <b>{nKonu}</b> konuda konu tekrarı · <b>{nSoru}</b> konuda soru tekrarı · {visible.length} konu
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {dersler.map((ders) => {
          const ts = visible.filter((t) => t.ders === ders);
          const isOpen = open === ders;
          const ids = ts.map((t) => t.id);
          const nd = (cp: Checkpoint) => ts.filter((t) => get(t.id).has(cp)).length;
          return (
            <li key={ders} className="rounded-2xl border border-line bg-card">
              <button
                onClick={() => setOpen(isOpen ? null : ders)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span>
                  <span className="block font-medium">{ders}</span>
                  <span className="text-xs text-muted">
                    {steps.map((cp) => `${cp.startsWith("tekrar") ? "K" : "S"}${num(cp)} ${nd(cp)}/${ts.length}`).join(" · ")}
                  </span>
                </span>
                <span className="text-muted">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-line px-4 pb-3">
                  <p className="pt-2 text-xs text-muted">Dersin tüm konularını işaretle:</p>
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {steps.map((cp) => {
                      const all = ts.length > 0 && nd(cp) === ts.length;
                      return (
                        <button
                          key={cp}
                          onClick={() => setStepFor(ids, cp, !all)}
                          aria-pressed={all}
                          className={chip(all)}
                        >
                          {labelOf(cp)}
                        </button>
                      );
                    })}
                  </div>
                  <ul className="divide-y divide-line">
                    {ts.map((t) => (
                      <li key={t.id} className="py-2.5">
                        {editing === t.id ? (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && rename(t)}
                              className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                            <button onClick={() => rename(t)} className="rounded-lg bg-accent px-3 text-sm text-white dark:text-[#06201c]">
                              Tamam
                            </button>
                            <button onClick={() => setEditing(null)} className="px-1 text-sm text-muted">
                              İptal
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="min-w-0 flex-1 text-sm">
                                {t.konu}
                                {t.custom && <span className="ml-1.5 text-[10px] text-accent">kendi konun</span>}
                              </span>
                              <span className="flex gap-1 text-muted">
                                <button
                                  onClick={() => {
                                    setEditing(t.id);
                                    setDraft(t.konu);
                                  }}
                                  className="px-1.5 py-1 text-xs underline"
                                  aria-label={`${t.konu} adını değiştir`}
                                >
                                  Ad
                                </button>
                                <button onClick={() => remove(t)} className="px-1.5 py-1 text-xs underline" aria-label={`${t.konu} sil`}>
                                  Sil
                                </button>
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {steps.map((cp) => {
                                const on = get(t.id).has(cp);
                                return (
                                  <button
                                    key={cp}
                                    onClick={() => setStepFor([t.id], cp, !on)}
                                    aria-pressed={on}
                                    aria-label={`${t.konu}: ${labelOf(cp)}`}
                                    className={chip(on)}
                                  >
                                    {labelOf(cp)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {adding === ders ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add(ders)}
                        placeholder="Yeni konu adı"
                        className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      <button onClick={() => add(ders)} className="rounded-lg bg-accent px-3 text-sm text-white dark:text-[#06201c]">
                        Ekle
                      </button>
                      <button onClick={() => setAdding(null)} className="px-1 text-sm text-muted">
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAdding(ders);
                        setNewName("");
                      }}
                      className="mt-2 text-sm text-accent"
                    >
                      + Konu ekle
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hidden.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Gizlenen konular ({hidden.length})</h2>
          <ul className="space-y-1.5">
            {hidden.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">
                <span className="min-w-0 truncate">
                  {t.ders} · {t.konu}
                </span>
                <button onClick={() => restore(t)} className="shrink-0 pl-3 text-accent underline">
                  Geri getir
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            onClick={() => setStep(1)}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted disabled:opacity-60"
          >
            Geri
          </button>
          <button
            onClick={() => finish(false)}
            disabled={busy}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:text-[#06201c]"
          >
            {busy ? "Kaydediliyor…" : changed.length ? `Kaydet ve başla (${changed.length} konu)` : "Kaydet ve başla"}
          </button>
        </div>
      </div>
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
