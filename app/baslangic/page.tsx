import OnboardingView from "@/components/OnboardingView";
import { getProgress, getTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BaslangicPage() {
  const [topics, progress] = await Promise.all([getTopics({ includeHidden: true }), getProgress()]);
  return <OnboardingView topics={topics} progress={progress} />;
}
