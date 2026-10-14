import clsx from "clsx";
import { treatmentLabel } from "@/lib/chase/config";

interface TreatmentBadgeProps {
  treatment: string;
  className?: string;
}

export default function TreatmentBadge({ treatment, className }: TreatmentBadgeProps) {
  const plain = treatment === "regular";
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap border",
        plain
          ? "border-border text-text-muted"
          : "border-accent-gold/40 text-accent-gold bg-accent-gold/10",
        className
      )}
    >
      {treatmentLabel(treatment)}
    </span>
  );
}
