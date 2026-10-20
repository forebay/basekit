import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const run = promisify(execFile);

const repo = fileURLToPath(new URL("../../..", import.meta.url));

function contractFiles(dir: string): string[] {
  // src/generated also holds the TeaVM bundle, which this emission does not produce.
  return readdirSync(dir).filter((name) => !name.includes(".teavm.")).sort();
}

it("keeps the committed declarations identical to what the java emits", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "core-ir-contracts-"));
  await run(process.execPath, [
    join(repo, "node_modules", "@intisy", "bayonet", "scripts", "emit-dts.mjs"),
    "--java-dir", repo,
    "--module", ":ir",
    "--module-dir", "ir",
    "--out", scratch,
  ], { cwd: repo });

  const emitted = contractFiles(scratch);
  const committed = contractFiles(join(repo, "src", "ir", "generated"));
  expect(emitted).toEqual(committed);
  for (const name of emitted) {
    expect(readFileSync(join(scratch, name), "utf8")).toBe(
      readFileSync(join(repo, "src", "ir", "generated", name), "utf8"),
    );
  }
});

async function typeCheck(file: string): Promise<{ ok: boolean; output: string }> {
  try {
    await run(process.execPath, [
      join(repo, "node_modules", "typescript", "bin", "tsc"),
      // TypeScript 6 refuses to silently ignore a tsconfig when files are named on the command
      // line, and this check deliberately compiles one fixture under its own flags.
      "--ignoreConfig",
      "--noEmit", "--strict", "--target", "ES2022", "--lib", "ES2022,DOM",
      "--module", "esnext", "--moduleResolution", "bundler",
      join(repo, "test", "ir", "dts-conformance", file),
    ], { cwd: repo, encoding: "utf8" });
    return { ok: true, output: "" };
  } catch (failure) {
    return { ok: false, output: String((failure as { stdout?: string }).stdout ?? failure) };
  }
}

it("accepts a handler written against the emitted seam", async () => {
  const result = await typeCheck("positive.ts");
  expect(result.output).toBe("");
  expect(result.ok).toBe(true);
});

it("rejects a handler whose call context is not the declared one", async () => {
  const result = await typeCheck("negative-handler.ts");
  expect(result.ok).toBe(false);
  expect(result.output).toContain("TS2322");
});
