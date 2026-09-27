import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeCampusId } from "./official-events.js";

test("normalizes campus query values", () => {
  assert.equal(normalizeCampusId("NYU"), "nyu");
  assert.equal(normalizeCampusId("barnard"), "barnard");
  assert.equal(normalizeCampusId("not-a-school"), "columbia");
  assert.equal(normalizeCampusId(), "columbia");
});
