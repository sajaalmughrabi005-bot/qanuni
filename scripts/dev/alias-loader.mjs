// Minimal Node ESM loader hook so plain `node` (no bundler) can run this
// project's TypeScript source files: resolves the "@/..." -> "src/..." path
// alias (see tsconfig.json) and appends the ".ts"/".tsx" extensions Next.js's
// bundler infers automatically but plain Node's ESM resolver requires
// explicit. No new package — built on Node's own module customization hooks.
// Used only by scripts/dev/*.mjs test runners; the app itself is unaffected
// (Next.js resolves "@/" and extensions on its own).
import { statSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const srcRoot = fileURLToPath(new URL("../../src/", import.meta.url));
// Files first, directory-with-index last — a bare path that happens to also
// be a directory must still resolve to the file, matching TS/webpack alias
// resolution (e.g. "@/types" -> src/types.ts, not src/types/ if both exist).
const CANDIDATE_EXTS = [".ts", ".tsx", "", "/index.ts", "/index.tsx"];

function resolvedFile(base) {
  for (const ext of CANDIDATE_EXTS) {
    const candidate = base + ext;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const found = resolvedFile(path.join(srcRoot, specifier.slice(2)));
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    const found = resolvedFile(base);
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }
  return nextResolve(specifier, context);
}
