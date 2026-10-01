// Stand-in for the "server-only" package under plain Node test scripts.
// Next.js's own bundler makes "server-only" a no-op when the importing code
// runs on the server (it only throws for an accidental client-bundle
// import); plain Node's module resolution doesn't know that distinction and
// always resolves to the package's throwing default export. Every dev test
// script here runs server-side code directly in Node, which is exactly the
// context "server-only" is meant to allow — so redirecting it to this no-op
// (via scripts/dev/alias-loader.mjs) matches real behavior instead of
// fighting an irrelevant safety check.
export {};
