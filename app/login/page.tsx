"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-posta veya şifre hatalı.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-10">
      <p className="text-sm font-medium text-accent">TUS 2027 · 21 Mart</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">TUS Takip</h1>
      <p className="mt-2 text-sm text-muted">Günlük konu, tekrar ve soru kaydın.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm text-muted">E-posta</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Şifre</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-60 dark:text-[#06201c]"
        >
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
    </main>
  );
}
