import Link from "next/link";
import Honeycomb from "@/components/Honeycomb";
import TimelineChart from "@/components/TimelineChart";
import { getEventLog, getProgress, getSettings, getTopics } from "@/lib/data";
import { addDays, daysToExam, EXAM_LABEL, toDateStr, todayStr, weekStart } from "@/lib/dates";
import { buildHoneycomb, dersColors } from "@/lib/honeycomb";
import { actualPerDay } from "@/lib/pace";
import { buildAdvice, completionSteps, computeWork, summarize } from "@/lib/plan";

export const dynamic = "force-dynamic";

const WEEKS = 8;

export default async function IlerlemePage() {
  const today = todayStr();
  const thisWeek = weekStart(today);
  const firstWeek = addDays(thisWeek, -7 * (WEEKS - 1));
  const [topics, progress, settings, events] = await Promise.all([
    getTopics(),
    getProgress(),
    getSettings(),
    getEventLog(new Date(firstWeek + "T00:00:00+03:00").toISOString()),
  ]);
  // "Tamamlandı" = planındaki tüm tekrar + soru adımları (ilk çalışma adım sayılmaz).
  const FULL_STEPS = completionSteps(settings);
  const WEEKLY_TARGET = settings.daily_goal * settings.days_per_week;
  const log = events.map((e) => e.at);
  const prog = new Map(progress.map((p) => [p.topic_id, p]));
  const colors = dersColors([...new Set(topics.map((t) => t.ders))]);

  const dersler = [...new Set(topics.map((t) => t.ders))].map((ders) => {
    const ts = topics.filter((t) => t.ders === ders);
    const count = (k: string) =>
      ts.filter((t) => (prog.get(t.id) as unknown as Record<string, string | null> | undefined)?.[k]).length;
    return {
      ders,
      total: ts.length,
      calisma: count("calisma_at"),
      tekrar: Array.from({ length: settings.tekrar_count }, (_, i) => count(`tekrar${i + 1}_at`)),
      soru: Array.from({ length: settings.soru_count }, (_, i) => count(`soru${i + 1}_at`)),
    };
  });

  const total = topics.length;
  const studied = dersler.reduce((s, d) => s + d.calisma, 0);
  const soruDone = dersler.reduce((s, d) => s + (d.soru[0] ?? 0), 0);
  const soru2Done = dersler.reduce((s, d) => s + (d.soru[1] ?? 0), 0);
  // Güç ağırlıklı kapsam: konunun sınav payı (ortalama soru) ile
  const sumPower = topics.reduce((s, t) => s + t.ortalama_soru, 0);
  const power = (has: (id: number) => boolean) =>
    topics.reduce((s, t) => s + (has(t.id) ? t.ortalama_soru : 0), 0);
  const coveredStudy = power((id) => !!prog.get(id)?.calisma_at);
  const coveredSoru = power((id) => !!prog.get(id)?.soru1_at);

  // Honeycomb: her hücre bir sınav sorusu
  const cells = buildHoneycomb(topics);
  const steps = (id: number) => FULL_STEPS.filter((cp) => prog.get(id)?.[`${cp}_at`]).length;
  const nFull = Math.max(1, FULL_STEPS.length);
  const names = Object.fromEntries(topics.map((t) => [t.id, t.konu]));
  const levelsStudied = Object.fromEntries(topics.map((t) => [t.id, prog.get(t.id)?.calisma_at ? 1 : 0]));
  const levelsFull = Object.fromEntries(topics.map((t) => [t.id, FULL_STEPS.length ? steps(t.id) / nFull : prog.get(t.id)?.calisma_at ? 1 : 0]));
  const capStudied = Object.fromEntries(
    topics.map((t) => [t.id, prog.get(t.id)?.calisma_at ? "çalışıldı" : "henüz çalışılmadı"]),
  );
  const capFull = Object.fromEntries(
    topics.map((t) => [
      t.id,
      steps(t.id) === FULL_STEPS.length
        ? `${FULL_STEPS.length}/${FULL_STEPS.length} adım tamam`
        : `${steps(t.id)}/${FULL_STEPS.length} adım`,
    ]),
  );
  const cellsLit = (levels: Record<number, number>) => cells.filter((c) => levels[c.topicId] >= 1).length;

  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
  const perWeek = weeks.map((w) => ({
    start: w,
    n: log.filter((at) => weekStart(toDateStr(at)) === w).length,
  }));
  const remaining = total - studied;
  const days = daysToExam(today);
  const weights = Object.fromEntries(topics.map((t) => [t.id, t.ortalama_soru]));
  const work = computeWork(total, progress, settings, weights);
  const pace = actualPerDay(events.filter((e) => toDateStr(e.at) >= addDays(today, -14)));
  const sum = summarize(work, settings, { examDays: days });
  const actual = pace === null ? null : summarize(work, settings, { examDays: days, perDay: pace });
  const advice = buildAdvice(sum, settings, today, total, actual, pace).slice(0, 3);

  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">İlerleme</h1>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Çalışılan konu" value={`${studied}/${total}`} sub={`%${Math.round((100 * studied) / total)}`} />
        <Stat
          label="Soru çözülen konu"
          value={`${soruDone}/${total}`}
          sub={`%${Math.round((100 * soruDone) / total)} · 2. tur ${soru2Done}`}
        />
        <Stat
          label="Çalışma kapsamı"
          value={`%${Math.round((100 * coveredStudy) / sumPower)}`}
          sub="sınav payına göre"
        />
        <Stat
          label="Soru kapsamı"
          value={`%${Math.round((100 * coveredSoru) / sumPower)}`}
          sub="sınav payına göre"
        />
        <Stat
          label="Hazırlık"
          value={`%${Math.round(sum.pct.birlesik)}`}
          sub={`sınav ağırlıklı · sınavda tahmini %${Math.round(sum.atExam.birlesik)}`}
        />
        <Stat label="Sınava" value={`${days} gün`} sub={`${EXAM_LABEL} · ${remaining} konu kaldı`} />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Sınav haritası · çalışılan konular</h2>
        <p className="mb-2 mt-1 text-xs text-muted">
          Her hücre sınavda çıkan bir soru ({cells.length}). Çalıştığın konunun soruları yanar:{" "}
          <span className="font-medium text-foreground">{cellsLit(levelsStudied)}/{cells.length}</span>
        </p>
        <Honeycomb
          cells={cells}
          colors={colors}
          levels={levelsStudied}
          names={names}
          captions={capStudied}
          label="Çalışılan konulara göre sınav soruları haritası"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Sınav haritası · tamamlananlar</h2>
        <p className="mb-2 mt-1 text-xs text-muted">
          Parlak yanması için konunun {FULL_STEPS.length} adımı da bitmeli ({settings.tekrar_count} tekrar,{" "}
          {settings.soru_count} soru):{" "}
          <span className="font-medium text-foreground">{cellsLit(levelsFull)}/{cells.length}</span>. Yarım kalanlar
          adım sayısı kadar loş yanar.
        </p>
        <Honeycomb
          cells={cells}
          colors={colors}
          levels={levelsFull}
          names={names}
          captions={capFull}
          label="Tüm adımları tamamlanan konulara göre sınav soruları haritası"
        />
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Hazırlık zaman çizelgesi</h2>
          <Link href="/plan" className="text-xs text-accent underline">
            Planı düzenle
          </Link>
        </div>
        <TimelineChart work={work} settings={settings} today={today} examDays={days} actualPerDay={pace} />
        <ul className="mt-2 space-y-2">
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

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
          Haftalık tamamlanan birim (hedef {WEEKLY_TARGET})
        </h2>
        <div className="flex h-32 items-end gap-1.5 rounded-2xl border border-line bg-card p-3">
          {perWeek.map((w) => (
            <div key={w.start} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-muted">{w.n}</span>
              <div
                className="w-full rounded-t bg-accent"
                style={{ height: `${Math.min(100, (w.n / WEEKLY_TARGET) * 100)}%`, minHeight: w.n ? 4 : 2, opacity: w.n ? 1 : 0.25 }}
              />
              <span className="text-[10px] text-muted">
                {new Date(w.start + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Dersler</h2>
        <ul className="space-y-3">
          {dersler.map((d) => (
            <li key={d.ders} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[d.ders] }} />
                <span className="font-medium">{d.ders}</span>
              </div>
              <Bar label="Çalışma" n={d.calisma} total={d.total} tone="bg-accent" />
              {d.soru.length > 0 && (
                <Bar
                  label="Soru"
                  n={d.soru[0]}
                  total={d.total}
                  tone="bg-soru"
                  extra={d.soru.length > 1 ? `son tur ${d.soru[d.soru.length - 1]}` : undefined}
                />
              )}
              {d.tekrar.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Tekrar {d.tekrar.map((_, i) => i + 1).join(" · ")}: {d.tekrar.join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Bar({
  label,
  n,
  total,
  tone,
  extra,
}: {
  label: string;
  n: number;
  total: number;
  tone: string;
  extra?: string;
}) {
  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>
          {n}/{total}
          {extra && ` · ${extra}`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${tone}`} style={{ width: `${(100 * n) / total}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}
