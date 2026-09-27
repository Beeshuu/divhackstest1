import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Loads KEY=value pairs without overriding variables already in the environment. */
export function loadEnvFiles() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const file of [join(here, ".env"), join(here, "..", ".env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const cut = trimmed.indexOf("=");
      if (cut <= 0) continue;
      const key = trimmed.slice(0, cut).trim();
      let value = trimmed.slice(cut + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}
