import type { PluginRow } from "../plugins.js";

/**
 * One plugin row with every required field filled in, so a test states only what it is about.
 *
 * @param overrides what this test cares about
 * @returns a complete row carrying those overrides
 */
export function pluginRow(overrides: Partial<PluginRow> = {}): PluginRow {
  return {
    name: "demo",
    folderName: "demo",
    url: "https://github.com/forebay/demo",
    autoUpdate: false,
    enabled: true,
    installed: true,
    deployed: true,
    localHead: "aaaaaaa",
    remoteHead: "aaaaaaa",
    latestTag: "v1.0.0",
    subject: "init",
    updateAvail: false,
    hasBuild: false,
    ...overrides,
  };
}
