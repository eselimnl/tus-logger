import PlanEditor from "@/components/PlanEditor";
import { getEventLog, getProgress, getSettings, getTopics } from "@/lib/data";
import { addDays, daysToExam, todayStr } from "@/lib/dates";
import { actualPerDay } from "@/lib/pace";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const today = todayStr();
  const [topics, progress, settings, log] = await Promise.all([
    getTopics(),
    getProgress(),
    getSettings(),
    getEventLog(new Date(addDays(today, -14) + "T00:00:00+03:00").toISOString()),
  ]);
  return (
    <PlanEditor
      today={today}
      examDays={daysToExam(today)}
      topicCount={topics.length}
      weights={Object.fromEntries(topics.map((t) => [t.id, t.ortalama_soru]))}
      progress={progress}
      saved={settings}
      actualPerDay={actualPerDay(log)}
    />
  );
}
