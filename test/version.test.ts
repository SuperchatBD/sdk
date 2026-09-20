import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { SDK_VERSION } from "../src/version";

describe("SDK_VERSION", () => {
  test("is a valid semver string", () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  test("stays in sync with package.json", () => {
    const packageJson = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"),
    ) as { version: string };

    expect(SDK_VERSION).toBe(packageJson.version);
  });
});
