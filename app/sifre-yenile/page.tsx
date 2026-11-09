"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, Notice, PrimaryButton } from "@/components/AuthShell";
import { authErrorMessage, MIN_PASSWORD, passwordError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function SifreYenilePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordError(password, again);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(authErrorMessage(error));
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthShell title="Yeni şifre belirle" subtitle="Bağlantı doğrulandı. Yeni şifreni yaz.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label={`Yeni şifre (en az ${MIN_PASSWORD} karakter)`}
          type="password"
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Yeni şifre (tekrar)"
          type="password"
          required
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <PrimaryButton type="submit" busy={busy}>
          {busy ? "Kaydediliyor…" : "Şifreyi kaydet"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
