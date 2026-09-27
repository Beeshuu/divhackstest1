import assert from "node:assert/strict";
import { test } from "node:test";

/** Mirrors the Columbia box in server.js after the GPS bounds fix. */
const COLUMBIA = { south: 40.8007, west: -73.97235, north: 40.81395, east: -73.95255 };

function inBounds(bounds, lat, lng) {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

test("Columbia GPS box covers the drawn campus, not Midtown", () => {
  assert.equal(inBounds(COLUMBIA, 40.8076, -73.9626), true, "Low Library / College Walk");
  assert.equal(inBounds(COLUMBIA, 40.80875, -73.96755), true, "Riverside at 116th");
  assert.equal(inBounds(COLUMBIA, 40.8029, -73.96005), true, "Morningside at 110th");
  assert.equal(inBounds(COLUMBIA, 40.758, -73.9855), false, "Times Square");
  assert.equal(inBounds(COLUMBIA, 40.7308, -73.9975), false, "Washington Square");
  assert.equal(inBounds(COLUMBIA, 40.815, -73.958), false, "125th Street");
});
