"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Bugün" },
  { href: "/konular", label: "Konular" },
  { href: "/ilerleme", label: "İlerleme" },
  { href: "/plan", label: "Plan" },
  { href: "/hesap", label: "Hesap" },
];

// Giriş yapmadan görülen sayfalarda gezinme çubuğu gösterilmez.
const HIDDEN_ON = ["/login", "/kayit", "/sifremi-unuttum", "/auth", "/baslangic"];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-3.5 text-center text-sm font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
