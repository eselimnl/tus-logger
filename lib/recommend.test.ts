import { describe, expect, it } from "vitest";
import { dueReviews, recommendNew } from "./recommend";
import { emptyProgress, type Progress, type Topic } from "./types";

const mk = (id: number, ders: string, ort: number): Topic => ({
  id,
  ders,
  bolum: "Temel Bilimler",
  konu: `Konu ${id}`,
  ortalama_soru: ort,
  toplam_6_sinav: ort * 6,
  ders_ici_yuzde: 10,
  oncelik: ort >= 3 ? "Yüksek" : ort >= 1.5 ? "Orta" : "Düşük",
  dagilim: {},
});

const topics = [
  mk(1, "Biyokimya", 7),
  mk(2, "Biyokimya", 6),
  mk(3, "Mikrobiyoloji", 6.3),
  mk(4, "Genel Cerrahi", 5.3),
  mk(5, "Farmakoloji", 4.5),
  mk(6, "Anatomi", 3.8),
];

describe("recommendNew", () => {
  it("4 konu döner ve önce farklı derslerden power sırasıyla seçer", () => {
    const r = recommendNew(topics, new Map());
    expect(r).toHaveLength(4);
    expect(r.map((t) => t.id)).toEqual([1, 3, 4, 5]);
    expect(new Set(r.map((t) => t.ders)).size).toBe(4);
  });

  it("çalışılmış konuları atlar", () => {
    const p = new Map<number, Progress>([[1, { ...emptyProgress(1), calisma_at: "2026-10-20T08:00:00Z" }]]);
    const r = recommendNew(topics, p);
    expect(r.find((t) => t.id === 1)).toBeUndefined();
    expect(r[0].id).toBe(3);
  });

  it("farklı ders yetmezse aynı dersten doldurur", () => {
    const few = [mk(1, "A", 5), mk(2, "A", 4), mk(3, "A", 3)];
    expect(recommendNew(few, new Map(), 3).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("hariç tutulan id'leri önermez", () => {
    const r = recommendNew(topics, new Map(), 4, [1, 3]);
    expect(r.map((t) => t.id)).not.toContain(1);
    expect(r.map((t) => t.id)).not.toContain(3);
  });
});

describe("dueReviews", () => {
  const studied = (id: number, at: string, extra: Partial<Progress> = {}): [number, Progress] => [
    id,
    { ...emptyProgress(id), calisma_at: at, ...extra },
  ];

  it("1. tekrar çalışmadan 1 gün sonra gelir", () => {
    const p = new Map([studied(1, "2026-10-20T08:00:00Z")]);
    expect(dueReviews(topics, p, "2026-10-20")).toHaveLength(0);
    const due = dueReviews(topics, p, "2026-10-21");
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ which: 1, overdueDays: 0 });
  });

  it("2. tekrar 1. tekrar yapılınca ve 7. günde gelir", () => {
    const p = new Map([studied(1, "2026-10-01T08:00:00Z", { tekrar1_at: "2026-10-02T08:00:00Z" })]);
    expect(dueReviews(topics, p, "2026-10-07")).toHaveLength(0);
    expect(dueReviews(topics, p, "2026-10-08")[0].which).toBe(2);
  });

  it("3 tekrar da bitince listeden çıkar ve gecikme sıralaması çalışır", () => {
    const p = new Map([
      studied(1, "2026-09-01T08:00:00Z", {
        tekrar1_at: "x", tekrar2_at: "x", tekrar3_at: "x",
      }),
      studied(2, "2026-10-10T08:00:00Z"),
      studied(3, "2026-10-18T08:00:00Z"),
    ]);
    const due = dueReviews(topics, p, "2026-10-24");
    expect(due.map((d) => d.topic.id)).toEqual([2, 3]);
  });
});
