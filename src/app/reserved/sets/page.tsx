import type { Metadata } from "next";
import SetsView from "@/components/chase/views/SetsView";
import { SCOPES } from "@/lib/chase/scope";

export const metadata: Metadata = {
  title: `${SCOPES.reserved.setsTitle} - CowboyMagic`,
};

export default function ReservedSetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SetsView scope="reserved" searchParams={searchParams} />;
}
