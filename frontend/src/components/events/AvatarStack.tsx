import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface AvatarStackProps {
  /** Initials for the locally generated placeholder chips. */
  people: string[];
  /** Total number of people; chips and the "+N" label derive from it. */
  count: number;
  className?: string;
}

const CHIP_STYLES = [
  "bg-[linear-gradient(150deg,#F3D3BC,#D59E86)] text-[#6E3F2A]",
  "bg-[linear-gradient(150deg,#CFDCF4,#9FB6DD)] text-[#26406B]",
  "bg-[linear-gradient(150deg,#DCD3EF,#B0A0D6)] text-[#43326D]",
  "bg-[linear-gradient(150deg,#D7E8D4,#A7C8A3)] text-[#2F5230]",
];

/** Matches the reference: three chips then "+(count − 4)", e.g. 87 → "+83". */
function overflowFor(count: number): number {
  return count > 4 ? count - 4 : 0;
}

/**
 * Overlapping attendee chips; the entry "You" renders as a check mark. Locally generated initials only — the prototype
 * never loads remote avatar images.
 */
export function AvatarStack({ people, count, className }: AvatarStackProps) {
  if (count === 0) {
    return (
      <p className={cn("text-[12.5px] font-medium leading-[22px] text-faint", className)}>
        No one yet
      </p>
    );
  }

  const shown = people.slice(0, Math.min(3, count));
  const overflow = overflowFor(count);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {shown.map((initials, index) => (
          <span
            key={initials}
            aria-hidden
            className={cn(
              "grid h-[22px] w-[22px] place-items-center rounded-full text-[9px] font-bold ring-2 ring-panel",
              initials === "You" ? "bg-brand text-white" : CHIP_STYLES[index % CHIP_STYLES.length],
              index > 0 && "-ml-[7px]",
            )}
          >
            {initials === "You" ? <Check size={12} strokeWidth={3.2} /> : initials}
          </span>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-[7px] rounded-full bg-[#EFF2F7] px-[8px] py-[2px] text-[12px] font-semibold leading-[1.4] text-[#4C5C7B]">
          +{overflow}
        </span>
      )}
    </div>
  );
}
