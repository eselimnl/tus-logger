import { createClient } from "./supabase/server";
import { clampSettings, DEFAULT_SETTINGS, type PlanSettings } from "./plan";
import type { PlanRow, Progress, Topic } from "./types";

export async function getTopics(): Promise<Topic[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("topics").select("*").order("id");
  if (error) throw new Error(`Konular okunamadı: ${error.message}`);
  return (data ?? []).map((t) => ({
    ...t,
    ortalama_soru: Number(t.ortalama_soru),
    ders_ici_yuzde: Number(t.ders_ici_yuzde),
  })) as Topic[];
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
