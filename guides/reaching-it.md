---
title: Reaching it
---

# How a consumer reaches basekit

The answer depends on what the consumer is, and the rule is stricter than "install it and import it".

## A plugin reaches behaviour through `ctx`, not through an import

A plugin's only runtime dependency is bayonet. Everything it may touch arrives on the context object
its `activate` is handed: `provide`, `services`, `events`, `config`, `log`, `paths`, `manifest`,
`host`. A library extends that surface by CONTRIBUTING to it, registering a service or providing a
capability, never by asking a plugin to import it.

To reach another plugin's or another library's API, ask for its typed handle:

```ts
const accounts = ctx.services.get(ACCOUNTS);
const manager = await ctx.services.want(PLUGIN_MANAGEMENT, { timeoutMs: 5000 });
```

The plugin that answers is whichever one provides the key, and the asker never names it.

There is a cost reason as well as a structural one. A TeaVM bundle statically links everything
reachable from its entry point and has no code splitting, so a Java plugin that links a shared
library has bought a private copy of it: measured 2026-08-21, ten plugins each embedding the IR
module would cost roughly 2.5 MB of duplicated runtime in one host. Shared logic belongs in the HOST,
where one bundle serves every plugin.

**So when a plugin needs something it cannot reach through `ctx`, the fix is to add it to `ctx` in
the layer that owns it, never to add the import.**

## Two exemptions, both by measurement rather than by concession

- **Providers import `auth` directly.** A provider is an extension OF that library, not a plugin that
  happens to use it: `ProviderDef`, the account store and the OAuth flows are the vocabulary it
  exists to implement, so putting them behind `ctx` would make the service object a re-export with an
  extra hop. The weight this rule exists to prevent was measured on 2026-08-23 and is not there:
  basekit is `external` in every provider bundle and materialised once per home. What a provider
  still may not import is a helper that BUILDS a capability payload; those come from the host's
  `provider-support` service, which the provider's manifest names under `services.consumes`.
- **`plugin-updater` imports the root module.** A plugin MANAGER is the host machinery it manages
  with: git, npm, deploy, the app registry and the shared-library store are what `plugin-management`
  exists to implement, so no provider of that capability can be bayonet-only, and widening `ctx` with
  git and npm is exactly what the rule forbids.

`npm-dual-publish plugin-linkage-check` gates the line, walking the whole module graph behind a
repo's `src/plugin.ts` rather than that file's own import list: an entry importing only bayonet still
links a library when the module beside it does.

## A host installs it and imports it

A loader, `forebay` and `ai-java` are hosts: they run plugins they did not write, and they are the ones
that supply `ctx` in the first place. A host takes basekit as an ordinary npm dependency at a version
range and imports what it needs.

A host also hands over what it may not link itself. `loader` starts the plugin host but sits in the
same layer as `auth`, so it may never reference it; the LOADER supplies the `provider-support`
service every provider asks its context for, exactly as it already supplies `runtimeFor` and the
capability vocabulary.

## A deployed bundle resolves it from the home store

`<home>/package.json` lists the union of what its deployed clones declare, and `<home>/node_modules`
is what `npm install` puts there. So a deployed bundle at `<home>/plugin/<id>.js` resolves
`@intisy-ai/basekit` by ordinary Node lookup, and there is one version per library per home, chosen
by npm rather than by whichever plugin deployed last. basekit is left `external` in every bundle for
exactly this reason.

## Never a checkout

A first-party dependency is declared, never vendored. No repo here carries a `.gitmodules`, and
`npm-dual-publish submodule-check` fails one that does. A checkout is a THIRD resolver beside the
package manifest and the build file, and it silently wins for whichever tool reads it first: ten
repos once aliased the scope onto their checkouts in tsconfig `paths`, so npm and esbuild resolved
the published package while TypeScript compiled against the checkout, and nothing noticed until the
two versions disagreed.

**A dependency is not converted until every resolver agrees.** `package.json`, esbuild `external`,
vite `alias` and tsconfig `paths` are four separate answers to the same question.

For Java, the same rule takes a `github-gradle` coordinate, which resolves a release asset when one
exists and otherwise clones the repo at a branch, tag or commit and builds it from source.
