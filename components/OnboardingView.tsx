"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { addTopic, bulkMark, markOnboarded, removeTopic, renameTopic, restoreTopic } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import type { Progress, Topic } from "@/lib/types";

type Mark = { calisma: boolean; soru: boolean };

export default function OnboardingView({ topics: initial, progress }: { topics: Topic[]; progress: Progress[] }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [topics, setTopics] = useState(initial);
  const initialMarks = useMemo(
    () =>
      new Map<number, Mark>(progress.map((p) => [p.topic_id, { calisma: !!p.calisma_at, soru: !!p.soru1_at }])),
    [progress],
  );
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
  const get = (id: number): Mark => marks.get(id) ?? { calisma: false, soru: false };
  const set = (ids: number[], key: keyof Mark, on: boolean) =>
    setMarks((m) => {
      const n = new Map(m);
      for (const id of ids) n.set(id, { ...(m.get(id) ?? { calisma: false, soru: false }), [key]: on });
      return n;
    });

  const changed = useMemo(() => {
    const out: { topicId: number; calisma?: boolean; soru?: boolean }[] = [];
    for (const t of visible) {
      const a = get(t.id);
      const b = initialMarks.get(t.id) ?? { calisma: false, soru: false };
      if (a.calisma !== b.calisma || a.soru !== b.soru) {
        out.push({
          topicId: t.id,
          ...(a.calisma !== b.calisma ? { calisma: a.calisma } : {}),
          ...(a.soru !== b.soru ? { soru: a.soru } : {}),
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, initialMarks, topics]);

  const nCal = visible.filter((t) => get(t.id).calisma).length;
  const nSoru = visible.filter((t) => get(t.id).soru).length;

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
      if (!skip) await bulkMark(sb, changed);
      await markOnboarded(sb);
      router.replace("/");
      router.refresh();
    });
    setBusy(false);
  }

  const cb = "h-5 w-5 accent-[var(--accent)]";

  return (
    <main className="flex-1 px-4 pb-32 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Hoş geldin 👋</h1>
      <p className="mt-1 text-sm text-muted">
        Şimdiye kadar çalıştığın konuları ve soru çözdüklerini işaretle; hepsi tek seferde kaydedilir. Konu adlarını
        değiştirebilir, konu ekleyip silebilirsin. Sonradan Hesap sayfasından geri dönebilirsin.
      </p>
      <p className="mt-2 text-sm">
        <b>{nCal}</b> çalışıldı · <b>{nSoru}</b> soru çözüldü · {visible.length} konu
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
          const c = ts.filter((t) => get(t.id).calisma).length;
          const s = ts.filter((t) => get(t.id).soru).length;
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
                    Çalışma {c}/{ts.length} · Soru {s}/{ts.length}
                  </span>
                </span>
                <span className="text-muted">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-line px-4 pb-3">
                  <div className="flex items-center justify-end gap-4 py-2 text-xs text-muted">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className={cb}
                        checked={ts.length > 0 && c === ts.length}
                        onChange={(e) => set(ids, "calisma", e.target.checked)}
                      />
                      Tümü çalışma
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className={cb}
                        checked={ts.length > 0 && s === ts.length}
                        onChange={(e) => set(ids, "soru", e.target.checked)}
                      />
                      Tümü soru
                    </label>
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
                          <div className="flex items-center gap-3">
                            <span className="min-w-0 flex-1 text-sm">
                              {t.konu}
                              {t.custom && <span className="ml-1.5 text-[10px] text-accent">kendi konun</span>}
                            </span>
                            <label className="flex flex-col items-center gap-0.5 text-[10px] text-muted">
                              <input
                                type="checkbox"
                                className={cb}
                                checked={get(t.id).calisma}
                                onChange={(e) => set([t.id], "calisma", e.target.checked)}
                                aria-label={`${t.konu} çalışıldı`}
                              />
                              Çalışma
                            </label>
                            <label className="flex flex-col items-center gap-0.5 text-[10px] text-muted">
                              <input
                                type="checkbox"
                                className={cb}
                                checked={get(t.id).soru}
                                onChange={(e) => set([t.id], "soru", e.target.checked)}
                                aria-label={`${t.konu} soru çözüldü`}
                              />
                              Soru
                            </label>
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
            onClick={() => finish(true)}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted disabled:opacity-60"
          >
            Şimdilik atla
          </button>
          <button
            onClick={() => finish(false)}
            disabled={busy}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:text-[#06201c]"
          >
            {busy ? "Kaydediliyor…" : changed.length ? `Kaydet ve başla (${changed.length} değişiklik)` : "Başla"}
          </button>
        </div>
      </div>
    </main>
  );
}
