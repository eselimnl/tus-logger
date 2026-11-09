import AccountView from "@/components/AccountView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HesapPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return <AccountView email={user?.email ?? ""} />;
}
