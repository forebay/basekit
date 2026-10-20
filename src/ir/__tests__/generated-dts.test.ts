import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const run = promisify(execFile);

const repo = fileURLToPath(new URL("../../..", import.meta.url));

// Awaited rather than run with execFileSync: a synchronous child blocks the worker's event loop
// for as long as the emitter takes, and the runner fails the whole RUN when a task update goes
// unanswered for 60 seconds, which this file is well past on an ordinary machine.
async function emit(module: string, extra: string[] = []): Promise<string> {
  const scratch = mkdtempSync(join(tmpdir(), "core-ir-dts-"));
  await run(process.execPath, [
    join(repo, "node_modules", "@intisy", "bayonet", "scripts", "emit-dts.mjs"),
    "--java-dir", repo,
    "--module", module,
    ...extra,
    "--out", scratch,
  ], { cwd: repo });
  return scratch;
}

function expectMatchesCommitted(scratch: string, names: string[]): void {
  expect(readdirSync(scratch).sort()).toEqual(names);
  for (const name of names) {
    expect(readFileSync(join(scratch, name), "utf8")).toBe(readFileSync(join(repo, "src", "ir", "generated", name), "utf8"));
  }
}

it("keeps the committed ir declarations identical to what the java emits", async () => {
  expectMatchesCommitted(await emit(":ir", ["--module-dir", "ir"]), ["ir.keys.ts", "ir.ts"]);
});

it("leaves no link tag unresolved in the emitted prose", async () => {
  // The emitter matches "{@link " with a literal space, so a javadoc link broken across two source
  // lines leaks through verbatim and typedoc, which treats an invalid link as an error, then fails.
  const emitted = readFileSync(join(repo, "src", "ir", "generated", "ir.ts"), "utf8");
  expect(emitted.match(/\{@link\s*$/gm)).toBeNull();
});

it("keeps the committed teavm declarations identical to what the java emits", async () => {
  expectMatchesCommitted(await emit(":ir-teavm"), ["core-ir.teavm.d.ts"]);
});
