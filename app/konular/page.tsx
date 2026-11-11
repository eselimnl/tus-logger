import TopicList from "@/components/TopicList";
import { getProgress, getSettings, getTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function KonularPage() {
  const [topics, progress, settings] = await Promise.all([getTopics(), getProgress(), getSettings()]);
  return <TopicList topics={topics} progress={progress} settings={settings} />;
}
