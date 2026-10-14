"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SCOPES, scopeFromPath } from "@/lib/chase/scope";

export default function ChaseNav() {
  const pathname = usePathname();
  const scope = SCOPES[scopeFromPath(pathname)];
  const base = scope.basePath;
  const tabs = [
    {
      href: base,
      label: "Explorer",
      active: pathname === base || pathname.startsWith(`${base}/card`),
    },
    {
      href: `${base}/sets`,
      label: scope.key === "reserved" ? "Sets" : "Chase sets",
      active: pathname.startsWith(`${base}/sets`),
    },
  ];
  return (
    <nav
      aria-label={`${scope.title} sections`}
      className="flex gap-1 border-b border-border mb-6"
    >
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={clsx(
            "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
            t.active
              ? "border-accent-gold text-accent-gold"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
