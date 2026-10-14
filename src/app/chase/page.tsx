import type { Metadata } from "next";
import ExplorerView from "@/components/chase/views/ExplorerView";

export const metadata: Metadata = {
  title: "Chase Cards - CowboyMagic",
};

export default function ChaseExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ExplorerView scope="chase" searchParams={searchParams} />;
}
