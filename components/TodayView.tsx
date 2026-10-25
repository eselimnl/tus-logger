"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { daysToExam } from "@/lib/dates";
import { setCheckpoint, upsertPlanRows } from "@/lib/mutations";
import { dueReviews } from "@/lib/recommend";
import { createClient } from "@/lib/supabase/client";
import {
  emptyProgress,
  type Checkpoint,
  type PlanRow,
  type Progress,
  type Topic,
} from "@/lib/types";
import { PowerBadge } from "./Bits";

type Props = {
  today: string;
  topics: Topic[];
  progress: Progress[];
  plan: PlanRow[];
  newRows: PlanRow[];
};

const SLOT_LABEL = { sabah: "Sabah", aksam: "Akşam" } as const;

export default function TodayView({ today, topics, progress, plan, newRows }: Props) {
  const sb = useMemo(() => createClient(), []);
  const byId = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const [prog, setProg] = useState(() => new Map(progress.map((p) => [p.topic_id, p])));
  const [rows, setRows] = useState(plan);
  const [picker, setPicker] = useState<PlanRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persisted = useRef(false);

  // Önerilen yuvaları bir kez kaydet ki gün içinde değişmesinler.
  useEffect(() => {
    if (persisted.current || newRows.length === 0) return;
    persisted.current = true;
    upsertPlanRows(sb, newRows).catch((e) => setError(e.message));
  }, [sb, newRows]);

  function patch(topicId: number, cp: Checkpoint, at: string | null) {
    setProg((m) => {
      const next = new Map(m);
      next.set(topicId, { ...(m.get(topicId) ?? emptyProgress(topicId)), [`${cp}_at`]: at });
      return next;
    });
  }

  async function toggle(topicId: number, cp: Checkpoint) {
    const was = prog.get(topicId)?.[`${cp}_at`] ?? null;
    const optimistic = was ? null : new Date().toISOString();
    patch(topicId, cp, optimistic);
    setError(null);
    try {
      const at = await setCheckpoint(sb, topicId, cp, !was);
      patch(topicId, cp, at);
    } catch (e) {
      patch(topicId, cp, was);
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  }

  async function swap(target: PlanRow, topicId: number) {
    const next = { ...target, topic_id: topicId };
    setRows((r) =>
      r.map((x) => (x.slot === target.slot && x.position === target.position ? next : x)),
    );
    setPicker(null);
    try {
      await upsertPlanRows(sb, [next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Değişiklik kaydedilemedi.");
    }
  }

  const due = useMemo(() => dueReviews(topics, prog, today), [topics, prog, today]);
  const doneToday = rows.filter((r) => prog.get(r.topic_id)?.calisma_at).length;
  const planIds = new Set(rows.map((r) => r.topic_id));

  return (
    <main className="flex-1 px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-muted">
          {new Date(today + "T12:00:00").toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bugün {doneToday}/4 konu</h1>
        <p className="mt-1 text-sm text-muted">TUS&apos;a {daysToExam(today)} gün kaldı</p>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      {(["sabah", "aksam"] as const).map((slot) => (
        <section key={slot} className="mb-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
            {SLOT_LABEL[slot]}
          </h2>
          <ul className="space-y-3">
            {rows
              .filter((r) => r.slot === slot)
              .sort((a, b) => a.position - b.position)
              .map((r) => {
                const t = byId.get(r.topic_id);
                if (!t) return null;
                const done = !!prog.get(t.id)?.calisma_at;
                return (
                  <li key={`${slot}-${r.position}`} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/konu/${t.id}`} className="min-w-0">
                        <p className="text-xs text-muted">{t.ders}</p>
                        <p className={`font-medium ${done ? "text-muted line-through" : ""}`}>
                          {t.konu}
                        </p>
                      </Link>
                      <PowerBadge topic={t} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggle(t.id, "calisma")}
                        aria-pressed={done}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ${
                          done
                            ? "bg-accent-soft text-accent"
                            : "bg-accent text-white dark:text-[#06201c]"
                        }`}
                      >
                        {done ? "Çalışıldı ✓" : "Çalıştım"}
                      </button>
                      {!done && (
                        <button
                          onClick={() => setPicker(r)}
                          className="rounded-xl border border-line px-3 py-2.5 text-sm text-muted"
                        >
                          Değiştir
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
          Bugün tekrar ({due.length})
        </h2>
        {due.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
            Zamanı gelen tekrar yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {due.slice(0, 10).map(({ topic: t, which, overdueDays }) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
              >
                <Link href={`/konu/${t.id}`} className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.konu}</p>
                  <p className="text-xs text-muted">
                    {t.ders} · {which}. tekrar
                    {overdueDays > 0 && <span className="text-warn"> · {overdueDays} gün gecikti</span>}
                  </p>
                </Link>
                <button
                  onClick={() => toggle(t.id, `tekrar${which}` as Checkpoint)}
                  className="shrink-0 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent"
                >
                  Yaptım
                </button>
              </li>
            ))}
          </ul>
        )}
        {due.length > 10 && (
          <p className="mt-2 text-xs text-muted">+{due.length - 10} tekrar daha, kalanlar sırayla görünür.</p>
        )}
      </section>

      {picker && (
        <Picker
          topics={topics}
          prog={prog}
          planIds={planIds}
          onPick={(id) => swap(picker, id)}
          onClose={() => setPicker(null)}
        />
      )}
    </main>
  );
}

function Picker({
  topics,
  prog,
  planIds,
  onPick,
  onClose,
}: {
  topics: Topic[];
  prog: Map<number, Progress>;
  planIds: Set<number>;
  onPick: (id: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = topics
    .filter((t) => !prog.get(t.id)?.calisma_at && !planIds.has(t.id))
    .filter((t) => `${t.ders} ${t.konu}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")))
    .sort((a, b) => b.ortalama_soru - a.ortalama_soru || a.id - b.id)
    .slice(0, 40);

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Konu seç"
        className="mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Konu veya ders ara"
            className="flex-1 rounded-xl border border-line bg-card px-4 py-2.5 outline-none focus:border-accent"
          />
          <button onClick={onClose} className="px-2 text-sm text-muted">
            Kapat
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto pb-4">
          {list.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onPick(t.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{t.ders}</span>
                  <span className="block truncate text-sm font-medium">{t.konu}</span>
                </span>
                <PowerBadge topic={t} />
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="py-6 text-center text-sm text-muted">Sonuç yok.</li>}
        </ul>
      </div>
    </div>
  );
}
