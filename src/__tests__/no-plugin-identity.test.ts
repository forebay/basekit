import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as core from "../index.js";

const SOURCE_DIR = join(import.meta.dirname, "..");

// Test files are excluded because they legitimately use real plugin names as fixture data,
// the same rule the activity surface guard applies to itself.
//
// readme.ts is a known exception: the generated Installation section names the installer that
// CLAUDE.md's README standard requires, so removing it means changing that standard.
const ALLOWED = new Set(["readme.ts"]);

// Reads every file under src/ regardless of extension: a plugin table is the same
// violation in JSON (or any other data format) as it is in a TypeScript constant.
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "__tests__") out.push(...sourceFiles(path));
      continue;
    }
    if (!entry.endsWith(".test.ts") && !ALLOWED.has(entry)) out.push(path);
  }
  return out;
}

const PLUGIN_IDS = ["plugin-updater", "sync-bridge", "custom-auth", "config-ledger", "wakatime-sync"];

const CODE = /\.(ts|js|mjs|cjs)$/;

// Naming a plugin in prose is how the ecosystem is meant to work: the rule forbids LINKING to one,
// not mentioning it. Comments are therefore stripped from code, while a data file is scanned whole,
// because a plugin table is the violation whatever format carries it.
function scannable(file: string): string {
  const text = readFileSync(file, "utf-8");
  if (!CODE.test(file)) return text;
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "").replace(/([^:"'`\\])\/\/.*$/gm, "$1");
}

function pluginsNamedUnder(dir: string): string[] {
  const offenders: string[] = [];
  for (const file of sourceFiles(dir)) {
    const text = scannable(file);
    for (const id of PLUGIN_IDS) {
      if (text.includes(id)) offenders.push(`${file} names ${id}`);
    }
  }
  return offenders;
}

describe("core holds no plugin identity", () => {
  it("exports no plugin registry", () => {
    for (const name of ["KNOWN_PLUGINS", "knownPlugins", "pluginByCapability", "isBootstrapPlugin"]) {
      expect(core).not.toHaveProperty(name);
    }
  });

  it("names no specific plugin anywhere in its source", () => {
    expect(pluginsNamedUnder(SOURCE_DIR)).toEqual([]);
  });

  it("catches a plugin id in a non-TypeScript data file, not just .ts", () => {
    const probeDir = mkdtempSync(join(tmpdir(), "guard-probe-"));
    const probePath = join(probeDir, "probe.json");
    writeFileSync(probePath, JSON.stringify([{ id: "plugin-updater" }]));
    try {
      expect(pluginsNamedUnder(probeDir)).toEqual([`${probePath} names plugin-updater`]);
    } finally {
      rmSync(probeDir, { recursive: true, force: true });
    }
  });
});
