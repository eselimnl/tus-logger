import { getCalismaLog, getProgress, getTopics } from "@/lib/data";
import { addDays, daysToExam, toDateStr, todayStr, weekStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

const WEEKS = 8;
const WEEKLY_TARGET = 28; // günde 4 konu

export default async function IlerlemePage() {
  const today = todayStr();
  const thisWeek = weekStart(today);
  const firstWeek = addDays(thisWeek, -7 * (WEEKS - 1));
  const [topics, progress, log] = await Promise.all([
    getTopics(),
    getProgress(),
    getCalismaLog(new Date(firstWeek + "T00:00:00+03:00").toISOString()),
  ]);
  const prog = new Map(progress.map((p) => [p.topic_id, p]));

  const dersler = [...new Set(topics.map((t) => t.ders))].map((ders) => {
    const ts = topics.filter((t) => t.ders === ders);
    const count = (k: "calisma_at" | "tekrar1_at" | "tekrar2_at" | "tekrar3_at" | "soru1_at" | "soru2_at") =>
      ts.filter((t) => prog.get(t.id)?.[k]).length;
    return {
      ders,
      total: ts.length,
      calisma: count("calisma_at"),
      tekrar: [count("tekrar1_at"), count("tekrar2_at"), count("tekrar3_at")],
      soru: [count("soru1_at"), count("soru2_at")],
    };
  });

  const total = topics.length;
  const studied = dersler.reduce((s, d) => s + d.calisma, 0);
  // Güç ağırlıklı kapsam: çalışılan konuların sınav payı
  const sumPower = topics.reduce((s, t) => s + t.ortalama_soru, 0);
  const coveredPower = topics.reduce(
    (s, t) => s + (prog.get(t.id)?.calisma_at ? t.ortalama_soru : 0),
    0,
  );

  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
  const perWeek = weeks.map((w) => ({
    start: w,
    n: log.filter((at) => weekStart(toDateStr(at)) === w).length,
  }));
  const remaining = total - studied;
  const days = daysToExam(today);

  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">İlerleme</h1>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Çalışılan konu" value={`${studied}/${total}`} sub={`%${Math.round((100 * studied) / total)}`} />
        <Stat
          label="Sınav kapsamı"
          value={`%${Math.round((100 * coveredPower) / sumPower)}`}
          sub="power ağırlıklı"
        />
        <Stat label="Kalan konu" value={String(remaining)} sub={`${Math.ceil(remaining / 4)} gün (4/gün)`} />
        <Stat label="Sınava" value={`${days} gün`} sub="21 Mart 2027" />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
          Haftalık yeni konu (hedef {WEEKLY_TARGET})
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
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{d.ders}</span>
                <span className="text-sm text-muted">
                  {d.calisma}/{d.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-accent" style={{ width: `${(100 * d.calisma) / d.total}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                Tekrar {d.tekrar[0]} · {d.tekrar[1]} · {d.tekrar[2]} &nbsp;|&nbsp; Soru {d.soru[0]} · {d.soru[1]}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
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
