// Kullanım: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
// Konuları data/tus_konular.json dosyasından topics tablosuna yazar (tekrar çalıştırılabilir).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const data = JSON.parse(readFileSync(new URL("../data/tus_konular.json", import.meta.url), "utf-8"));
const rows = data.dersler.flatMap((d) =>
  d.konular.map((t) => ({
    id: t.id,
    ders: t.ders,
    bolum: t.bolum,
    konu: t.konu,
    ortalama_soru: t.ortalama_soru,
    toplam_6_sinav: t.toplam_6_sinav,
    ders_ici_yuzde: t.ders_ici_yuzde,
    oncelik: t.oncelik,
    dagilim: t.dagilim,
  })),
);

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { error } = await supabase.from("topics").upsert(rows, { onConflict: "id" });
if (error) {
  console.error("Seed hatası:", error.message);
  process.exit(1);
}
const { count } = await supabase.from("topics").select("*", { count: "exact", head: true });
console.log(`Yüklendi: ${rows.length} konu, tabloda toplam ${count}.`);
