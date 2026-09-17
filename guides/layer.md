---
title: Its layer
---

# Where basekit sits

Every library, plugin and app in this ecosystem sits in exactly one numbered layer, and

> a repo may reference ONLY repos in a strictly LOWER layer.

Never its own layer, never a higher one. "Reference" means all of it: a TypeScript or Java import, a
Gradle dependency, an npm dependency, or merely naming a type in a signature. There is no exception
for types-only, `compileOnly` or test-only references.

## basekit is layer 2, and its modules are not all layer 2

A layer attaches to a MODULE, not only to a repo. basekit publishes five modules spanning two
layers, so each declares its own:

| module | layer | may reference |
| --- | :--: | --- |
| `basekit` | 2 | layer 1 (`bayonet`) |
| `basekit/ir` | 2 | layer 1 |
| `basekit/auth` | 3 | layers 1 to 2 |
| `basekit/proxy` | 3 | layers 1 to 2 |
| `basekit/loader` | 3 | layers 1 to 2 |

The repo's own declaration is the LOWEST of its modules, because a repo-wide declaration (an npm
dependency, a Gradle alias) serves every module including that one. So the whole package may depend
only on `bayonet`, and it does.

A layer is a **ceiling on what a module may depend on, never a rank**. A module sits at the lowest
layer its real references allow, and raising one pre-emptively is a loss: it licenses references the
gate should still be catching.

## What may reference basekit

Layers 3 and above: the translators, the providers, the app-proxies, the plugins, the loaders,
`forebay` and `ai-java`. The only repo it may itself reference is `bayonet`.

## Why the three layer-3 modules may not reference each other

`basekit/auth` and `basekit/proxy` are in the same layer, so neither may name the other, and this is
the constraint that shapes both of them:

- `basekit/proxy` routes to whatever handles canonical IR. It cannot say "provider", because that
  word belongs to `basekit/auth`. So `basekit/ir` declares `IrHandler` (an id plus `handleIr`) down
  in layer 2, and `basekit/auth` declares `Provider extends IrHandler`. The router carries IR and
  never learns what a provider is.
- `basekit/auth` needs an app's wire format to log an account in, which is an app-proxy's job up in
  layer 4. It cannot reference one, so it takes its front door by **injection** from whoever starts
  it.

That is the general shape: **when a reference would break the rule, the shared thing is in the wrong
layer.** Move it down, or inject it. Never add the sideways reference.
