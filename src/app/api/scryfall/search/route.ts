import { NextRequest, NextResponse } from "next/server";
import { searchCards, ScryfallApiError } from "@/lib/scryfall/client";
import { CARD_SEARCH_ENABLED } from "@/lib/features";

export async function GET(request: NextRequest) {
  // Part of Card Search; also keeps this from being an open Scryfall proxy when hosted.
  if (!CARD_SEARCH_ENABLED) {
    return NextResponse.json({ error: "Card Search is disabled" }, { status: 404 });
  }

  const query = request.nextUrl.searchParams.get("q");
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
  const order = request.nextUrl.searchParams.get("order") || "edhrec";

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const result = await searchCards(query, page, order);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ScryfallApiError) {
      return NextResponse.json(
        { error: err.details, code: err.code },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
