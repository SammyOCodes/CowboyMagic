import type { Metadata } from "next";
import CardDetailView from "@/components/chase/views/CardDetailView";
import { getCard } from "@/lib/chase/queries";
import { SCOPES } from "@/lib/chase/scope";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = getCard(id, SCOPES.reserved.defaultMarket);
  return {
    title: card ? `${card.name} (${card.setCode.toUpperCase()}) - CowboyMagic` : "Card not found",
  };
}

export default async function ReservedCardPage({ params, searchParams }: Props) {
  const { id } = await params;
  return <CardDetailView scope="reserved" id={id} searchParams={searchParams} />;
}
