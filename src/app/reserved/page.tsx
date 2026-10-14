import type { Metadata } from "next";
import ExplorerView from "@/components/chase/views/ExplorerView";

export const metadata: Metadata = {
  title: "Reserved List - CowboyMagic",
};

export default function ReservedExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ExplorerView scope="reserved" searchParams={searchParams} />;
}
