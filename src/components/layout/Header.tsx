"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Card Search" },
  { href: "/decks", label: "My Decks" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-bg-secondary border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
      <Link href="/" className="flex items-center gap-3 group">
        <Sparkles className="w-7 h-7 text-accent-gold group-hover:text-accent-orange transition-colors" />
        <h1 className="font-display text-2xl text-accent-gold tracking-wide">
          CowboyMagic
        </h1>
      </Link>
      <nav className="flex gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === link.href
                ? "bg-bg-surface text-accent-gold"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
