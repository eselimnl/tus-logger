"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorMessage, MIN_PASSWORD, passwordError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Field, Notice, PrimaryButton } from "./AuthShell";

export default function AccountView({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    const problem = passwordError(password, again);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setPassword("");
    setAgain("");
    setDone(true);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Hesap</h1>
      <p className="mt-1 text-sm text-muted">{email}</p>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Şifre değiştir</h2>
        <form onSubmit={changePassword} className="space-y-4">
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
          {done && <Notice tone="info">Şifren güncellendi.</Notice>}
          <PrimaryButton type="submit" busy={busy}>
            {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </PrimaryButton>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Konularım</h2>
        <Link
          href="/baslangic"
          className="block rounded-xl border border-line bg-card px-4 py-3 text-center font-medium"
        >
          Toplu işaretle · konu ekle / düzenle
        </Link>
      </section>

      <section className="mt-8">
        <button
          onClick={signOut}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 font-medium text-foreground"
        >
          Çıkış yap
        </button>
      </section>
    </main>
  );
}
