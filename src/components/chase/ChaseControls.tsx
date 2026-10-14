"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  LayoutGrid,
  Loader2,
  SlidersHorizontal,
  Table as TableIcon,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  CARD_TYPES,
  SORT_OPTIONS,
  defaultFilters,
  filtersToParams,
  parseFilters,
  type Filters,
  type SortKey,
} from "@/lib/chase/filters";
import { treatmentLabel } from "@/lib/chase/config";
import { currencySymbol, type Currency } from "@/lib/chase/markets";
import { scopeFromPath, type Scope } from "@/lib/chase/scope";
import type { Facets } from "@/lib/chase/queries";

function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const scope = scopeFromPath(pathname);
  const filters = useMemo(
    () => parseFilters(Object.fromEntries(params.entries()), scope),
    [params, scope]
  );
  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next: Filters = { ...filters, ...patch };
      if (!("page" in patch)) next.page = 1;
      const qs = filtersToParams(next, scope).toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filters, pathname, router, scope]
  );
  return { filters, update, pending, scope };
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Text input that commits to the URL after a short pause, without fighting the user's typing. */
function DebouncedInput({
  value,
  onCommit,
  ...props
}: {
  value: string;
  onCommit: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  // `draft` holds what the user has typed until the URL catches up; null means
  // "show the URL's value", so external changes (Reset, back/forward) flow through.
  const [draft, setDraft] = useState<string | null>(null);
  const lastCommitted = useRef<string | null>(null);
  if (draft !== null && draft === value) setDraft(null);

  useEffect(() => {
    if (draft === null) {
      lastCommitted.current = null;
      return;
    }
    if (draft === lastCommitted.current) return;
    const t = setTimeout(() => {
      lastCommitted.current = draft;
      onCommit(draft);
    }, 350);
    return () => clearTimeout(t);
  }, [draft, onCommit]);

  return (
    <input {...props} value={draft ?? value} onChange={(e) => setDraft(e.target.value)} />
  );
}

const inputClass =
  "w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-gold/60";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
          : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

const COLORS: { key: string; label: string; bg: string }[] = [
  { key: "W", label: "White", bg: "#f8f6d8" },
  { key: "U", label: "Blue", bg: "#aae0fa" },
  { key: "B", label: "Black", bg: "#cbc2bf" },
  { key: "R", label: "Red", bg: "#f9aa8f" },
  { key: "G", label: "Green", bg: "#9bd3ae" },
  { key: "C", label: "Colorless", bg: "#d6d3d1" },
];

const FINISH_LABELS: Record<string, string> = {
  nonfoil: "Non-foil",
  foil: "Foil",
  etched: "Etched",
};

const PRICE_PRESETS: Record<Scope, number[]> = {
  chase: [10, 25, 50, 100, 250, 1000],
  reserved: [25, 100, 500, 1000, 5000, 10000],
};

export function ChaseFilters({ facets, currency }: { facets: Facets; currency: Currency }) {
  const { filters, update, pending, scope } = useFilterState();
  const symbol = currencySymbol(currency);
  const [open, setOpen] = useState(false);
  const [setQuery, setSetQuery] = useState("");

  const activeCount =
    (filters.q ? 1 : 0) +
    filters.sets.length +
    filters.treatments.length +
    filters.rarities.length +
    filters.colors.length +
    filters.finishes.length +
    filters.types.length +
    (filters.min !== null ? 1 : 0) +
    (filters.max !== null ? 1 : 0) +
    (filters.chg ? 1 : 0) +
    (filters.unpriced ? 1 : 0);

  const visibleSets = useMemo(() => {
    const q = setQuery.trim().toLowerCase();
    const selected = new Set(filters.sets);
    const matches = facets.sets.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.code.includes(q)
    );
    return [
      ...matches.filter((s) => selected.has(s.code)),
      ...matches.filter((s) => !selected.has(s.code)),
    ].slice(0, 80);
  }, [facets.sets, filters.sets, setQuery]);

  const setNumber = (key: "min" | "max") => (v: string) => {
    const n = v.trim() === "" ? null : Number(v);
    update({ [key]: n !== null && Number.isFinite(n) ? n : null });
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-accent-gold" />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </span>
        {pending && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
      </button>

      <div className={clsx("p-4 space-y-5", open ? "block" : "hidden lg:block")}>
        <div className="hidden lg:flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <SlidersHorizontal className="w-4 h-4 text-accent-gold" />
            Filters
          </h2>
          <div className="flex items-center gap-2">
            {pending && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  update({
                    ...defaultFilters(scope),
                    market: filters.market,
                    sort: filters.sort,
                    dir: filters.dir,
                    view: filters.view,
                  })
                }
                className="text-xs text-text-secondary hover:text-accent-gold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <Section title="Search">
          <DebouncedInput
            type="search"
            value={filters.q}
            onCommit={(q) => update({ q })}
            placeholder="Card or set name"
            aria-label="Search card or set name"
            className={inputClass}
          />
        </Section>

        <Section title={`Price (${currency})`}>
          <div className="flex items-center gap-2">
            <DebouncedInput
              type="number"
              inputMode="decimal"
              min={0}
              value={filters.min === null ? "" : String(filters.min)}
              onCommit={setNumber("min")}
              placeholder="Min"
              aria-label="Minimum price"
              className={inputClass}
            />
            <span className="text-text-muted">–</span>
            <DebouncedInput
              type="number"
              inputMode="decimal"
              min={0}
              value={filters.max === null ? "" : String(filters.max)}
              onCommit={setNumber("max")}
              placeholder="Max"
              aria-label="Maximum price"
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS[scope].map((p) => (
              <Chip
                key={p}
                active={filters.min === p && filters.max === null}
                onClick={() =>
                  update({ min: filters.min === p ? null : p, max: null })
                }
              >
                {symbol}
                {p.toLocaleString()}+
              </Chip>
            ))}
          </div>
        </Section>

        {scope === "chase" && (
          <Section title="Treatment">
            <div className="flex flex-wrap gap-1.5">
              {facets.treatments.map((t) => (
                <Chip
                  key={t.key}
                  active={filters.treatments.includes(t.key)}
                  onClick={() => update({ treatments: toggle(filters.treatments, t.key) })}
                >
                  {treatmentLabel(t.key)}{" "}
                  <span className="text-text-muted">{t.count}</span>
                </Chip>
              ))}
            </div>
          </Section>
        )}

        <Section title="Card type">
          <div className="flex flex-wrap gap-1.5">
            {CARD_TYPES.map((t) => (
              <Chip
                key={t}
                active={filters.types.includes(t)}
                onClick={() => update({ types: toggle(filters.types, t) })}
              >
                {t}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Price movement">
          <div className="flex gap-1.5">
            {(
              [
                ["", "Any"],
                ["up", "Rising"],
                ["down", "Falling"],
              ] as const
            ).map(([val, label]) => (
              <Chip
                key={label}
                active={filters.chg === val}
                onClick={() => update({ chg: val })}
              >
                {label}
              </Chip>
            ))}
          </div>
          {filters.chg && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>by at least</span>
              <DebouncedInput
                type="number"
                min={0}
                value={filters.chgMin ? String(filters.chgMin) : ""}
                onCommit={(v) => update({ chgMin: Math.max(0, Number(v) || 0) })}
                placeholder="0"
                aria-label="Minimum percent change"
                className={clsx(inputClass, "w-16")}
              />
              <span>% over</span>
              <select
                value={filters.win}
                onChange={(e) => update({ win: e.target.value as "7d" | "30d" })}
                aria-label="Change window"
                className={clsx(inputClass, "w-20")}
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>
          )}
        </Section>

        <Section title="Rarity">
          <div className="flex flex-wrap gap-1.5">
            {facets.rarities.map((r) => (
              <Chip
                key={r}
                active={filters.rarities.includes(r)}
                onClick={() => update({ rarities: toggle(filters.rarities, r) })}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Color">
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => {
              const active = filters.colors.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={active}
                  onClick={() => update({ colors: toggle(filters.colors, c.key) })}
                  style={{ backgroundColor: c.bg }}
                  className={clsx(
                    "w-8 h-8 rounded-full text-xs font-bold text-black/80 border-2 transition-all",
                    active
                      ? "border-accent-gold scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {c.key}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Finish">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FINISH_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                active={filters.finishes.includes(key)}
                onClick={() => update({ finishes: toggle(filters.finishes, key) })}
              >
                {label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title={`Sets${filters.sets.length ? ` (${filters.sets.length})` : ""}`}>
          <input
            type="search"
            value={setQuery}
            onChange={(e) => setSetQuery(e.target.value)}
            placeholder="Find a set"
            aria-label="Find a set"
            className={inputClass}
          />
          <ul className="max-h-56 overflow-y-auto -mx-1 pr-1">
            {visibleSets.map((s) => (
              <li key={s.code}>
                <label className="flex items-center gap-2 px-1 py-1 rounded text-xs text-text-secondary hover:bg-bg-surface/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sets.includes(s.code)}
                    onChange={() => update({ sets: toggle(filters.sets, s.code) })}
                    className="accent-[var(--accent-gold)]"
                  />
                  <span className="truncate flex-1" title={s.name}>
                    {s.name}
                  </span>
                  <span className="text-text-muted tabular-nums">{s.count}</span>
                </label>
              </li>
            ))}
            {visibleSets.length === 0 && (
              <li className="px-1 py-2 text-xs text-text-muted">No matching sets</li>
            )}
          </ul>
        </Section>

        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={filters.unpriced}
            onChange={(e) => update({ unpriced: e.target.checked })}
            className="accent-[var(--accent-gold)]"
          />
          Include cards with no market price
        </label>
      </div>
    </div>
  );
}

export function SortControls() {
  const { filters, update, pending } = useFilterState();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
      <label className="sr-only" htmlFor="chase-sort">
        Sort by
      </label>
      <select
        id="chase-sort"
        value={filters.sort}
        onChange={(e) => {
          const sort = e.target.value as SortKey;
          update({ sort, dir: sort === "name" || sort === "set" ? "asc" : "desc" });
        }}
        className="bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-gold/60"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => update({ dir: filters.dir === "asc" ? "desc" : "asc" })}
        aria-label={filters.dir === "asc" ? "Ascending" : "Descending"}
        title={filters.dir === "asc" ? "Ascending" : "Descending"}
        className="p-2 rounded-lg border border-border bg-bg-secondary text-text-secondary hover:text-accent-gold"
      >
        {filters.dir === "asc" ? (
          <ArrowUpNarrowWide className="w-4 h-4" />
        ) : (
          <ArrowDownWideNarrow className="w-4 h-4" />
        )}
      </button>
      <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-label="View">
        {(
          [
            ["grid", LayoutGrid, "Grid view"],
            ["table", TableIcon, "Table view"],
          ] as const
        ).map(([view, Icon, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => update({ view, page: filters.page })}
            aria-pressed={filters.view === view}
            aria-label={label}
            title={label}
            className={clsx(
              "p-2 transition-colors",
              filters.view === view
                ? "bg-bg-surface text-accent-gold"
                : "bg-bg-secondary text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
