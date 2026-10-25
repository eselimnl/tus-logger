import TodayView from "@/components/TodayView";
import { getPlan, getProgress, getTopics } from "@/lib/data";
import { todayStr } from "@/lib/dates";
import { recommendNew } from "@/lib/recommend";
import type { PlanRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLOTS: { slot: PlanRow["slot"]; position: PlanRow["position"] }[] = [
  { slot: "sabah", position: 1 },
  { slot: "sabah", position: 2 },
  { slot: "aksam", position: 1 },
  { slot: "aksam", position: 2 },
];

export default async function Home() {
  const today = todayStr();
  const [topics, progressRows, plan] = await Promise.all([
    getTopics(),
    getProgress(),
    getPlan(today),
  ]);
  const progress = new Map(progressRows.map((p) => [p.topic_id, p]));

  // Bugünün 4 yuvasından boş kalanlara öneri doldur (istemci kaydeder).
  const have = new Set(plan.map((r) => `${r.slot}-${r.position}`));
  const missing = SLOTS.filter((s) => !have.has(`${s.slot}-${s.position}`));
  const suggestions = recommendNew(
    topics,
    progress,
    missing.length,
    plan.map((r) => r.topic_id),
  );
  const newRows: PlanRow[] = missing.slice(0, suggestions.length).map((s, i) => ({
    plan_date: today,
    slot: s.slot,
    position: s.position,
    topic_id: suggestions[i].id,
  }));

  return (
    <TodayView
      today={today}
      topics={topics}
      progress={progressRows}
      plan={[...plan, ...newRows]}
      newRows={newRows}
    />
  );
}
