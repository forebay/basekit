import { existsSync } from "node:fs";
import type { EventBusShape, HomeDescriptorShape, HomeRegistryShape } from "@intisy/bayonet/engine";
import type { Logger, PluginConfig, PluginManifest, PluginPaths } from "@intisy/bayonet";
import { appIdForHome, appPaths, getApp, getApps, resolveHome } from "./apps.js";
import { publish, subscribeHomes } from "./bus.js";
import { redactDetails } from "./activity.js";
import { getConfigValue, loadConfig, setConfigValue } from "./config.js";
import { makeWriteLog } from "./log.js";
import { configNameFor } from "./plugin-declarations.js";

/** The per-plugin half of a plugin context, which is everything a context carries that is not the host's own. */
export interface PluginRuntimeParts {
  /** The plugin's resolved configuration. */
  config: PluginConfig;
  /** The plugin's logger. */
  log: Logger;
  /** The storage directories of the home the plugin runs in. */
  paths: PluginPaths;
  /** The event bus, scoped to this plugin as its source. */
  events: EventBusShape;
  /** Every app home the registry knows. */
  homes: HomeRegistryShape;
}

function dotGet<T>(node: unknown, key: string): T | undefined {
  let current: unknown = node;
  for (const part of key.split(".")) {
    if (current && typeof current === "object") current = (current as Record<string, unknown>)[part];
    else return undefined;
  }
  return current as T | undefined;
}

/**
 * Resolves one plugin's configuration.
 *
 * @remarks
 * `loadConfig` and `getConfigValue` read only what a plugin actually wrote to disk, because a
 * declared default is never written. `PluginConfig` promises defaults merged with what is on disk,
 * so this merges both sides itself, on-disk winning. The defaults are the manifest's declared ones
 * rather than `getConfigDefaults`, because the registry is process-global and keyed by name, so a
 * second home or an unregistered plugin would not find them.
 */
function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function detached<T>(value: T): T {
  return isObject(value) ? structuredClone(value) : value;
}

/**
 * @remarks
 * Every read answers a copy, so a caller mutating a nested value changes neither the manifest's
 * declared defaults nor basekit's cached copy of the settings file.
 */
function configFor(configName: string, declaredDefaults: Record<string, unknown>, configDir: string, source: string): PluginConfig {
  const defaults = structuredClone(declaredDefaults);
  return {
    all: () => structuredClone({ ...defaults, ...loadConfig(configName, configDir) }),
    get: <T = unknown>(key: string): T | undefined => {
      const onDisk = getConfigValue(configName, key, configDir) as T | undefined;
      return detached(onDisk !== undefined ? onDisk : dotGet<T>(defaults, key));
    },
    set: async (key: string, value: unknown): Promise<void> => {
      setConfigValue(configName, key, value, configDir, source);
    },
  };
}

function loggerFor(configName: string, configDir: string, source: string): Logger {
  const writeLog = makeWriteLog(configName, configDir, source);
  return {
    info: (message) => writeLog(message),
    warn: (message) => writeLog(`WARN ${message}`),
    error: (message: string, cause?: unknown) => writeLog(cause === undefined ? message : `${message}: ${String(cause)}`, true),
    debug: (message) => writeLog(`DEBUG ${message}`),
  };
}

/**
 * Resolves a home's storage directories.
 *
 * @remarks
 * The home's own registry entry is consulted first, so a home that renamed a storage directory in
 * its `apps.json` is answered with the names it chose. A home the registry does not know keeps the
 * environment-override defaults `appPaths` applies on its own.
 */
function pathsFor(configDir: string): PluginPaths {
  const appId = appIdForHome(configDir);
  const descriptor = appId ? getApp(appId) : undefined;
  return { home: configDir, ...appPaths(configDir, descriptor) };
}

/**
 * Resolves every home the registry knows, each with its own storage directories.
 *
 * @remarks
 * Deduped by resolved path, because two registry entries can name the same directory and a plugin
 * acting on each would act on it twice. Resolved on every call rather than once per activation, so a
 * home that is created, or an app that is installed, while a plugin runs is seen.
 */
function homesFor(): HomeRegistryShape {
  return {
    all: () => {
      const seen = new Set<string>();
      const homes: HomeDescriptorShape[] = [];
      for (const descriptor of getApps()) {
        const home = resolveHome(descriptor);
        if (!home || seen.has(home)) continue;
        seen.add(home);
        const entry: HomeDescriptorShape = {
          app: descriptor.id,
          label: descriptor.label,
          present: existsSync(home),
          paths: { home, ...appPaths(home, descriptor) },
        };
        if (descriptor.loader) entry.loader = descriptor.loader.id;
        homes.push(entry);
      }
      return homes;
    },
  };
}

function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (!record.details) return payload;
  return { ...record, details: redactDetails(record.details) };
}

/**
 * Builds the event bus one plugin publishes and subscribes through.
 *
 * @remarks
 * The payload crosses unchanged but for `details.message`, the one free-text field the activity
 * convention promotes into searchable text, which is redacted here because a plugin publishing
 * directly would otherwise outlive the operation with a credential in it. `subscribeHomes` rather
 * than the bare `subscribe`, which always watches the ambient process home with no way to point it
 * elsewhere; its handler receives the full bus envelope, so this unwraps `.payload` to match the
 * bus's listener contract.
 */
function eventsFor(name: string, configDir: string): EventBusShape {
  return {
    publish: (topic, payload) => {
      publish(topic, redactPayload(payload), name, configDir);
    },
    subscribe: (topic, listener) =>
      subscribeHomes([configDir], topic, (envelope: { payload: unknown }) => listener(envelope.payload)),
  };
}

/**
 * Builds the per-plugin half of a plugin context from this library's own config, logging, path and
 * bus machinery.
 *
 * @remarks
 * A host passes the result straight to the api package's `contextFor`, which is what lets a plugin
 * reach all of it through `ctx` and import none of it. The `paths` come from the home rather than
 * from a plugin's own guesswork, so a renamed storage directory takes effect everywhere at once.
 *
 * @param manifest - the plugin's manifest, which names its settings file, its declared defaults and
 *   the id its events and activity records carry
 * @param configDir - the app home to resolve against
 */
export function createPluginRuntime(manifest: PluginManifest, configDir: string): PluginRuntimeParts {
  const configName = configNameFor(manifest);
  return {
    config: configFor(configName, manifest.config?.defaults ?? {}, configDir, manifest.id),
    log: loggerFor(configName, configDir, manifest.id),
    paths: pathsFor(configDir),
    events: eventsFor(manifest.id, configDir),
    homes: homesFor(),
  };
}
