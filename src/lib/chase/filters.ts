/** URL <-> filter state for the explorer. Pure (usable from server and client). */

import { isMarket, type Market } from "./markets";
import { SCOPES, type Scope } from "./scope";

export type SortKey = "price" | "change7d" | "change30d" | "released" | "name" | "set";

export interface Filters {
  q: string;
  market: Market;
  sets: string[];
  treatments: string[];
  rarities: string[];
  colors: string[];
  finishes: string[];
  types: string[];
  min: number | null;
  max: number | null;
  /** Window used by the movement filter. */
  win: "7d" | "30d";
  chg: "" | "up" | "down";
  chgMin: number;
  unpriced: boolean;
  sort: SortKey;
  dir: "asc" | "desc";
  view: "grid" | "table";
  page: number;
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "change7d", label: "7-day change" },
  { key: "change30d", label: "30-day change" },
  { key: "released", label: "Release date" },
  { key: "name", label: "Name" },
  { key: "set", label: "Set" },
];

/** Card-type filters, matched against the type line. */
export const CARD_TYPES = [
  "Land",
  "Artifact",
  "Creature",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Planeswalker",
  "Legendary",
] as const;

export function defaultFilters(scope: Scope): Filters {
  return {
    q: "",
    market: SCOPES[scope].defaultMarket,
    sets: [],
    treatments: [],
    rarities: [],
    colors: [],
    finishes: [],
    types: [],
    min: null,
    max: null,
    win: "7d",
    chg: "",
    chgMin: 0,
    unpriced: false,
    sort: "price",
    dir: "desc",
    view: "grid",
    page: 1,
  };
}

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function list(v: string | string[] | undefined): string[] {
  return first(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(v: string | string[] | undefined): number | null {
  const s = first(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.key));
const TYPE_SET = new Set<string>(CARD_TYPES);

function defaultDir(sort: string): "asc" | "desc" {
  return sort === "name" || sort === "set" ? "asc" : "desc";
}

/** Reads the market from `?mkt=`, falling back to the scope's default. */
export function parseMarket(raw: RawParams, scope: Scope): Market {
  const m = first(raw.mkt);
  return isMarket(m) ? m : SCOPES[scope].defaultMarket;
}

export function parseFilters(raw: RawParams, scope: Scope): Filters {
  const sort = first(raw.sort);
  const page = num(raw.page);
  return {
    q: first(raw.q).slice(0, 80),
    market: parseMarket(raw, scope),
    sets: list(raw.set),
    treatments: list(raw.t),
    rarities: list(raw.r),
    colors: list(raw.c),
    finishes: list(raw.f),
    types: list(raw.ty).filter((t) => TYPE_SET.has(t)),
    min: num(raw.min),
    max: num(raw.max),
    win: first(raw.win) === "30d" ? "30d" : "7d",
    chg: first(raw.chg) === "up" ? "up" : first(raw.chg) === "down" ? "down" : "",
    chgMin: Math.max(0, num(raw.chgmin) ?? 0),
    unpriced: first(raw.np) === "1",
    sort: SORT_KEYS.has(sort) ? (sort as SortKey) : "price",
    dir: first(raw.dir) === "asc" ? "asc" : first(raw.dir) === "desc" ? "desc" : defaultDir(sort),
    view: first(raw.view) === "table" ? "table" : "grid",
    page: page && page > 0 ? Math.floor(page) : 1,
  };
}

/** Serializes only non-default values so URLs stay short and shareable. */
export function filtersToParams(f: Filters, scope: Scope): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.market !== SCOPES[scope].defaultMarket) p.set("mkt", f.market);
  if (f.sets.length) p.set("set", f.sets.join(","));
  if (f.treatments.length) p.set("t", f.treatments.join(","));
  if (f.rarities.length) p.set("r", f.rarities.join(","));
  if (f.colors.length) p.set("c", f.colors.join(","));
  if (f.finishes.length) p.set("f", f.finishes.join(","));
  if (f.types.length) p.set("ty", f.types.join(","));
  if (f.min !== null) p.set("min", String(f.min));
  if (f.max !== null) p.set("max", String(f.max));
  if (f.chg) {
    p.set("chg", f.chg);
    if (f.win !== "7d") p.set("win", f.win);
    if (f.chgMin > 0) p.set("chgmin", String(f.chgMin));
  }
  if (f.unpriced) p.set("np", "1");
  if (f.sort !== "price") p.set("sort", f.sort);
  if (f.dir !== defaultDir(f.sort)) p.set("dir", f.dir);
  if (f.view !== "grid") p.set("view", f.view);
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}
