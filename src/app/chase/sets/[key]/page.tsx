import type { Metadata } from "next";
import SetDetailView from "@/components/chase/views/SetDetailView";
import { treatmentLabel } from "@/lib/chase/config";
import { getGroup } from "@/lib/chase/queries";
import { SCOPES } from "@/lib/chase/scope";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = decodeURIComponent((await params).key);
  const group = getGroup(key, SCOPES.chase.defaultMarket);
  if (!group) return { title: "Set not found" };
  const suffix = group.treatment === "reserved" ? "Reserved List" : treatmentLabel(group.treatment);
  return { title: `${group.setName} · ${suffix} - CowboyMagic` };
}

export default async function ChaseSetPage({ params, searchParams }: Props) {
  const groupKey = decodeURIComponent((await params).key);
  return <SetDetailView scope="chase" groupKey={groupKey} searchParams={searchParams} />;
}
