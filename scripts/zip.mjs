// Build dist/headrule-<version>.zip from extension/ for the Chrome Web Store.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "extension", "manifest.json"), "utf8"));
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const out = path.join(ROOT, "dist", `headrule-${manifest.version}.zip`);
if (fs.existsSync(out)) fs.unlinkSync(out);
execSync(`cd "${path.join(ROOT, "extension")}" && zip -qr "${out}" . -x ".*" -x "__MACOSX/*"`, { stdio: "inherit" });
console.log(`built ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
