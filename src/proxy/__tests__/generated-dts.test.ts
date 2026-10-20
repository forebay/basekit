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
  const scratch = mkdtempSync(join(tmpdir(), "core-proxy-dts-"));
  await run(process.execPath, [
    join(repo, "node_modules", "@intisy", "bayonet", "scripts", "emit-dts.mjs"),
    "--java-dir", repo,
    "--module", module,
    ...extra,
    "--out", scratch,
  ], { cwd: repo });
  return scratch;
}

async function expectMatchesCommitted(scratch: string, names: string[]): Promise<void> {
  expect(readdirSync(scratch).sort()).toEqual(names);
  for (const name of names) {
    expect(readFileSync(join(scratch, name), "utf8")).toBe(readFileSync(join(repo, "src", "proxy", "generated", name), "utf8"));
  }
}

it("keeps the committed contract declarations identical to what the java emits", async () => {
  expectMatchesCommitted(await emit(":proxy-contracts", ["--module-dir", "proxy-contracts", "--ext", ".ts"]), ["proxy-contracts.keys.ts"]);
});

it("keeps the committed teavm declarations identical to what the java emits", async () => {
  expectMatchesCommitted(await emit(":proxy-teavm"), ["core-proxy.teavm.d.ts"]);
});
