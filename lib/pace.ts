/** Son 14 gündeki işaretlemelerden günlük ortalama; hiç kayıt yoksa null. */
export function actualPerDay(log: { at: string; event: string }[], days = 14): number | null {
  return log.length === 0 ? null : log.length / days;
}
