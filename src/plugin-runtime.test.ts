import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "@intisy/bayonet";
import { readActivity } from "./activity.js";
import { createPluginRuntime } from "./plugin-runtime.js";

const homes: string[] = [];
let savedAppsFile: string | undefined;
let savedConfigDir: string | undefined;

function home(): string {
  const dir = mkdtempSync(join(tmpdir(), "core-runtime-"));
  homes.push(dir);
  return dir;
}

function manifest(id: string, config?: PluginManifest["config"]): PluginManifest {
  return { id, api: 1, entry: "dist/index.js", config } as PluginManifest;
}

function writeSettings(dir: string, relativePath: string, value: unknown): void {
  const file = join(dir, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}

function logFileNames(dir: string): string[] {
  const logs = join(dir, "logs");
  if (!existsSync(logs)) return [];
  return readdirSync(logs, { recursive: true }).map((entry) => String(entry).replace(/\\/g, "/").split("/").pop() as string).filter((name) => name.endsWith(".log"));
}

// paths resolve through the app registry, which without an override reads the developer's real
// ~/.config apps.json and prefix-matches it against these temp homes.
beforeAll(() => {
  savedAppsFile = process.env.HUB_APPS_FILE;
  savedConfigDir = process.env.HUB_CONFIG_DIR;
  process.env.HUB_APPS_FILE = join(home(), "apps.json");
});

afterAll(() => {
  if (savedAppsFile === undefined) delete process.env.HUB_APPS_FILE;
  else process.env.HUB_APPS_FILE = savedAppsFile;
  if (savedConfigDir === undefined) delete process.env.HUB_CONFIG_DIR;
  else process.env.HUB_CONFIG_DIR = savedConfigDir;
});

afterEach(() => {
  homes.length = 0;
});

describe("createPluginRuntime", () => {
  it("reads defaults merged with what is on disk", () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("runtime-config", { defaults: { interval: 30, logging: true } }), dir);
    expect(runtime.config.get("interval")).toBe(30);
    expect(runtime.config.all()).toMatchObject({ interval: 30, logging: true });
  });

  it("writes a setting to the config directory", async () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("runtime-write"), dir);
    await runtime.config.set("interval", 60);
    const written = JSON.parse(readFileSync(join(dir, "config", "runtime-write.json"), "utf-8"));
    expect(written).toEqual({ interval: 60 });
    expect(runtime.config.get("interval")).toBe(60);
  });

  it("returns undefined for a key that is neither set nor defaulted", () => {
    const runtime = createPluginRuntime(manifest("runtime-absent"), home());
    expect(runtime.config.get("nothing")).toBeUndefined();
  });

  it("reads and writes the settings file a manifest renames", async () => {
    const dir = home();
    writeSettings(dir, "config/antigravity.json", { interval: 60 });
    const runtime = createPluginRuntime(manifest("antigravity-auth", { name: "antigravity", defaults: {} }), dir);
    expect(runtime.config.get("interval")).toBe(60);
    await runtime.config.set("interval", 90);
    expect(JSON.parse(readFileSync(join(dir, "config", "antigravity.json"), "utf-8"))).toEqual({ interval: 90 });
    expect(existsSync(join(dir, "config", "antigravity-auth.json"))).toBe(false);
  });

  it("answers a manifest default for an unset key, and creates no file", () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("defaulted", { defaults: { interval: 30, selection: { strategy: "sticky" } } }), dir);
    expect(runtime.config.get("interval")).toBe(30);
    expect(runtime.config.get("selection.strategy")).toBe("sticky");
    expect(runtime.config.all()).toMatchObject({ interval: 30, selection: { strategy: "sticky" } });
    expect(existsSync(join(dir, "config"))).toBe(false);
  });

  it("lets a stored value win over a default", () => {
    const dir = home();
    writeSettings(dir, "config/winner.json", { interval: 5 });
    const runtime = createPluginRuntime(manifest("winner", { defaults: { interval: 30, other: 1 } }), dir);
    expect(runtime.config.get("interval")).toBe(5);
    expect(runtime.config.all()).toEqual({ interval: 5, other: 1 });
  });

  it("gates log lines on the renamed file's logging setting", () => {
    const quiet = home();
    writeSettings(quiet, "config/antigravity.json", { logging: false });
    createPluginRuntime(manifest("antigravity-auth", { name: "antigravity", defaults: {} }), quiet).log.info("x");
    expect(existsSync(join(quiet, "logs"))).toBe(false);

    const loud = home();
    createPluginRuntime(manifest("antigravity-auth", { name: "antigravity", defaults: {} }), loud).log.info("x");
    const names = logFileNames(loud);
    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/^antigravity-\d/);
  });

  it("records the plugin id as the source of its log errors and config writes", async () => {
    const dir = home();
    process.env.HUB_CONFIG_DIR = dir;
    const runtime = createPluginRuntime(manifest("antigravity-auth", { name: "antigravity", defaults: {} }), dir);
    runtime.log.error("boom");
    await runtime.config.set("k", 1);
    const records = readActivity([dir], { topics: ["log.error", "config.changed"] }).records;
    expect(records.map((record) => record.topic).sort()).toEqual(["config.changed", "log.error"]);
    expect(records.every((record) => record.source === "antigravity-auth")).toBe(true);
  });

  it("uses the id as the settings file, with no defaults, when the manifest has no config block", async () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("bare"), dir);
    expect(runtime.config.all()).toEqual({});
    await runtime.config.set("k", 1);
    expect(existsSync(join(dir, "config", "bare.json"))).toBe(true);
  });

  it("falls back to the id when config.name is empty", async () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("blank-name", { name: "", defaults: {} }), dir);
    await runtime.config.set("k", 1);
    expect(existsSync(join(dir, "config", "blank-name.json"))).toBe(true);
  });

  it("still reads the legacy settings file outside config/, and writes under config/", async () => {
    const dir = home();
    writeSettings(dir, "legacy-name.json", { interval: 7 });
    const runtime = createPluginRuntime(manifest("legacy-id", { name: "legacy-name", defaults: {} }), dir);
    expect(runtime.config.get("interval")).toBe(7);
    await runtime.config.set("interval", 8);
    expect(JSON.parse(readFileSync(join(dir, "config", "legacy-name.json"), "utf-8"))).toMatchObject({ interval: 8 });
  });

  it("does not change the manifest's defaults when a caller mutates what all() returned", () => {
    const dir = home();
    const declared = { interval: 30, selection: { strategy: "sticky" } };
    const runtime = createPluginRuntime(manifest("mutated", { defaults: declared }), dir);
    const everything = runtime.config.all();
    everything.interval = 99;
    delete everything.selection;
    expect(declared).toEqual({ interval: 30, selection: { strategy: "sticky" } });
    expect(runtime.config.get("interval")).toBe(30);
  });

  it("gives each read its own copy of nested defaults and of stored values", () => {
    const dir = home();
    const declared = { interval: 30, selection: { strategy: "sticky" } };
    const plugin = manifest("nested", { defaults: declared });
    writeSettings(dir, "config/nested.json", { stored: { depth: 1 } });
    const runtime = createPluginRuntime(plugin, dir);
    (runtime.config.get("selection") as { strategy: string }).strategy = "x";
    (runtime.config.all().selection as { strategy: string }).strategy = "y";
    expect(plugin.config?.defaults).toEqual({ interval: 30, selection: { strategy: "sticky" } });
    expect(runtime.config.get("selection.strategy")).toBe("sticky");

    (runtime.config.all().stored as { depth: number }).depth = 2;
    expect(runtime.config.get("stored.depth")).toBe(1);
  });

  it("keeps two homes apart for one plugin", () => {
    const homeA = home();
    const homeB = home();
    writeSettings(homeA, "config/shared.json", { interval: 1 });
    writeSettings(homeB, "config/shared.json", { interval: 2 });
    const plugin = manifest("shared", { defaults: {} });
    expect(createPluginRuntime(plugin, homeA).config.get("interval")).toBe(1);
    expect(createPluginRuntime(plugin, homeB).config.get("interval")).toBe(2);
  });

  it("resolves the home's storage directories", () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("runtime-paths"), dir);
    expect(runtime.paths.home).toBe(dir);
    expect(runtime.paths.config).toBe(join(dir, "config"));
    expect(runtime.paths.plugin).toBe(join(dir, "plugin"));
    expect(runtime.paths.repos).toBe(join(dir, "repos"));
    expect(runtime.paths.cache).toBe(join(dir, "cache"));
  });

  it("resolves storage directories the home's registry entry renamed", () => {
    const dir = home();
    const appsFile = join(dir, "apps.json");
    writeFileSync(appsFile, JSON.stringify({
      demo: { id: "demo", label: "Demo", home: { candidates: [dir] }, paths: { plugin: "extensions", config: "settings" } },
    }));
    const previous = process.env.HUB_APPS_FILE;
    process.env.HUB_APPS_FILE = appsFile;
    try {
      const runtime = createPluginRuntime(manifest("runtime-registry"), dir);
      expect(runtime.paths.plugin).toBe(join(dir, "extensions"));
      expect(runtime.paths.config).toBe(join(dir, "settings"));
      expect(runtime.paths.repos).toBe(join(dir, "repos"));
    } finally {
      if (previous === undefined) delete process.env.HUB_APPS_FILE;
      else process.env.HUB_APPS_FILE = previous;
    }
  });

  it("answers with every registered home, deduped by resolved path and marked present", () => {
    const dir = home();
    const absent = join(dir, "not-installed");
    const appsFile = join(dir, "apps.json");
    // `twin` resolves to the same directory as `demo`: a plugin acting per home must act once.
    writeFileSync(appsFile, JSON.stringify({
      demo: { id: "demo", label: "Demo", home: { candidates: [dir] }, loader: { id: "demo-loader", url: "https://github.com/forebay/demo-loader" } },
      twin: { id: "twin", label: "Twin", home: { candidates: [dir] } },
      gone: { id: "gone", label: "Gone", home: { candidates: [absent] } },
    }));
    const previous = process.env.HUB_APPS_FILE;
    process.env.HUB_APPS_FILE = appsFile;
    try {
      const homes = createPluginRuntime(manifest("runtime-homes"), dir).homes.all();
      expect(homes.map((entry) => entry.app)).toEqual(["demo", "gone"]);
      expect(homes[0]).toMatchObject({ label: "Demo", present: true, loader: "demo-loader" });
      expect(homes[0].paths).toMatchObject({ home: dir, config: join(dir, "config") });
      expect(homes[1]).toMatchObject({ present: false });
      expect(homes[1]).not.toHaveProperty("loader");
    } finally {
      if (previous === undefined) delete process.env.HUB_APPS_FILE;
      else process.env.HUB_APPS_FILE = previous;
    }
  });

  it("never throws from a log call", () => {
    const runtime = createPluginRuntime(manifest("runtime-log"), home());
    expect(() => runtime.log.info("up")).not.toThrow();
    expect(() => runtime.log.warn("odd")).not.toThrow();
    expect(() => runtime.log.error("broken", new Error("cause"))).not.toThrow();
    expect(() => runtime.log.debug("detail")).not.toThrow();
  });

  // publish/subscribe ride core's file-backed bus (fs.watch plus a poll-interval
  // backstop), so delivery is never synchronous with the publish call; there is no
  // in-process shortcut to assert on. vi.waitFor lets the assertion retry until the
  // real bus delivers, rather than fixing an arbitrary sleep.
  it("delivers a published payload to a subscriber", async () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("runtime-events"), dir);
    const seen: unknown[] = [];
    const stop = runtime.events.subscribe("config.changed", (payload) => seen.push(payload));
    runtime.events.publish("config.changed", { name: "runtime-events" });
    try {
      await vi.waitFor(() => expect(seen).toEqual([{ name: "runtime-events" }]), { timeout: 6000, interval: 50 });
    } finally {
      stop();
    }
  }, 10000);

  it("redacts a credential a plugin puts in details.message", async () => {
    const dir = home();
    const runtime = createPluginRuntime(manifest("runtime-redact"), dir);
    const seen: Array<{ details: { message: string; count: number } }> = [];
    const stop = runtime.events.subscribe("config.changed", (payload) => seen.push(payload as never));
    runtime.events.publish("config.changed", { action: "config_changed", details: { message: "pushed to https://user:hunter2@example.com/repo", count: 1 } });
    try {
      await vi.waitFor(() => expect(seen.length).toBe(1), { timeout: 6000, interval: 50 });
      expect(seen[0].details.message).toBe("pushed to https://<redacted>@example.com/repo");
      expect(seen[0].details.count).toBe(1);
    } finally {
      stop();
    }
  }, 10000);
});
