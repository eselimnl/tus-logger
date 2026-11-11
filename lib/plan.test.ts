import { describe, expect, it } from "vitest";
import {
  buildAdvice,
  clampSettings,
  completionSteps,
  computeWork,
  DEFAULT_SETTINGS,
  durationLabel,
  project,
  stepsFor,
  summarize,
  type PlanSettings,
} from "./plan";
import { emptyProgress, type Progress } from "./types";

const N = 137;
const S = (over: Partial<PlanSettings> = {}): PlanSettings => ({ ...DEFAULT_SETTINGS, ...over });
const fresh = (s = S()) => computeWork(N, [], s);
const day = (iso = "2026-11-10T08:00:00Z") => iso;

describe("clampSettings", () => {
  it("sınırlara çeker, geçersizde varsayılana döner", () => {
    expect(clampSettings({ tekrar_count: 99, soru_count: -2, daily_goal: 0, days_per_week: 12 })).toEqual({
      tekrar_count: 5,
      soru_count: 0,
      daily_goal: 1,
      soru_share: null,
      days_per_week: 7,
    });
    expect(clampSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(clampSettings({ tekrar_count: Number.NaN }).tekrar_count).toBe(3);
    expect(clampSettings({ soru_share: 140 }).soru_share).toBe(100);
  });
});

describe("adımlar", () => {
  it("ayara göre adım listesi üretir", () => {
    expect(stepsFor(S({ tekrar_count: 2, soru_count: 1 }))).toEqual(["calisma", "tekrar1", "tekrar2", "soru1"]);
    expect(completionSteps(S())).toEqual(["tekrar1", "tekrar2", "tekrar3", "soru1", "soru2"]);
    expect(completionSteps(S({ tekrar_count: 0, soru_count: 0 }))).toEqual([]);
  });
});

describe("computeWork", () => {
  it("toplamı ve yapılanı ayardaki adımlarla sayar", () => {
    const p: Progress = { ...emptyProgress(1), calisma_at: day(), tekrar1_at: day(), tekrar4_at: day(), soru1_at: day() };
    const w = computeWork(3, [p], S());
    expect(w).toEqual({ konuTotal: 12, konuDone: 2, soruTotal: 6, soruDone: 1 }); // tekrar4 ayarda yok, sayılmaz
    expect(computeWork(3, [p], S({ tekrar_count: 4 })).konuDone).toBe(3);
  });
});

describe("summarize (sıfırdan, 137 konu, 3 tekrar + 2 soru, günde 4)", () => {
  const w = fresh();
  const sum = summarize(w, S(), { examDays: 139 });

  it("iş yükü 822 birim", () => {
    expect(w).toEqual({ konuTotal: 548, konuDone: 0, soruTotal: 274, soruDone: 0 });
    expect(sum.total).toBe(822);
    expect(sum.remaining).toBe(822);
  });

  it("günde 4 birimle 206 günde biter ve sınav gününe %67-68 olur", () => {
    expect(sum.finishDays.birlesik).toBe(206);
    expect(sum.atExam.birlesik).toBeCloseTo((100 * 556) / 822, 1);
  });

  it("sınava yetişmek için günde 6 birim gerekir", () => {
    expect(sum.neededGoal).toBe(6);
    expect(sum.neededGoalBuffer).toBe(7); // 822 / 125 gün = 6,58
  });

  it("otomatik payda iki hat aynı gün biter", () => {
    expect(Math.abs(sum.finishDays.konu! - sum.finishDays.soru!)).toBeLessThanOrEqual(1);
    expect(sum.autoSoruShare).toBe(33);
  });
});

describe("tempo ve ayar etkileri", () => {
  it("haftada 5 gün çalışmak süreyi uzatır", () => {
    const s7 = summarize(fresh(), S(), { examDays: 139 }).finishDays.birlesik!;
    const s5 = summarize(fresh(), S({ days_per_week: 5 }), { examDays: 139 }).finishDays.birlesik!;
    expect(s5).toBe(Math.ceil(822 / ((4 * 5) / 7)));
    expect(s5).toBeGreaterThan(s7);
  });

  it("tekrar sayısı azalınca iş yükü ve süre azalır", () => {
    const s = S({ tekrar_count: 1 });
    const sum = summarize(computeWork(N, [], s), s, { examDays: 139 });
    expect(sum.total).toBe(137 * 4);
    expect(sum.finishDays.birlesik).toBe(137);
  });

  it("elle soru payı: bir hat erken biter, kapasite diğerine geçer, toplam süre değişmez", () => {
    const s = S({ soru_share: 100 });
    const sum = summarize(fresh(s), s, { examDays: 139 });
    expect(sum.finishDays.soru).toBe(69); // 274 / 4
    expect(sum.finishDays.konu).toBe(206);
    expect(sum.finishDays.birlesik).toBe(206);
    expect(sum.pct.soru).toBe(0);
  });

  it("günlük hedef 0 ise (perDay 0) hiç bitmez", () => {
    const sum = summarize(fresh(), S(), { examDays: 139, perDay: 0 });
    expect(sum.finishDays.birlesik).toBeNull();
    expect(sum.atExam.birlesik).toBe(0);
  });

  it("gerçek tempo (perDay) hedefi geçersiz kılar", () => {
    const sum = summarize(fresh(), S(), { examDays: 139, perDay: 2 });
    expect(sum.finishDays.birlesik).toBe(411);
    expect(sum.atExam.birlesik).toBeCloseTo((100 * 278) / 822, 1);
  });

  it("soru turu 0 ise soru hattı tamam sayılır", () => {
    const s = S({ soru_count: 0 });
    const w = computeWork(N, [], s);
    const sum = summarize(w, s, { examDays: 139 });
    expect(w.soruTotal).toBe(0);
    expect(sum.pct.soru).toBe(100);
    expect(sum.finishDays.soru).toBe(0);
    expect(sum.finishDays.birlesik).toBe(137);
  });

  it("sınav günü geçmişse güncel durumu gösterir", () => {
    const sum = summarize(fresh(), S(), { examDays: -3 });
    expect(sum.atExam.birlesik).toBe(0);
    expect(sum.neededGoal).toBe(822); // 1 güne sığdırmak
  });
});

describe("project", () => {
  it("birikim azalmaz, toplamı aşmaz", () => {
    const w = fresh();
    const pr = project(w, S(), 4);
    for (let i = 1; i < pr.konu.length; i++) {
      expect(pr.konu[i]).toBeGreaterThanOrEqual(pr.konu[i - 1]);
      expect(pr.soru[i]).toBeGreaterThanOrEqual(pr.soru[i - 1]);
    }
    expect(pr.konu.at(-1)).toBe(w.konuTotal);
    expect(pr.soru.at(-1)).toBe(w.soruTotal);
  });

  it("mevcut ilerlemeden devam eder", () => {
    const rows = Array.from({ length: 50 }, (_, i): Progress => ({ ...emptyProgress(i + 1), calisma_at: day() }));
    const w = computeWork(N, rows, S());
    expect(w.konuDone).toBe(50);
    const sum = summarize(w, S(), { examDays: 139 });
    expect(sum.done).toBe(50);
    expect(sum.pct.birlesik).toBeCloseTo((100 * 50) / 822, 1);
    expect(sum.finishDays.birlesik).toBe(Math.ceil((822 - 50) / 4));
  });
});

describe("buildAdvice", () => {
  const today = "2026-11-10";
  it("yetişmiyorsa gereken hedefi söyler", () => {
    const sum = summarize(fresh(), S(), { examDays: 139 });
    const a = buildAdvice(sum, S(), today, N, null, null);
    expect(a[0].tone).toBe("warn");
    expect(a[0].text).toMatch(/günde en az 6 birim/);
  });

  it("yetişiyorsa bitiş tarihini ve tamponu söyler", () => {
    const s = S({ daily_goal: 6 });
    const sum = summarize(fresh(s), s, { examDays: 139 });
    const a = buildAdvice(sum, s, today, N, null, null);
    expect(a[0].tone).toBe("good");
    expect(a[0].text).toMatch(/sınavdan \d+ gün önce/);
  });

  it("gerçek tempoyu ve soru payı dengesizliğini önerir", () => {
    const s = S({ soru_share: 100 });
    const sum = summarize(fresh(s), s, { examDays: 139 });
    const act = summarize(fresh(s), s, { examDays: 139, perDay: 2 });
    const a = buildAdvice(sum, s, today, N, act, 2);
    expect(a.some((x) => /Son 14 günde günde ortalama 2,0 birim/.test(x.text))).toBe(true);
    expect(a.some((x) => /Otomatik/.test(x.text))).toBe(true);
  });

  it("her şey bitmişse tek mesaj döner", () => {
    const w = { konuTotal: 10, konuDone: 10, soruTotal: 4, soruDone: 4 };
    const sum = summarize(w, S(), { examDays: 100 });
    expect(buildAdvice(sum, S(), today, N, null, null)).toHaveLength(1);
  });
});

describe("durationLabel", () => {
  it("gün, hafta ve ay verir", () => {
    expect(durationLabel(206)).toBe("206 gün · ~29 hafta · ~6,8 ay");
  });
});
