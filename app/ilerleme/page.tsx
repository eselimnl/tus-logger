import Honeycomb from "@/components/Honeycomb";
import { getCalismaLog, getProgress, getTopics } from "@/lib/data";
import { addDays, daysToExam, EXAM_LABEL, toDateStr, todayStr, weekStart } from "@/lib/dates";
import { buildHoneycomb, dersColors } from "@/lib/honeycomb";

export const dynamic = "force-dynamic";

// "Tamamlandı" = 3 tekrar + 2 soru. Çalışma işareti adım sayılmaz (ilk harita onu kullanır).
const FULL_STEPS = ["tekrar1", "tekrar2", "tekrar3", "soru1", "soru2"] as const;

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
  const colors = dersColors([...new Set(topics.map((t) => t.ders))]);

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
  const soruDone = dersler.reduce((s, d) => s + d.soru[0], 0);
  const soru2Done = dersler.reduce((s, d) => s + d.soru[1], 0);
  // Güç ağırlıklı kapsam: konunun sınav payı (ortalama soru) ile
  const sumPower = topics.reduce((s, t) => s + t.ortalama_soru, 0);
  const power = (has: (id: number) => boolean) =>
    topics.reduce((s, t) => s + (has(t.id) ? t.ortalama_soru : 0), 0);
  const coveredStudy = power((id) => !!prog.get(id)?.calisma_at);
  const coveredSoru = power((id) => !!prog.get(id)?.soru1_at);

  // Honeycomb: her hücre bir sınav sorusu
  const cells = buildHoneycomb(topics);
  const steps = (id: number) => FULL_STEPS.filter((cp) => prog.get(id)?.[`${cp}_at`]).length;
  const names = Object.fromEntries(topics.map((t) => [t.id, t.konu]));
  const levelsStudied = Object.fromEntries(topics.map((t) => [t.id, prog.get(t.id)?.calisma_at ? 1 : 0]));
  const levelsFull = Object.fromEntries(topics.map((t) => [t.id, steps(t.id) / FULL_STEPS.length]));
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
        <Stat label="Kalan konu" value={String(remaining)} sub={`${Math.ceil(remaining / 4)} gün (4/gün)`} />
        <Stat label="Sınava" value={`${days} gün`} sub={EXAM_LABEL} />
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
          Parlak yanması için konunun 5 adımı da bitmeli (3 tekrar, 2 soru):{" "}
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
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[d.ders] }} />
                <span className="font-medium">{d.ders}</span>
              </div>
              <Bar label="Çalışma" n={d.calisma} total={d.total} tone="bg-accent" />
              <Bar label="Soru" n={d.soru[0]} total={d.total} tone="bg-soru" extra={`2. tur ${d.soru[1]}`} />
              <p className="mt-2 text-xs text-muted">
                Tekrar 1 · 2 · 3: {d.tekrar[0]} · {d.tekrar[1]} · {d.tekrar[2]}
              </p>
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
