/**
 * Boundary guard for the pipeline_entries comp access invariant (spec 0005 / ADR-0003).
 *
 * The `pipelineEntries` Drizzle table object is the only way to query pipeline_entries.
 * All such queries MUST go through src/lib/pipeline.ts (the repository boundary) so the
 * comp-redaction logic in that module is the sole enforcement point.
 *
 * This test scans every TypeScript source file and fails if `pipelineEntries` appears
 * outside the allow-list. If you are adding a new read path, route it through the
 * repository functions — do not import the table object directly.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const REPO_ROOT = join(__dirname, "../..");
const SRC_ROOT = join(REPO_ROOT, "src");

// Files that are permitted to reference the `pipelineEntries` table object.
const ALLOW_LIST = new Set([
  "src/lib/db/schema.ts",
  "src/lib/db/schema.test.ts", // tests the schema table definitions
  "src/lib/pipeline.ts",
  // Guard test itself must be excluded.
  "src/lib/pipeline.guard.test.ts",
]);

function walkTs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("pipeline_entries query boundary guard (spec 0005 / ADR-0003)", () => {
  it("pipelineEntries is only referenced in the schema and repository module", () => {
    const files = walkTs(SRC_ROOT);
    const violations: string[] = [];

    for (const abs of files) {
      const rel = relative(REPO_ROOT, abs).replace(/\\/g, "/");
      if (ALLOW_LIST.has(rel)) continue;

      const content = readFileSync(abs, "utf-8");
      if (content.includes("pipelineEntries")) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });
});
