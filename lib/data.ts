import { createClient } from "./supabase/server";
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

export async function getCalismaLog(sinceIso: string): Promise<string[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("study_log")
    .select("at")
    .eq("event", "calisma")
    .gte("at", sinceIso);
  if (error) throw new Error(`Kayıt okunamadı: ${error.message}`);
  return (data ?? []).map((r) => r.at as string);
}
