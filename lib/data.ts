import { createClient } from "./supabase/server";
import { clampSettings, DEFAULT_SETTINGS, type PlanSettings } from "./plan";
import type { PlanRow, Progress, Topic } from "./types";

const missingTable = (e: { code?: string } | null) => e?.code === "PGRST205" || e?.code === "42P01";

type Edit = { topic_id: number; konu: string | null; hidden: boolean };

/** Ortak konular + kullanıcının düzenlemeleri (ad, gizleme) + kendi eklediği konular. */
export async function getTopics(opts: { includeHidden?: boolean } = {}): Promise<Topic[]> {
  const sb = await createClient();
  const [base, custom, edits] = await Promise.all([
    sb.from("topics").select("*").order("id"),
    sb.from("custom_topics").select("id,ders,bolum,konu").order("id"),
    sb.from("topic_edits").select("topic_id,konu,hidden"),
  ]);
  if (base.error) throw new Error(`Konular okunamadı: ${base.error.message}`);
  // Migration (0004) henüz çalışmadıysa yalnızca ortak konular döner.
  if (custom.error && !missingTable(custom.error)) throw new Error(`Konular okunamadı: ${custom.error.message}`);
  if (edits.error && !missingTable(edits.error)) throw new Error(`Konular okunamadı: ${edits.error.message}`);

  const byId = new Map(((edits.data ?? []) as Edit[]).map((e) => [e.topic_id, e]));
  const out: Topic[] = [];
  for (const t of base.data ?? []) {
    const e = byId.get(t.id);
    if (e?.hidden && !opts.includeHidden) continue;
    out.push({
      ...t,
      konu: e?.konu ?? t.konu,
      ...(e?.konu && e.konu !== t.konu ? { original: t.konu as string } : {}),
      ortalama_soru: Number(t.ortalama_soru),
      ders_ici_yuzde: Number(t.ders_ici_yuzde),
      ...(e?.hidden ? { hidden: true } : {}),
    } as Topic);
  }
  for (const c of custom.data ?? []) {
    out.push({
      id: c.id,
      ders: c.ders,
      bolum: c.bolum,
      konu: c.konu,
      ortalama_soru: 1,
      toplam_6_sinav: 0,
      ders_ici_yuzde: 0,
      oncelik: "Düşük",
      dagilim: {},
      custom: true,
    });
  }
  return out.sort((a, b) => a.id - b.id);
}

/** İlk giriş karşılaması tamamlandı mı? Tablo/sütun yoksa (migration çalışmadı) tamamlandı sayılır. */
export async function getOnboarded(): Promise<boolean> {
  const sb = await createClient();
  const { data, error } = await sb.from("plan_settings").select("onboarded").maybeSingle();
  if (error) return true;
  return !!data?.onboarded;
}

export async function getProgress(): Promise<Progress[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("progress").select("*");
  if (error) throw new Error(`İlerleme okunamadı: ${error.message}`);
  return (data ?? []) as Progress[];
}

export async function getPlan(date: string): Promise<PlanRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("daily_plan").select("*").eq("plan_date", date);
  if (error) throw new Error(`Plan okunamadı: ${error.message}`);
  return (data ?? []) as PlanRow[];
}

/** Kullanıcının plan ayarları; kayıt yoksa (ya da 0003 migration'ı henüz çalışmadıysa) varsayılanlar. */
export async function getSettings(): Promise<PlanSettings> {
  const sb = await createClient();
  const { data, error } = await sb.from("plan_settings").select("*").maybeSingle();
  if (error) {
    const missingTable = error.code === "PGRST205" || error.code === "42P01";
    if (missingTable) return DEFAULT_SETTINGS;
    throw new Error(`Plan ayarları okunamadı: ${error.message}`);
  }
  return clampSettings(data);
}

/** `sinceIso`'dan beri yapılan tüm işaretlemeler (haftalık grafik ve gerçek tempo için). */
export async function getEventLog(sinceIso: string): Promise<{ at: string; event: string }[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("study_log").select("at,event").gte("at", sinceIso);
  if (error) throw new Error(`Kayıt okunamadı: ${error.message}`);
  return (data ?? []) as { at: string; event: string }[];
}
