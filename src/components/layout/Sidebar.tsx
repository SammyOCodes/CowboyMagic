"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Library, Home, MessageCircle } from "lucide-react";
import clsx from "clsx";

const sidebarLinks = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/search", label: "Card Search", icon: MessageCircle },
  { href: "/decks", label: "My Decks", icon: Library },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-56 bg-bg-secondary border-r border-border shrink-0 flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-2">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-bg-surface text-accent-gold border border-border-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm font-medium">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
