import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSettings } from "./plan";
import type { Checkpoint, PlanRow } from "./types";

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
