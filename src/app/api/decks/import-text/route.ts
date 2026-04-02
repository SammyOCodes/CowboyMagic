import { NextRequest, NextResponse } from "next/server";
import { importDeckFromText } from "@/lib/moxfield/parser";

export async function POST(request: NextRequest) {
  const { text, name } = await request.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing deck text" }, { status: 400 });
  }

  try {
    const deck = await importDeckFromText(text, name || "Imported Deck");
    return NextResponse.json(deck);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import deck";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
