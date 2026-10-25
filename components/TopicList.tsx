"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Progress, Topic } from "@/lib/types";
import { PowerBadge, StatusDots } from "./Bits";

type Status = "hepsi" | "yeni" | "devam" | "bitti";
type Sort = "power" | "ders";

export default function TopicList({ topics, progress }: { topics: Topic[]; progress: Progress[] }) {
  const prog = useMemo(() => new Map(progress.map((p) => [p.topic_id, p])), [progress]);
  const dersler = useMemo(() => [...new Set(topics.map((t) => t.ders))], [topics]);
  const [ders, setDers] = useState<string>("Tümü");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("hepsi");
  const [sort, setSort] = useState<Sort>("power");

  const list = useMemo(() => {
    const needle = q.toLocaleLowerCase("tr");
    return topics
      .filter((t) => ders === "Tümü" || t.ders === ders)
      .filter((t) => !needle || `${t.ders} ${t.konu}`.toLocaleLowerCase("tr").includes(needle))
      .filter((t) => {
        const p = prog.get(t.id);
        const studied = !!p?.calisma_at;
        const full = !!(p?.tekrar3_at && p?.soru2_at);
        if (status === "yeni") return !studied;
        if (status === "devam") return studied && !full;
        if (status === "bitti") return full;
        return true;
      })
      .sort((a, b) =>
        sort === "power"
          ? b.ortalama_soru - a.ortalama_soru || a.id - b.id
          : a.id - b.id,
      );
  }, [topics, prog, ders, q, status, sort]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm ${
      active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
    }`;

  return (
    <main className="flex-1 px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Konular</h1>
      <p className="mt-1 text-sm text-muted">
        {list.length} / {topics.length} konu
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Konu veya ders ara"
        className="mt-4 w-full rounded-xl border border-line bg-card px-4 py-2.5 outline-none focus:border-accent"
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {["Tümü", ...dersler].map((d) => (
          <button key={d} onClick={() => setDers(d)} className={chip(ders === d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(
          [
            ["hepsi", "Hepsi"],
            ["yeni", "Başlanmadı"],
            ["devam", "Devam"],
            ["bitti", "Tamam"],
          ] as [Status, string][]
        ).map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)} className={chip(status === k)}>
            {label}
          </button>
        ))}
        <button
          onClick={() => setSort(sort === "power" ? "ders" : "power")}
          className="ml-auto text-sm text-muted underline"
        >
          Sıra: {sort === "power" ? "Power" : "Ders"}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {list.map((t) => (
          <li key={t.id}>
            <Link
              href={`/konu/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted">{t.ders}</span>
                <span className="block truncate text-sm font-medium">{t.konu}</span>
                <span className="mt-2 block">
                  <StatusDots progress={prog.get(t.id)} />
                </span>
              </span>
              <PowerBadge topic={t} />
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Bu filtreyle konu yok.
          </li>
        )}
      </ul>
    </main>
  );
}
