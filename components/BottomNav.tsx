"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Bugün" },
  { href: "/konular", label: "Konular" },
  { href: "/ilerleme", label: "İlerleme" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 pb-[env(safe-area-inset-bottom)]">
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
