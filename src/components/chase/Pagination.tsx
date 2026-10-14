import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface PaginationProps {
  page: number;
  pages: number;
  /** Builds the href for a given page number. */
  hrefFor: (page: number) => string;
}

function pageWindow(page: number, pages: number): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  const show = new Set([1, pages, page - 1, page, page + 1]);
  let prev = 0;
  for (let p = 1; p <= pages; p++) {
    if (!show.has(p)) continue;
    if (p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pagination({ page, pages, hrefFor }: PaginationProps) {
  if (pages <= 1) return null;
  const btn =
    "min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-lg border text-sm transition-colors";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 py-6">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className={clsx(btn, "border-border text-text-secondary hover:text-accent-gold")}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span className={clsx(btn, "border-border/40 text-text-muted")}>
          <ChevronLeft className="w-4 h-4" />
        </span>
      )}
      {pageWindow(page, pages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx(
              btn,
              p === page
                ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
                : "border-border text-text-secondary hover:text-accent-gold"
            )}
          >
            {p}
          </Link>
        )
      )}
      {page < pages ? (
        <Link
          href={hrefFor(page + 1)}
          className={clsx(btn, "border-border text-text-secondary hover:text-accent-gold")}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className={clsx(btn, "border-border/40 text-text-muted")}>
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}
