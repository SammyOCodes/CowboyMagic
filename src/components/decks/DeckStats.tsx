"use client";

import { Deck } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const COLOR_LABELS: Record<string, { name: string; color: string }> = {
  W: { name: "White", color: "#f9fafb" },
  U: { name: "Blue", color: "#3b82f6" },
  B: { name: "Black", color: "#6b7280" },
  R: { name: "Red", color: "#ef4444" },
  G: { name: "Green", color: "#22c55e" },
  C: { name: "Colorless", color: "#9ca3af" },
};

interface DeckStatsProps {
  deck: Deck;
}

export default function DeckStats({ deck }: DeckStatsProps) {
  // Mana curve
  const manaCurve: Record<number, number> = {};
  const colorDist: Record<string, number> = {};
  const typeDist: Record<string, number> = {};

  for (const dc of deck.cards) {
    if (dc.board === "maybeboard" || dc.board === "sideboard") continue;

    const card = dc.card;
    const qty = dc.quantity;

    // Mana curve (exclude lands)
    if (!card.type_line.includes("Land")) {
      const cmc = Math.min(Math.floor(card.cmc), 7);
      manaCurve[cmc] = (manaCurve[cmc] || 0) + qty;
    }

    // Color distribution
    const colors = card.color_identity.length > 0 ? card.color_identity : ["C"];
    for (const c of colors) {
      colorDist[c] = (colorDist[c] || 0) + qty;
    }

    // Type distribution
    const mainType = card.type_line.split("—")[0].trim().split(" ").pop() || "Other";
    typeDist[mainType] = (typeDist[mainType] || 0) + qty;
  }

  const curveData = Array.from({ length: 8 }, (_, i) => ({
    cmc: i === 7 ? "7+" : String(i),
    count: manaCurve[i] || 0,
  }));

  const colorData = Object.entries(colorDist).map(([key, value]) => ({
    name: COLOR_LABELS[key]?.name || key,
    value,
    color: COLOR_LABELS[key]?.color || "#888",
  }));

  const typeData = Object.entries(typeDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const totalCards = deck.cards
    .filter((c) => c.board !== "maybeboard" && c.board !== "sideboard")
    .reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Cards" value={totalCards} />
        <StatCard
          label="Creatures"
          value={
            deck.cards
              .filter(
                (c) =>
                  c.card.type_line.includes("Creature") &&
                  c.board !== "maybeboard"
              )
              .reduce((s, c) => s + c.quantity, 0)
          }
        />
        <StatCard
          label="Lands"
          value={
            deck.cards
              .filter(
                (c) =>
                  c.card.type_line.includes("Land") &&
                  c.board !== "maybeboard"
              )
              .reduce((s, c) => s + c.quantity, 0)
          }
        />
        <StatCard
          label="Avg Mana Value"
          value={(() => {
            const nonLands = deck.cards.filter(
              (c) =>
                !c.card.type_line.includes("Land") &&
                c.board !== "maybeboard" &&
                c.board !== "sideboard"
            );
            if (nonLands.length === 0) return "0";
            const total = nonLands.reduce(
              (s, c) => s + c.card.cmc * c.quantity,
              0
            );
            const count = nonLands.reduce((s, c) => s + c.quantity, 0);
            return (total / count).toFixed(2);
          })()}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mana Curve */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <h4 className="font-display text-accent-gold mb-4">Mana Curve</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={curveData}>
              <XAxis dataKey="cmc" stroke="#8a7560" fontSize={12} />
              <YAxis stroke="#8a7560" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#1a0f0a",
                  border: "1px solid #3d2a1a",
                  borderRadius: 8,
                  color: "#f5e6c8",
                }}
              />
              <Bar dataKey="count" fill="#c45a2c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Color Distribution */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <h4 className="font-display text-accent-gold mb-4">
            Color Distribution
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={colorData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {colorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1a0f0a",
                  border: "1px solid #3d2a1a",
                  borderRadius: 8,
                  color: "#f5e6c8",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Type Distribution */}
        <div className="bg-bg-surface border border-border rounded-xl p-4 lg:col-span-2">
          <h4 className="font-display text-accent-gold mb-4">
            Type Breakdown
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <XAxis type="number" stroke="#8a7560" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#8a7560"
                fontSize={12}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a0f0a",
                  border: "1px solid #3d2a1a",
                  borderRadius: 8,
                  color: "#f5e6c8",
                }}
              />
              <Bar dataKey="count" fill="#d4a843" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-accent-gold">{value}</div>
      <div className="text-text-muted text-xs uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
