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
function contractFiles(dir: string): string[] {
  // src/generated also holds the TeaVM bundle, which this emission does not produce.
  return readdirSync(dir).filter((name) => name.startsWith("proxy-contracts")).sort();
}

it("keeps the committed front-door key identical to what the java emits", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "proxy-contracts-"));
  await run(process.execPath, [
    join(repo, "node_modules", "@intisy", "bayonet", "scripts", "emit-dts.mjs"),
    "--java-dir", repo,
    "--module", ":proxy-contracts",
    "--module-dir", "proxy-contracts",
    "--out", scratch,
  ], { cwd: repo });

  const emitted = contractFiles(scratch);
  const committed = contractFiles(join(repo, "src", "proxy", "generated"));
  expect(emitted).toEqual(committed);
  for (const name of emitted) {
    expect(readFileSync(join(scratch, name), "utf8")).toBe(
      readFileSync(join(repo, "src", "proxy", "generated", name), "utf8"),
    );
  }
});
