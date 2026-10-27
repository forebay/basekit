import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readActivity } from "./activity.js";
import { setConfigValue } from "./config.js";
import { makeWriteLog } from "./log.js";

let savedAppsFile: string | undefined;
let savedConfigDir: string | undefined;

function home(): string {
  return mkdtempSync(join(tmpdir(), "core-source-"));
}

function activeHome(): string {
  const dir = home();
  process.env.HUB_CONFIG_DIR = dir;
  return dir;
}

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

describe("activity source", () => {
  it("records the given source on a log error", () => {
    const dir = activeHome();
    makeWriteLog("antigravity", dir, "antigravity-auth")("boom", true);
    const record = readActivity([dir], { topics: ["log.error"] }).records[0];
    expect(record.source).toBe("antigravity-auth");
    expect(record.subject?.id).toBe("antigravity-auth");
  });

  it("records the given source on a config change", () => {
    const dir = activeHome();
    setConfigValue("antigravity", "interval", 60, dir, "antigravity-auth");
    const record = readActivity([dir], { topics: ["config.changed"] }).records[0];
    expect(record.source).toBe("antigravity-auth");
    expect(JSON.parse(readFileSync(join(dir, "config", "antigravity.json"), "utf-8"))).toEqual({ interval: 60 });
  });

  it("defaults the source to the name", () => {
    const dir = activeHome();
    makeWriteLog("plain", dir)("boom", true);
    expect(readActivity([dir], { topics: ["log.error"] }).records[0].source).toBe("plain");
  });
});
