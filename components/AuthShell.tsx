import type { InputHTMLAttributes, ReactNode } from "react";
import { EXAM_LABEL } from "@/lib/dates";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-10">
      <p className="text-sm font-medium text-accent">TUS · {EXAM_LABEL}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
      />
    </label>
  );
}

export function PrimaryButton({
  busy,
  children,
  ...props
}: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-60 dark:text-[#06201c]"
    >
      {children}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "error" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
      }`}
    >
      {children}
    </p>
  );
}
