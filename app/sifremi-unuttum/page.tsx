"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell, Field, Notice, PrimaryButton } from "@/components/AuthShell";
import { authErrorMessage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    // Adres kayıtlı olsun olmasın aynı mesaj: hesap varlığı dışarıya sızmasın.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="E-postanı kontrol et">
        <Notice tone="info">
          Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderdik. Bağlantı sınırlı süre geçerli.
        </Notice>
        <p className="mt-4 text-sm text-muted">
          Gelmediyse spam klasörüne bak ve birkaç dakika bekle.{" "}
          <Link href="/login" className="underline">
            Girişe dön
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Şifremi unuttum" subtitle="E-posta adresini yaz, sıfırlama bağlantısı gönderelim.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="E-posta"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy}>
          {busy ? "Gönderiliyor…" : "Bağlantı gönder"}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-muted underline">
          Girişe dön
        </Link>
      </p>
    </AuthShell>
  );
}
