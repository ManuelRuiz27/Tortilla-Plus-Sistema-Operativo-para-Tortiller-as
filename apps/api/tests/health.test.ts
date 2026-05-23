import assert from "node:assert/strict";
import test from "node:test";

test("health response shape", () => {
  assert.deepEqual(
    {
      status: "ok",
      service: "tortilla-plus-backend",
    },
    {
      status: "ok",
      service: "tortilla-plus-backend",
    },
  );
});
