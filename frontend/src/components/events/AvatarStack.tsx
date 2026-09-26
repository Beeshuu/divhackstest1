import { cn } from "@/lib/utils";

interface AvatarStackProps {
  /** Initials for the locally generated placeholder chips. */
  people: string[];
  /** Remaining-count chip, e.g. "+83". */
  overflowLabel: string;
  className?: string;
}

const CHIP_STYLES = [
  "bg-[linear-gradient(150deg,#F3D3BC,#D59E86)] text-[#6E3F2A]",
  "bg-[linear-gradient(150deg,#CFDCF4,#9FB6DD)] text-[#26406B]",
  "bg-[linear-gradient(150deg,#DCD3EF,#B0A0D6)] text-[#43326D]",
  "bg-[linear-gradient(150deg,#D7E8D4,#A7C8A3)] text-[#2F5230]",
];

/**
 * Overlapping attendee chips. Locally generated initials only — the prototype
 * never loads remote avatar images.
 */
export function AvatarStack({ people, overflowLabel, className }: AvatarStackProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {people.map((initials, index) => (
          <span
            key={initials}
            aria-hidden
            className={cn(
              "grid h-[22px] w-[22px] place-items-center rounded-full text-[9px] font-bold ring-2 ring-panel",
              CHIP_STYLES[index % CHIP_STYLES.length],
              index > 0 && "-ml-[7px]",
            )}
          >
            {initials}
          </span>
        ))}
      </div>
      <span className="ml-[7px] rounded-full bg-[#EFF2F7] px-[8px] py-[2px] text-[12px] font-semibold leading-[1.4] text-[#4C5C7B]">
        {overflowLabel}
      </span>
    </div>
  );
}
