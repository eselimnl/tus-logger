import { addDays } from "./dates";
import { SORU_MAX, TEKRAR_MAX, type Checkpoint, type Progress } from "./types";

/**
 * Plan modeli. Birim = bir konu için tek bir işaretleme (çalışma, bir tekrar ya da bir soru turu).
 * - Konu işi  = ilk çalışma + tekrarlar
 * - Soru işi  = soru turları
 * Günlük hedef toplam birimdir; konu ve soru arasında bölünür. Bir hat bitince kapasitesi diğerine geçer.
 */

export type PlanSettings = {
  tekrar_count: number;
  soru_count: number;
  daily_goal: number;
  /** Günlük hedefin soru payı, yüzde. null = otomatik (iki hat aynı gün bitsin). */
  soru_share: number | null;
  days_per_week: number;
};

export const DEFAULT_SETTINGS: PlanSettings = {
  tekrar_count: 3,
  soru_count: 2,
  daily_goal: 4,
  soru_share: null,
  days_per_week: 7,
};

export const LIMITS = {
  tekrar: [0, TEKRAR_MAX],
  soru: [0, SORU_MAX],
  goal: [1, 20],
  days: [1, 7],
} as const;

const clampInt = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function clampSettings(s: Partial<PlanSettings> | null | undefined): PlanSettings {
  const d = DEFAULT_SETTINGS;
  return {
    tekrar_count: clampInt(s?.tekrar_count, LIMITS.tekrar, d.tekrar_count),
    soru_count: clampInt(s?.soru_count, LIMITS.soru, d.soru_count),
    daily_goal: clampInt(s?.daily_goal, LIMITS.goal, d.daily_goal),
    soru_share: s?.soru_share == null ? null : clampInt(s.soru_share, [0, 100], 50),
    days_per_week: clampInt(s?.days_per_week, LIMITS.days, d.days_per_week),
  };
}

export const konuSteps = (s: PlanSettings): Checkpoint[] => [
  "calisma",
  ...Array.from({ length: s.tekrar_count }, (_, i) => `tekrar${i + 1}` as Checkpoint),
];
export const soruSteps = (s: PlanSettings): Checkpoint[] =>
  Array.from({ length: s.soru_count }, (_, i) => `soru${i + 1}` as Checkpoint);
export const stepsFor = (s: PlanSettings): Checkpoint[] => [...konuSteps(s), ...soruSteps(s)];

/** Tekrar + soru adımları (ilk çalışma hariç): "tamamlandı" haritası bunu kullanır. */
export const completionSteps = (s: PlanSettings): Checkpoint[] => [
  ...konuSteps(s).filter((c) => c !== "calisma"),
  ...soruSteps(s),
];

export const stepDone = (p: Progress | undefined, cp: Checkpoint): boolean =>
  !!p?.[`${cp}_at` as const];

export type Work = { konuTotal: number; konuDone: number; soruTotal: number; soruDone: number };

export function computeWork(topicCount: number, progress: Progress[], s: PlanSettings): Work {
  const ks = konuSteps(s);
  const ss = soruSteps(s);
  let konuDone = 0;
  let soruDone = 0;
  for (const p of progress) {
    for (const cp of ks) if (stepDone(p, cp)) konuDone++;
    for (const cp of ss) if (stepDone(p, cp)) soruDone++;
  }
  return {
    konuTotal: topicCount * ks.length,
    konuDone,
    soruTotal: topicCount * ss.length,
    soruDone,
  };
}

export type Projection = { konu: number[]; soru: number[] };

export const HORIZON = 1095; // gün

function soruShare(s: PlanSettings, remK: number, remS: number): number {
  if (remS <= 0) return 0;
  if (remK <= 0) return 1;
  if (s.soru_share != null) return s.soru_share / 100;
  return remS / (remK + remS);
}

/** Bugünden itibaren gün gün biriken birimler (i = 0 bugün). */
export function project(work: Work, s: PlanSettings, perDay: number, days = HORIZON): Projection {
  let k = work.konuDone;
  let so = work.soruDone;
  const konu = [k];
  const soru = [so];
  for (let i = 1; i <= days; i++) {
    const remK = Math.max(0, work.konuTotal - k);
    const remS = Math.max(0, work.soruTotal - so);
    if (perDay > 0 && remK + remS > 0) {
      const share = soruShare(s, remK, remS);
      let toS = Math.min(remS, perDay * share);
      let toK = Math.min(remK, perDay * (1 - share));
      let left = perDay - toS - toK;
      if (left > 1e-9) {
        const moreK = Math.min(remK - toK, left);
        toK += moreK;
        left -= moreK;
        toS += Math.min(remS - toS, left);
      }
      k += toK;
      so += toS;
    }
    konu.push(k);
    soru.push(so);
  }
  return { konu, soru };
}

export type LineKey = "konu" | "soru" | "birlesik";

export type Summary = {
  examDays: number;
  perDay: number;
  total: number;
  done: number;
  remaining: number;
  /** Şu anki yüzde */
  pct: Record<LineKey, number>;
  /** Sınav gününe tahmini yüzde */
  atExam: Record<LineKey, number>;
  /** Bugünden kaç gün sonra biter (ufuk içinde bitmiyorsa null) */
  finishDays: Record<LineKey, number | null>;
  /** Hepsini sınav gününe bitirmek için günlük birim */
  neededGoal: number;
  /** Sınavdan 14 gün önce bitirmek için günlük birim */
  neededGoalBuffer: number;
  /** İki hat aynı gün bitsin diye soru payı (yüzde) */
  autoSoruShare: number;
  series: Projection;
};

