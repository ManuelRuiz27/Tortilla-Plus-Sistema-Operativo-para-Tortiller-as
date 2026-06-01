import assert from "node:assert/strict";
import test from "node:test";

test("health response shape", () => {
  assert.deepEqual(
    {
      status: "ok",
      service: "tortilla-plus-api",
      version: "0.1.0",
    },
    {
      status: "ok",
      service: "tortilla-plus-api",
      version: "0.1.0",
    },
  );
});
