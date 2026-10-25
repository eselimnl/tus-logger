import TopicList from "@/components/TopicList";
import { getProgress, getTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function KonularPage() {
  const [topics, progress] = await Promise.all([getTopics(), getProgress()]);
  return <TopicList topics={topics} progress={progress} />;
}
