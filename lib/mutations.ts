import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSettings } from "./plan";
import { CUSTOM_ID_START, type Checkpoint, type PlanRow, type Topic } from "./types";

async function uid(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Oturum bulunamadı, tekrar giriş yap.");
  return id;
}

/** Bir kutuyu işaretler (şimdi tarihiyle) ya da geri alır. Yeni değeri döner. */
export async function setCheckpoint(
  sb: SupabaseClient,
  topicId: number,
  cp: Checkpoint,
  on: boolean,
): Promise<string | null> {
  const user_id = await uid(sb);
  const at = on ? new Date().toISOString() : null;
  const { error } = await sb
    .from("progress")
    .upsert(
      { user_id, topic_id: topicId, [`${cp}_at`]: at, updated_at: new Date().toISOString() },
      { onConflict: "user_id,topic_id" },
    );
  if (error) throw new Error(error.message);

  if (on) {
    const { error: e2 } = await sb.from("study_log").insert({ user_id, topic_id: topicId, event: cp });
    if (e2) throw new Error(e2.message);
  } else {
    const { error: e3 } = await sb
      .from("study_log")
      .delete()
      .eq("user_id", user_id)
      .eq("topic_id", topicId)
      .eq("event", cp);
    if (e3) throw new Error(e3.message);
  }
  return at;
}

export async function saveNote(sb: SupabaseClient, topicId: number, note: string): Promise<void> {
  const user_id = await uid(sb);
  const { error } = await sb
    .from("progress")
    .upsert(
      { user_id, topic_id: topicId, note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,topic_id" },
    );
  if (error) throw new Error(error.message);
}

export async function saveSettings(sb: SupabaseClient, s: PlanSettings): Promise<void> {
  const user_id = await uid(sb);
  const { error } = await sb
    .from("plan_settings")
    .upsert({ user_id, ...s, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    throw new Error(
      missing
        ? "Plan tablosu henüz yok. Supabase SQL Editor'da 0003_plan.sql dosyasını çalıştır."
        : error.message,
    );
  }
}

export async function upsertPlanRows(sb: SupabaseClient, rows: PlanRow[]): Promise<void> {
  if (rows.length === 0) return;
  const user_id = await uid(sb);
  const { error } = await sb
    .from("daily_plan")
    .upsert(
      rows.map((r) => ({ ...r, user_id })),
      { onConflict: "user_id,plan_date,slot,position" },
    );
  if (error) throw new Error(error.message);
}

const missing = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01" || e.code === "42703";
const MIGRATION_MSG = "Bu özellik için Supabase SQL Editor'da 0004_onboarding.sql dosyasını bir kez çalıştır.";
const fail = (e: { code?: string; message: string }) => new Error(missing(e) ? MIGRATION_MSG : e.message);

/** Toplu işaretleme: yalnızca progress tablosuna yazar, günlük kayıt (study_log) tutmaz ki geçmiş çalışma "bugünkü tempo"yu şişirmesin. */
export async function bulkMark(
  sb: SupabaseClient,
  changes: { topicId: number; calisma?: boolean; soru?: boolean }[],
): Promise<void> {
  if (changes.length === 0) return;
  const user_id = await uid(sb);
  const now = new Date().toISOString();
  const rows = changes.map((c) => ({
    user_id,
    topic_id: c.topicId,
    ...(c.calisma !== undefined ? { calisma_at: c.calisma ? now : null } : {}),
    ...(c.soru !== undefined ? { soru1_at: c.soru ? now : null } : {}),
    updated_at: now,
  }));
  // Aynı sütun kümesine sahip satırları birlikte gönder (upsert yalnızca verilen sütunları günceller).
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = Object.keys(r).sort().join(",");
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const g of groups.values()) {
    const { error } = await sb.from("progress").upsert(g, { onConflict: "user_id,topic_id" });
    if (error) throw new Error(error.message);
  }
}

export async function markOnboarded(sb: SupabaseClient): Promise<void> {
  const user_id = await uid(sb);
  const { error } = await sb
    .from("plan_settings")
    .upsert({ user_id, onboarded: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw fail(error);
}

export async function renameTopic(sb: SupabaseClient, topic: Topic, konu: string): Promise<void> {
  const name = konu.trim();
  if (!name) throw new Error("Konu adı boş olamaz.");
  if (topic.custom) {
    const { error } = await sb.from("custom_topics").update({ konu: name }).eq("id", topic.id);
    if (error) throw fail(error);
    return;
  }
  const user_id = await uid(sb);
  const { error } = await sb
    .from("topic_edits")
    .upsert({ user_id, topic_id: topic.id, konu: name }, { onConflict: "user_id,topic_id" });
  if (error) throw fail(error);
}

/** Ortak konu gizlenir (geri getirilebilir); kendi eklediğin konu silinir. */
export async function removeTopic(sb: SupabaseClient, topic: Topic): Promise<void> {
  if (topic.custom || topic.id >= CUSTOM_ID_START) {
    const { error } = await sb.from("custom_topics").delete().eq("id", topic.id);
    if (error) throw fail(error);
    await sb.from("progress").delete().eq("topic_id", topic.id);
    return;
  }
  const user_id = await uid(sb);
  const { error } = await sb
    .from("topic_edits")
    .upsert({ user_id, topic_id: topic.id, hidden: true }, { onConflict: "user_id,topic_id" });
  if (error) throw fail(error);
}

export async function restoreTopic(sb: SupabaseClient, topicId: number): Promise<void> {
  const user_id = await uid(sb);
  const { error } = await sb
    .from("topic_edits")
    .upsert({ user_id, topic_id: topicId, hidden: false }, { onConflict: "user_id,topic_id" });
  if (error) throw fail(error);
}

export async function addTopic(sb: SupabaseClient, ders: string, bolum: string, konu: string): Promise<Topic> {
  const name = konu.trim();
  if (!name) throw new Error("Konu adı boş olamaz.");
  const user_id = await uid(sb);
  const { data, error } = await sb
    .from("custom_topics")
    .insert({ user_id, ders, bolum, konu: name })
    .select("id,ders,bolum,konu")
    .single();
  if (error) throw fail(error);
  return {
    id: data.id,
    ders: data.ders,
    bolum: data.bolum,
    konu: data.konu,
    ortalama_soru: 1,
    toplam_6_sinav: 0,
    ders_ici_yuzde: 0,
    oncelik: "Düşük",
    dagilim: {},
    custom: true,
  };
}
