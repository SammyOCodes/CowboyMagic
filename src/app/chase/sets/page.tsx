import type { Metadata } from "next";
import SetsView from "@/components/chase/views/SetsView";
import { SCOPES } from "@/lib/chase/scope";

export const metadata: Metadata = {
  title: `${SCOPES.chase.setsTitle} - CowboyMagic`,
};

export default function ChaseSetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SetsView scope="chase" searchParams={searchParams} />;
}
