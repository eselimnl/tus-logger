"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveNote, setCheckpoint } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { CHECKPOINT_LABEL, CHECKPOINTS, EXAMS, type Checkpoint, type Progress, type Topic } from "@/lib/types";
import { PowerBadge } from "./Bits";

export default function TopicDetail({ topic, progress }: { topic: Topic; progress: Progress }) {
  const sb = useMemo(() => createClient(), []);
  const [prog, setProg] = useState(progress);
  const [note, setNote] = useState(progress.note);
  const [noteState, setNoteState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function toggle(cp: Checkpoint) {
    const key = `${cp}_at` as const;
    const was = prog[key];
    setProg((p) => ({ ...p, [key]: was ? null : new Date().toISOString() }));
    setError(null);
    try {
      const at = await setCheckpoint(sb, topic.id, cp, !was);
      setProg((p) => ({ ...p, [key]: at }));
    } catch (e) {
      setProg((p) => ({ ...p, [key]: was }));
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  }

  function onNote(v: string) {
    setNote(v);
    setNoteState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setNoteState("saving");
      try {
        await saveNote(sb, topic.id, v);
        setNoteState("saved");
      } catch {
        setNoteState("error");
      }
    }, 800);
  }

  // jsonb anahtar sırasını korumaz; sınav sırasını sabitle.
  const exams = EXAMS.map((name) => [name, topic.dagilim[name] ?? 0] as const);

  return (
    <main className="flex-1 px-4 pt-6">
      <Link href="/konular" className="text-sm text-muted">
        ← Konular
      </Link>
      <p className="mt-4 text-sm text-muted">{topic.ders}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{topic.konu}</h1>
      <div className="mt-2">
        <PowerBadge topic={topic} />
        <span className="ml-2 text-xs text-muted">Dersin %{topic.ders_ici_yuzde}&apos;i</span>
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Son 6 TUS</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {exams.map(([name, n]) => (
            <div key={name} className="rounded-xl border border-line bg-card py-2 text-center">
              <div className="text-lg font-semibold">{n}</div>
              <div className="px-0.5 text-[10px] leading-tight text-muted">{name}</div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">İlerleme</h2>
        <ul className="space-y-2">
          {CHECKPOINTS.map((cp) => {
            const at = prog[`${cp}_at`];
            return (
              <li key={cp}>
                <button
                  onClick={() => toggle(cp)}
                  aria-pressed={!!at}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left ${
                    at ? "border-accent bg-accent-soft" : "border-line bg-card"
                  }`}
                >
                  <span className="font-medium">{CHECKPOINT_LABEL[cp]}</span>
                  <span className={`text-sm ${at ? "text-accent" : "text-muted"}`}>
                    {at
                      ? "✓ " +
                        new Date(at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          timeZone: "Europe/Istanbul",
                        })
                      : "Yapılmadı"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Not</h2>
          <span className="text-xs text-muted">
            {noteState === "saving" && "Kaydediliyor…"}
            {noteState === "saved" && "Kaydedildi"}
            {noteState === "dirty" && "Yazıyorsun…"}
            {noteState === "error" && <span className="text-warn">Kaydedilemedi</span>}
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={6}
          placeholder="Yanlış yaptığın sorular, ezber notları, kaynak sayfası…"
          className="w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
        />
      </section>
    </main>
  );
}
