import { CHECKPOINTS, type Progress, type Topic } from "@/lib/types";

export function PowerBadge({ topic }: { topic: Topic }) {
  const tone =
    topic.oncelik === "Yüksek"
      ? "bg-accent text-white dark:text-[#06201c]"
      : topic.oncelik === "Orta"
        ? "bg-accent-soft text-accent"
        : "bg-line text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title={`Son 6 TUS'ta ortalama ${topic.ortalama_soru} soru`}
    >
      {topic.oncelik} · {topic.ortalama_soru.toFixed(1)}
    </span>
  );
}

/** Çalışma, 3 tekrar, 2 soru için altı küçük nokta. */
export function StatusDots({ progress }: { progress?: Progress }) {
  return (
    <span className="flex gap-1" aria-label="ilerleme">
      {CHECKPOINTS.map((cp) => {
        const done = !!progress?.[`${cp}_at`];
        return (
          <span
            key={cp}
            className={`h-2 w-2 rounded-full ${done ? "bg-accent" : "bg-line"}`}
          />
        );
      })}
    </span>
  );
}
