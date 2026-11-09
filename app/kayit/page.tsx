"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, Notice, PrimaryButton } from "@/components/AuthShell";
import { authErrorMessage, MIN_PASSWORD, passwordError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function KayitPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordError(password, again);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const address = email.trim();
    const { data, error } = await createClient().auth.signUp({ email: address, password });
    if (error) {
      setError(authErrorMessage(error));
      setBusy(false);
      return;
    }
    if (data.session) {
      // E-posta doğrulaması kapalıysa oturum hemen açılır.
      router.replace("/");
      router.refresh();
      return;
    }
    setSentTo(address);
    setBusy(false);
  }

  if (sentTo) {
    return (
      <AuthShell title="E-postanı kontrol et">
        <Notice tone="info">
          {sentTo} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca hesabın açılır ve
          giriş yapmış olursun.
        </Notice>
        <p className="mt-4 text-sm text-muted">
          Gelmediyse spam klasörüne bak. Bu adres daha önce kayıtlıysa yeni e-posta gelmez, bunun yerine{" "}
          <Link href="/login" className="underline">
            giriş yap
          </Link>{" "}
          ya da{" "}
          <Link href="/sifremi-unuttum" className="underline">
            şifreni sıfırla
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Hesap oluştur" subtitle="Konu, tekrar ve soru ilerlemen sana özel tutulur.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="E-posta"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={`Şifre (en az ${MIN_PASSWORD} karakter)`}
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Şifre (tekrar)"
          type="password"
          required
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy}>
          {busy ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-sm text-muted">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="font-medium text-accent">
          Giriş yap
        </Link>
      </p>
    </AuthShell>
  );
}
