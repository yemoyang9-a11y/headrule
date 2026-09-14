// Bump the version in manifest.json, lib/config.js and package.json.
// Usage: node scripts/bump.mjs 1.0.1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || "")) { console.error("usage: node scripts/bump.mjs X.Y.Z"); process.exit(1); }
const files = [
  ["extension/manifest.json", (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${v}"`)],
  ["extension/lib/config.js", (s) => s.replace(/version:\s*"[^"]+"/, `version: "${v}"`)],
  ["package.json", (s) => s.replace(/"version":\s*"[^"]+"/, `"version": "${v}"`)]
];
for (const [f, fn] of files) {
  const p = path.join(ROOT, f);
  fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8")));
}
console.log(`version set to ${v}. Next: git commit -am "v${v}" && git tag v${v} && git push --tags`);
