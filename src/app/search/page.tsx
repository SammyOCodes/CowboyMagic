import { notFound } from "next/navigation";
import ChatPanel from "@/components/chat/ChatPanel";
import { CARD_SEARCH_ENABLED } from "@/lib/features";

export default function SearchPage() {
  // Hidden unless NEXT_PUBLIC_ENABLE_CARD_SEARCH=true (see src/lib/features.ts).
  if (!CARD_SEARCH_ENABLED) notFound();

  return (
    <div className="h-full max-w-5xl mx-auto">
      <ChatPanel />
    </div>
  );
}
