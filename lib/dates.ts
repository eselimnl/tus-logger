export const TZ = "Europe/Istanbul";
export const EXAM_DATE = "2027-03-21";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** Verilen anın İstanbul takvimindeki günü, YYYY-MM-DD. */
export function toDateStr(d: Date | string): string {
  return fmt.format(typeof d === "string" ? new Date(d) : d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

function utc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** b - a, gün olarak. */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function addDays(dateStr: string, n: number): string {
  return new Date(utc(dateStr) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysToExam(today = todayStr()): number {
  return daysBetween(today, EXAM_DATE);
}

/** Verilen günün haftasının pazartesisi. */
export function weekStart(dateStr: string): string {
  const dow = new Date(utc(dateStr)).getUTCDay(); // 0=Pazar
  return addDays(dateStr, -((dow + 6) % 7));
}
