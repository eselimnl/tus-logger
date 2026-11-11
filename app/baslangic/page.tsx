import OnboardingView from "@/components/OnboardingView";
import { getProgress, getSettings, getTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BaslangicPage() {
  const [topics, progress, settings] = await Promise.all([
    getTopics({ includeHidden: true }),
    getProgress(),
    getSettings(),
  ]);
  return <OnboardingView topics={topics} progress={progress} settings={settings} />;
}
