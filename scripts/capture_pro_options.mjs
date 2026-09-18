// Captures store/raw-options-pro.png: the options page with Pro active and
// sync on, for store screenshot 3. The license server is mocked, so no real
// key is needed. Usage: node scripts/capture_pro_options.mjs
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const { chromium } = await import("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "hr-shot-")), {
  channel: "chromium", headless: true, colorScheme: "light",
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 900, height: 1000 }, deviceScaleFactor: 3
});
await ctx.route("https://api.lemonsqueezy.com/**", (route) => route.fulfill({
  status: 200, contentType: "application/json",
  body: JSON.stringify({ activated: true, valid: true, error: null, license_key: { status: "active" }, instance: { id: "shot" }, meta: { store_id: 473656, product_id: 1362488, customer_email: "you@example.com" } })
}));
try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = new URL(sw.url()).host;
  await sleep(600);
  for (const p of ctx.pages()) if (p.url().includes("options.html")) await p.close();
  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options/options.html`);
  await sleep(300);
  await opt.evaluate(async () => {
    const { state } = await chrome.storage.local.get("state");
    const r = (id, name, value, urlFilter) => ({ id, enabled: true, type: "request", op: "set", name, value, urlFilter, comment: "" });
    state.profiles = [
      { id: "p1", name: "Staging", enabled: true, rules: [r("a", "Authorization", "Bearer staging-token", "||api.staging.example.com")] },
      { id: "p2", name: "Production", enabled: true, rules: [] },
      { id: "p3", name: "Client A", enabled: true, rules: [] },
      { id: "p4", name: "CORS debug", enabled: true, rules: [] }
    ];
    state.activeProfileId = "p1";
    await chrome.storage.local.set({ state });
  });
  await opt.fill("#licenseKey", "SHOT-KEY");
  await opt.click("#activateBtn");
  await sleep(600);
  await opt.click("#syncEnabled");
  await sleep(4500);
  await opt.evaluate(() => window.scrollTo(0, 0));
  await opt.screenshot({ path: path.join(ROOT, "store", "raw-options-pro.png"), fullPage: true });
  console.log("store/raw-options-pro.png written:", await opt.textContent("#licenseStatus"), "|", await opt.textContent("#syncMsg"));
} finally {
  await ctx.close();
}
