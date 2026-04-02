import { NextRequest, NextResponse } from "next/server";
import { importMoxfieldDeck } from "@/lib/moxfield/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json({ error: "Missing deck ID" }, { status: 400 });
  }

  try {
    const deck = await importMoxfieldDeck(publicId);
    return NextResponse.json(deck);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import deck";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
