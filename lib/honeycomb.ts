import type { Topic } from "./types";

export const TOTAL_QUESTIONS = 200;

export type Cell = {
  /** Pointy-top altıgen merkezi, altıgen yarıçapı 1 birim. */
  x: number;
  y: number;
  ders: string;
  topicId: number;
};

/** Toplamı tam `total` olan, ağırlıkla orantılı tamsayı dağılımı (largest remainder). */
export function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
    .slice(0, left)
    .forEach(({ i }) => out[i]++);
  return out;
}

const SQRT3 = Math.sqrt(3);

/** Merkeze en yakın `n` altıgen, tepeden başlayıp saat yönünde açıya göre sıralı. */
function layout(n: number): { x: number; y: number }[] {
  const R = 10;
  const all: { x: number; y: number; d: number; a: number; q: number; r: number }[] = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      const x = SQRT3 * (q + r / 2);
      const y = 1.5 * r;
      const d = Math.hypot(x, y);
      // tepeden (−90°) saat yönünde; merkez hücre en başa
      const a = d === 0 ? -1 : (Math.atan2(y, x) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
      all.push({ x, y, d, a, q, r });
    }
  }
  const nearest = all
    .sort((p, q) => p.d - q.d || p.a - q.a || p.q - q.q || p.r - q.r)
    .slice(0, n);
  // Mesafe eşitliklerini yuvarlayarak kesin bir küme seç (kayan nokta gürültüsü olmasın).
  return nearest
    .sort((p, q) => Math.round(p.a * 1e6) - Math.round(q.a * 1e6) || p.d - q.d || p.q - q.q || p.r - q.r)
    .map(({ x, y }) => ({ x, y }));
}

/**
 * 200 hücre: her hücre sınavdaki bir soru. Dersler soru sayılarıyla orantılı
 * dilimler alır (ders sırası konu id sırasıdır), ders içinde konular ortalama
 * soru sayılarıyla orantılı hücre alır.
 */
export function buildHoneycomb(topics: Topic[], total = TOTAL_QUESTIONS): Cell[] {
  const byDers = new Map<string, Topic[]>();
  [...topics]
    .sort((a, b) => a.id - b.id)
    .forEach((t) => byDers.set(t.ders, [...(byDers.get(t.ders) ?? []), t]));

  const dersler = [...byDers.keys()];
  const perDers = apportion(
    dersler.map((d) => byDers.get(d)!.reduce((s, t) => s + t.ortalama_soru, 0)),
    total,
  );

  const owners: { ders: string; topicId: number }[] = [];
  dersler.forEach((ders, di) => {
    const ts = byDers.get(ders)!;
    const perTopic = apportion(
      ts.map((t) => t.ortalama_soru),
      perDers[di],
    );
    ts.forEach((t, ti) => {
      for (let k = 0; k < perTopic[ti]; k++) owners.push({ ders, topicId: t.id });
    });
  });

  return layout(owners.length).map((p, i) => ({ ...p, ...owners[i] }));
}

/** Ders başına ayırt edilebilir renkler, dersler arası komşuluk gözetilerek. */
const PALETTE = [
  "#e5484d", // Anatomi
  "#f76b15", // Fizyoloji
  "#f5c518", // Biyokimya
  "#8bc34a", // Mikrobiyoloji
  "#2eb67d", // Patoloji
  "#12a594", // Farmakoloji
  "#0090ff", // Dahiliye
  "#6e56cf", // Pediatri
  "#d6409f", // Genel Cerrahi
  "#9a6b3f", // Küçük Stajlar
  "#22c3e6", // Kadın Doğum
];

export function dersColors(dersler: string[]): Record<string, string> {
  return Object.fromEntries(dersler.map((d, i) => [d, PALETTE[i % PALETTE.length]]));
}
