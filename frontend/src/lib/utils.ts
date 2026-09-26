/** Joins conditional class names without pulling in a dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** 1234 -> "1,234" for social counters. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
