"use client";

import { useState } from "react";
import { Link2, FileText, Loader2 } from "lucide-react";
import { extractMoxfieldId } from "@/lib/moxfield/client";

interface DeckImporterProps {
  onImported: () => void;
}

export default function DeckImporter({ onImported }: DeckImporterProps) {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [deckName, setDeckName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUrlImport = async () => {
    setLoading(true);
    setError("");
    try {
      const publicId = extractMoxfieldId(url);
      const res = await fetch(`/api/moxfield/deck/${publicId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save to localStorage
      const { saveDeck } = await import("@/stores/deck-store");
      saveDeck(data);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import deck");
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/decks/import-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name: deckName || "Imported Deck" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { saveDeck } = await import("@/stores/deck-store");
      saveDeck(data);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-6">
      <h3 className="font-display text-lg text-accent-gold mb-4">
        Import Deck
      </h3>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "url"
              ? "bg-accent-orange text-white"
              : "bg-bg-surface text-text-secondary hover:text-text-primary"
          }`}
        >
          <Link2 className="w-4 h-4" />
          MoxField URL
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-accent-orange text-white"
              : "bg-bg-surface text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileText className="w-4 h-4" />
          Paste Text
        </button>
      </div>

      {mode === "url" ? (
        <div className="space-y-3">
          <p className="text-text-muted text-xs">
            Paste a public MoxField deck URL. Private decks are not accessible
            — use text export instead.
          </p>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.moxfield.com/decks/..."
            className="w-full bg-bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold transition-colors"
          />
          <button
            onClick={handleUrlImport}
            disabled={!url.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-orange text-white rounded-lg text-sm font-medium hover:bg-accent-orange-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Import Deck
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-text-muted text-xs">
            Paste your deck list. Format: one card per line as &ldquo;1 Card
            Name&rdquo;. Use section headers like COMMANDER: and SIDEBOARD: to
            organize.
          </p>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck name"
            className="w-full bg-bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold transition-colors"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`COMMANDER:\n1 Atraxa, Praetors' Voice\n\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n...`}
            rows={10}
            className="w-full bg-bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold resize-y font-mono transition-colors"
          />
          <button
            onClick={handleTextImport}
            disabled={!text.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-orange text-white rounded-lg text-sm font-medium hover:bg-accent-orange-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Import Deck
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-3">{error}</p>
      )}
    </div>
  );
}