const pct = (done: number, total: number) => (total > 0 ? Math.min(100, (100 * done) / total) : 100);

export function summarize(
  work: Work,
  s: PlanSettings,
  o: { examDays: number; perDay?: number },
): Summary {
  const perDay = o.perDay ?? (s.daily_goal * s.days_per_week) / 7;
  const series = project(work, s, perDay);
  const total = work.konuTotal + work.soruTotal;
  const done = work.konuDone + work.soruDone;
  const remK = Math.max(0, work.konuTotal - work.konuDone);
  const remS = Math.max(0, work.soruTotal - work.soruDone);
  const remaining = remK + remS;
  const comb = series.konu.map((v, i) => v + series.soru[i]);

  const at = (i: number): Record<LineKey, number> => ({
    konu: pct(series.konu[i], work.konuTotal),
    soru: pct(series.soru[i], work.soruTotal),
    birlesik: pct(comb[i], total),
  });
  const first = (arr: number[], target: number): number | null => {
    if (target <= 0) return 0;
    const i = arr.findIndex((v) => v >= target - 1e-9);
    return i < 0 ? null : i;
  };

  const capacity = (days: number) => Math.max(1, days) * ((s.daily_goal > 0 ? s.days_per_week : 0) / 7);
  const need = (days: number) => (remaining <= 0 ? 0 : Math.ceil(remaining / capacity(days) - 1e-9));

  return {
    examDays: o.examDays,
    perDay,
    total,
    done,
    remaining,
    pct: at(0),
    atExam: at(Math.min(HORIZON, Math.max(0, o.examDays))),
    finishDays: {
      konu: first(series.konu, work.konuTotal),
      soru: first(series.soru, work.soruTotal),
      birlesik: first(comb, total),
    },
    neededGoal: need(o.examDays),
    neededGoalBuffer: need(o.examDays - 14),
    autoSoruShare: remaining > 0 ? Math.round((100 * remS) / remaining) : 0,
    series,
  };
}

export const fmtDate = (dateStr: string, withYear = true): string =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });

export const fmtShort = (dateStr: string): string =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "numeric" });

/** "206 gün · ~29 hafta · ~6,8 ay" */
export function durationLabel(days: number): string {
  const weeks = Math.round(days / 7);
  const months = (days / 30.44).toFixed(1).replace(".", ",");
  return `${days} gün · ~${weeks} hafta · ~${months} ay`;
}

export type Advice = { tone: "good" | "warn" | "info"; text: string };

export function buildAdvice(
  sum: Summary,
  s: PlanSettings,
  today: string,
  topicCount: number,
  actual: Summary | null,
  actualPerDay: number | null,
): Advice[] {
  const out: Advice[] = [];
  if (sum.remaining <= 0) {
    return [{ tone: "good", text: "Seçtiğin tüm adımlar tamamlandı." }];
  }
  const F = sum.finishDays.birlesik;

  if (F !== null && F <= sum.examDays) {
    out.push({
      tone: "good",
      text: `Bu tempoyla ${fmtDate(addDays(today, F))} günü bitirirsin, sınavdan ${sum.examDays - F} gün önce.`,
    });
    if (sum.examDays - F < 14) {
      out.push({
        tone: "info",
        text: `Sınavdan önce 2 haftalık tampon için günde ${sum.neededGoalBuffer} birim yap (şu an ${s.daily_goal}). Hasta olma, nöbet gibi kayıplara karşı güvence verir.`,
      });
    }
  } else {
    out.push({
      tone: "warn",
      text: `Bu tempoyla sınav gününe %${Math.round(sum.atExam.birlesik)} hazırlıkla girersin. Hepsini bitirmek için günde en az ${sum.neededGoal} birim gerekir (şu an ${s.daily_goal}).`,
    });
  }

  if (actual && actualPerDay !== null) {
    out.push({
      tone: actual.atExam.birlesik >= sum.atExam.birlesik - 1 ? "good" : "info",
      text: `Son 14 günde günde ortalama ${actualPerDay.toFixed(1).replace(".", ",")} birim yaptın (hedefin ${s.daily_goal}). Bu tempoyla sınav günü %${Math.round(actual.atExam.birlesik)}.`,
    });
  }

  const fk = sum.finishDays.konu;
  const fs = sum.finishDays.soru;
  if (s.soru_share != null && fk !== null && fs !== null && Math.abs(fk - fs) > 14 && s.soru_count > 0) {
    const weeks = Math.round(Math.abs(fk - fs) / 7);
    out.push({
      tone: "info",
      text: `Soru çözümü konu çalışmasından yaklaşık ${weeks} hafta ${fs < fk ? "önce" : "sonra"} bitiyor. Soru payını %${sum.autoSoruShare} yaparsan ikisi aynı gün biter (Otomatik).`,
    });
  }

  const perExtra = topicCount;
  if (sum.perDay > 0) {
    out.push({
      tone: "info",
      text: `Her ek tekrar ya da soru turu ${perExtra} birim ekler: bu tempoyla yaklaşık ${Math.round(perExtra / sum.perDay)} gün.`,
    });
  }
  return out;
}
