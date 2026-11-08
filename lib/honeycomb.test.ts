import { describe, expect, it } from "vitest";
import data from "../data/tus_konular.json";
import { apportion, buildHoneycomb, dersColors } from "./honeycomb";
import type { Topic } from "./types";

const topics = data.dersler.flatMap((d) => d.konular) as unknown as Topic[];
const soruSayisi = new Map(data.dersler.map((d) => [d.ders, d.sinavdaki_soru]));

describe("apportion", () => {
  it("toplamı tam tutturur ve orantıyı korur", () => {
    expect(apportion([1, 1, 1], 10).reduce((a, b) => a + b, 0)).toBe(10);
    expect(apportion([5, 3, 2], 10)).toEqual([5, 3, 2]);
    expect(apportion([0.17, 7.2, 3], 10).reduce((a, b) => a + b, 0)).toBe(10);
  });
});

describe("buildHoneycomb", () => {
  const cells = buildHoneycomb(topics);

  it("tam 200 hücre üretir, hiçbiri üst üste değil", () => {
    expect(cells).toHaveLength(200);
    expect(new Set(cells.map((c) => `${c.x.toFixed(3)},${c.y.toFixed(3)}`)).size).toBe(200);
  });

  it("her ders sınavdaki soru sayısı kadar hücre alır", () => {
    const count = new Map<string, number>();
    cells.forEach((c) => count.set(c.ders, (count.get(c.ders) ?? 0) + 1));
    for (const [ders, n] of soruSayisi) expect(count.get(ders)).toBe(n);
  });

  it("konu hücreleri ortalama soru sayısına en fazla 1 sapmayla orantılı", () => {
    const perTopic = new Map<number, number>();
    cells.forEach((c) => perTopic.set(c.topicId, (perTopic.get(c.topicId) ?? 0) + 1));
    for (const t of topics) {
      expect(Math.abs((perTopic.get(t.id) ?? 0) - t.ortalama_soru)).toBeLessThanOrEqual(1);
    }
  });

  it("tek parça bir petek oluşturur (her hücrenin komşusu var, hepsi bağlı)", () => {
    const near = (a: (typeof cells)[number], b: (typeof cells)[number]) =>
      Math.hypot(a.x - b.x, a.y - b.y) < Math.sqrt(3) * 1.01;
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const i = queue.pop()!;
      cells.forEach((c, j) => {
        if (!seen.has(j) && near(cells[i], c)) {
          seen.add(j);
          queue.push(j);
        }
      });
    }
    expect(seen.size).toBe(200);
  });

  it("her dersin hücreleri bitişik dilim oluşturur (ders sırası bozulmaz)", () => {
    const order = cells.map((c) => c.ders);
    const runs = order.filter((d, i) => i === 0 || order[i - 1] !== d).length;
    expect(runs).toBe(soruSayisi.size);
  });

  it("aynı girdiyle aynı sonucu verir", () => {
    expect(buildHoneycomb(topics)).toEqual(cells);
  });
});

describe("dersColors", () => {
  it("her derse farklı renk verir", () => {
    const colors = dersColors([...soruSayisi.keys()]);
    expect(new Set(Object.values(colors)).size).toBe(soruSayisi.size);
  });
});
