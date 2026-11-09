"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorMessage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Field, Notice, PrimaryButton } from "./AuthShell";

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(authErrorMessage(error));
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthShell title="TUS Takip" subtitle="Günlük konu, tekrar ve soru kaydın.">
      <form onSubmit={onSubmit} className="space-y-4">
        {linkError && (
          <Notice tone="error">
            Bu bağlantı geçersiz ya da süresi dolmuş. Şifre sıfırlama bağlantısını yeniden iste.
          </Notice>
        )}
        <Field
          label="E-posta"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Şifre"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </PrimaryButton>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/sifremi-unuttum" className="text-muted underline">
          Şifremi unuttum
        </Link>
        <Link href="/kayit" className="font-medium text-accent">
          Hesap oluştur
        </Link>
      </div>
    </AuthShell>
  );
}
