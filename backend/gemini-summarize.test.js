import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanListing, fallbackSummary } from "./gemini-summarize.js";

test("strips encoded University Life HTML", () => {
  const cleaned = cleanListing(
    "&lt;p&gt;Stop by the Butler Library 3rd-floor lobby with questions about research.&lt;/p&gt;",
  );
  assert.equal(cleaned, "Stop by the Butler Library 3rd-floor lobby with questions about research.");
  assert.doesNotMatch(cleaned, /<|&lt;/);
});

test("keeps the useful first sentences and drops register URLs", () => {
  const summary = fallbackSummary(
    "&lt;p&gt;Learn more about the admissions process, academic programs, and student life at Columbia Nursing. &lt;/p&gt; &lt;p&gt;Register here: &lt;a href=\"https://apply.nursing.columbia.edu/register/FA26_AP1\"&gt;https://apply.nursing.columbia.edu/register/FA26_AP1&lt;/a&gt;&lt;/p&gt;",
  );
  assert.match(summary, /Columbia Nursing/);
  assert.doesNotMatch(summary, /http|Register here|&lt;p&gt;/);
});

test("collapses spaces left by stripped tags", () => {
  const cleaned = cleanListing("In partnership with &lt;strong&gt;CLSVR&lt;/strong&gt;, we&rsquo;re hosting tabling.");
  assert.equal(cleaned, "In partnership with CLSVR, we're hosting tabling.");
});

test("uses talk title plus abstract for long colloquia", () => {
  const summary = fallbackSummary(
    "Speaker: Dr. Josefine Proll Title: Physics understanding of instabilities and turbulence for stellarator optimisation Abstract: Stellarators have historically suffered from confining heat insufficiently compared with tokamaks.",
  );
  assert.match(summary, /stellarator/i);
  assert.doesNotMatch(summary, /Speaker:/);
});

test("keeps a full sentence instead of clipping mid-word", () => {
  const summary = fallbackSummary(
    "Title: Physics understanding of instabilities and turbulence for stellarator optimisation Abstract: Stellarators, the twisted siblings of tokamaks, have historically suffered from confining the heat of the plasma insufficiently compared with tokamaks and were therefore considered to be less attractive. A second sentence should be dropped if it would clip.",
  );
  assert.doesNotMatch(summary, /…|second sentence/);
  assert.match(summary, /optimisation\./);
});
