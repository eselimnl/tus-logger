import { daysBetween, toDateStr } from "./dates";
import type { Progress, Topic } from "./types";

/** Çalışmadan kaç gün sonra 1., 2., ... tekrar önerilir (5. tekrara kadar). */
export const DEFAULT_INTERVALS = [1, 7, 30, 60, 120] as const;

export type DueReview = {
  topic: Topic;
  which: number;
  overdueDays: number;
};

/**
 * Bugün için yeni konu önerisi: çalışılmamış konular power'a göre,
 * önce her dersten en fazla birer tane, yetmezse kalanlardan doldurulur.
 */
export function recommendNew(
  topics: Topic[],
  progress: Map<number, Progress>,
  count = 4,
  excludeIds: number[] = [],
): Topic[] {
  const skip = new Set(excludeIds);
  const candidates = topics
    .filter((t) => !progress.get(t.id)?.calisma_at && !skip.has(t.id))
    .sort(
      (a, b) =>
        b.ortalama_soru - a.ortalama_soru || b.toplam_6_sinav - a.toplam_6_sinav || a.id - b.id,
    );

  const picked: Topic[] = [];
  const usedDers = new Set<string>();
  for (const t of candidates) {
    if (picked.length >= count) break;
    if (usedDers.has(t.ders)) continue;
    picked.push(t);
    usedDers.add(t.ders);
  }
  for (const t of candidates) {
    if (picked.length >= count) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked;
}

/** Zamanı gelmiş (ve henüz işaretlenmemiş) tekrarlar, en çok gecikmiş önce. */
export function dueReviews(
  topics: Topic[],
  progress: Map<number, Progress>,
  today: string,
  tekrarCount = 3,
  intervals: readonly number[] = DEFAULT_INTERVALS,
): DueReview[] {
  const out: DueReview[] = [];
  for (const t of topics) {
    const p = progress.get(t.id) as unknown as Record<string, string | null> | undefined;
    if (!p?.calisma_at) continue;
    const studied = toDateStr(p.calisma_at);
    let next = 0;
    for (let k = 1; k <= tekrarCount; k++) {
      if (!p[`tekrar${k}_at`]) {
        next = k;
        break;
      }
    }
    if (!next) continue;
    const overdue = daysBetween(studied, today) - (intervals[next - 1] ?? intervals[intervals.length - 1]);
    if (overdue >= 0) out.push({ topic: t, which: next, overdueDays: overdue });
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays || a.topic.id - b.topic.id);
}
