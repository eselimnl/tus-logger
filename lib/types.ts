export type Topic = {
  id: number;
  ders: string;
  bolum: string;
  konu: string;
  ortalama_soru: number;
  toplam_6_sinav: number;
  ders_ici_yuzde: number;
  oncelik: "Yüksek" | "Orta" | "Düşük";
  dagilim: Record<string, number>;
};

export const EXAMS = ["2026 Mart", "2025 Ağustos", "2025 Mart", "2024 Ağustos", "2024 Mart", "2023 Eylül"] as const;

export const CHECKPOINTS = ["calisma", "tekrar1", "tekrar2", "tekrar3", "soru1", "soru2"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

export const CHECKPOINT_LABEL: Record<Checkpoint, string> = {
  calisma: "Çalışma",
  tekrar1: "1. Tekrar",
  tekrar2: "2. Tekrar",
  tekrar3: "3. Tekrar",
  soru1: "Soru 1",
  soru2: "Soru 2",
};

export type Progress = {
  topic_id: number;
  calisma_at: string | null;
  tekrar1_at: string | null;
  tekrar2_at: string | null;
  tekrar3_at: string | null;
  soru1_at: string | null;
  soru2_at: string | null;
  note: string;
};

export type PlanRow = {
  plan_date: string;
  slot: "sabah" | "aksam";
  position: 1 | 2;
  topic_id: number;
};

export function emptyProgress(topic_id: number): Progress {
  return {
    topic_id,
    calisma_at: null,
    tekrar1_at: null,
    tekrar2_at: null,
    tekrar3_at: null,
    soru1_at: null,
    soru2_at: null,
    note: "",
  };
}
