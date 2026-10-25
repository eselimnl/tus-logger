import { notFound } from "next/navigation";
import TopicDetail from "@/components/TopicDetail";
import { getProgress, getTopics } from "@/lib/data";
import { emptyProgress } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KonuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  const [topics, progress] = await Promise.all([getTopics(), getProgress()]);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) notFound();
  const p = progress.find((x) => x.topic_id === topicId) ?? emptyProgress(topicId);
  return <TopicDetail topic={topic} progress={p} />;
}
