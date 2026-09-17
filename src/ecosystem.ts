/**
 * The name this ecosystem publishes and stores its own global state under.
 *
 * @remarks
 * One name answers three questions that must not drift apart: the GitHub organisation every
 * first-party repo lives in, the marketplace org a home scans by default, and the `.config`
 * directory the app registry lives in. It sits in a leaf module so `apps.ts` can read it without
 * importing `env.ts`, which imports `apps.ts`.
 */
export const ECOSYSTEM_ORG = "forebay";
