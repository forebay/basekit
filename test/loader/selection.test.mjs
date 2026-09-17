import { describe, it } from "vitest";
import assert from "node:assert";
import { selectionKey, selectedInstallables } from "../../dist/loader/selection.js";

describe("selection", () => {
  it("selectionKey and selectedInstallables behave as expected", () => {
    // selectionKey precedence
    assert.equal(selectionKey({ full_name: "o/r", name: "r" }), "o/r");
    assert.equal(selectionKey({ author: "o", repoName: "r", name: "r" }), "o/r");
    assert.equal(selectionKey({ name: "solo" }), "solo");

    const catalog = [
      { full_name: "forebay/a", name: "a", repoName: "a" },
      { full_name: "forebay/b", name: "b", repoName: "b" },
      { full_name: "forebay/c", name: "c", repoName: "c" },
    ];
    const selected = { "forebay/a": true, "forebay/c": true };
    // b is not selected; a is selected+installed -> only c is installable
    const out = selectedInstallables(catalog, ["a"], selected);
    assert.deepEqual(out.map((m) => m.name), ["c"]);
    // empty selection -> nothing
    assert.deepEqual(selectedInstallables(catalog, [], {}), []);
  });
});
