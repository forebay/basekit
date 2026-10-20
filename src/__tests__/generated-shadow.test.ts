import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// A generated surface exists so hand mirrors do not. The one this gate was written for: three
// activity types were declared BOTH in `generated/contracts.ts` and by hand under the same names,
// the barrel's explicit named export won, and so every consumer got the hand-written shapes while
// the generated `ActivityService` was declared in terms of the generated ones. TypeScript permits
// that through method bivariance, which is why nothing caught it for as long as it stood.
//
// Scoped per MODULE, which is what makes it a shadow rather than a coincidence: a name is only
// shadowed when the hand declaration and the generated one reach the same entry point. The loader
// declares its own `Provider`, meaning a registered capability and nothing like the IR provider the
// auth module generates, and those two never meet in one barrel.
const SRC = fileURLToPath(new URL("..", import.meta.url));

const MODULES = ["auth", "ir", "proxy", "loader"];

const DECLARATION = /^export (?:interface|type|enum) (\w+)\b/gm;

function segments(path: string): string[] {
  return path.replace(/\\/g, "/").split("/");
}

function moduleOf(path: string): string {
  const parts = segments(path.slice(SRC.length));
  return MODULES.includes(parts[0]) ? parts[0] : ".";
}

// Classified by the path alone. Threading a flag down the walk looks equivalent and is not: the
// flag turns true inside a generated directory whatever it started as, so every generated file
// lands in both lists and shadows itself.
function sources(directory: string, wantGenerated: boolean, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      sources(path, wantGenerated, found);
      continue;
    }
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
    if (segments(path).includes("generated") === wantGenerated) found.push(path);
  }
  return found;
}

/** @returns every declared name, keyed "<module>/<name>", with the files that declare it */
function declarationsIn(paths: string[]): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(DECLARATION)) {
      // A re-export states a name it does not declare, so `export type { X } from` is not one.
      if (/^export type \{/.test(match[0])) continue;
      const key = `${moduleOf(path)}/${match[1]}`;
      byName.set(key, [...(byName.get(key) ?? []), path.slice(SRC.length)]);
    }
  }
  return byName;
}

it("declares no name by hand that its own module's generated surface already declares", () => {
  const generated = declarationsIn(sources(SRC, true));
  const handWritten = declarationsIn(sources(SRC, false));
  // Silence is not success: a walk that matched no generated file at all would report no shadow
  // whatever the tree held, which is how this gate first passed while seeing nothing.
  expect(generated.size).toBeGreaterThan(50);
  expect(handWritten.size).toBeGreaterThan(50);
  const shadowed = [...generated.keys()]
    .filter((key) => handWritten.has(key))
    .map((key) => `${key} is generated and declared again in ${handWritten.get(key)?.join(", ")}`);
  expect(shadowed).toEqual([]);
});
