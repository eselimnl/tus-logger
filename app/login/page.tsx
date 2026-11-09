import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ bilgi?: string }>;
}) {
  const { bilgi } = await searchParams;
  return <LoginForm linkError={bilgi === "baglanti-gecersiz"} />;
}
