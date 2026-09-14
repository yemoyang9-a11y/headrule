// End-to-end smoke test: loads the unpacked extension in Chromium, seeds
// rules, and verifies that request and response headers are actually
// modified by declarativeNetRequest. Also captures store screenshots.
//
// Usage: node test/smoke.mjs            (run checks)
//        node test/smoke.mjs --shots    (also write store/screenshot-*.png)
import { chromium } from "playwright";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const SHOTS = process.argv.includes("--shots");

function startEchoServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/echo") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("X-Echo-Original", "server");
        res.end(JSON.stringify({ headers: req.headers }));
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end("<!doctype html><title>echo</title><h1>echo</h1>");
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok - ${msg}`);
}

const { server, port } = await startEchoServer();
const base = `http://127.0.0.1:${port}`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "headrule-"));

// deviceScaleFactor renders screenshots at 3x pixel density so store/site
// images look crisp on retina displays instead of blurry when stretched.
const SHOT_SCALE = 3;
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: SHOT_SCALE
});

try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = new URL(sw.url()).host;
  console.log(`extension loaded: ${extId}`);

  // Seed a state with rules through an extension page (has chrome.storage).
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extId}/options/options.html`);
  await options.waitForTimeout(300);
  const seeded = await options.evaluate(async (base) => {
    const state = {
      version: 1,
      enabled: true,
      activeProfileId: "p_test",
      profiles: [
        {
          id: "p_test", name: "Staging", enabled: true,
          rules: [
            { id: "r1", enabled: true, type: "request", op: "set", name: "X-Headrule-Test", value: "applied", urlFilter: "", comment: "" },
            { id: "r2", enabled: true, type: "request", op: "set", name: "Authorization", value: "Bearer test-token", urlFilter: "||127.0.0.1", comment: "" },
            { id: "r3", enabled: true, type: "request", op: "remove", name: "Accept-Language", value: "", urlFilter: "", comment: "" },
            { id: "r4", enabled: true, type: "response", op: "set", name: "X-Echo-Original", value: "rewritten", urlFilter: "", comment: "" },
            { id: "r5", enabled: false, type: "request", op: "set", name: "X-Disabled", value: "no", urlFilter: "", comment: "" },
            { id: "r6", enabled: true, type: "request", op: "set", name: "X-Other-Host", value: "no", urlFilter: "||example.invalid", comment: "" },
            { id: "r7", enabled: true, type: "request", op: "append", name: "X-Bad-Append", value: "x", urlFilter: "", comment: "should be rejected with a clear error" }
          ]
        }
      ],
      settings: { syncEnabled: false, showBadge: true },
      license: null
    };
    await chrome.storage.local.set({ state });
    await new Promise((r) => setTimeout(r, 800));
    const { ruleStatus } = await chrome.storage.session.get("ruleStatus");
    const dyn = await chrome.declarativeNetRequest.getDynamicRules();
    return { ruleStatus, dynCount: dyn.length };
  }, base);
  console.log("rule status:", JSON.stringify(seeded.ruleStatus));
  assert(seeded.dynCount === 5, `5 dynamic rules registered (got ${seeded.dynCount})`);
  assert(seeded.ruleStatus.errors.r7 && /append/i.test(seeded.ruleStatus.errors.r7), "bad append rule reported with a clear error");
  assert(!seeded.ruleStatus.errors.r1, "valid rule has no error");

  const page = await context.newPage();
  await page.goto(`${base}/`);
  const result = await page.evaluate(async () => {
    const res = await fetch("/echo", { headers: { "Accept-Language": "ko-KR" } });
    const body = await res.json();
    return { headers: body.headers, resHeader: res.headers.get("x-echo-original") };
  });
  assert(result.headers["x-headrule-test"] === "applied", "request header set on all URLs");
  assert(result.headers["authorization"] === "Bearer test-token", "request header set with ||domain filter");
  assert(result.headers["accept-language"] === undefined, "request header removed");
  assert(result.headers["x-other-host"] === undefined, "rule for another domain not applied");
  assert(result.headers["x-disabled"] === undefined, "disabled rule not applied");
  assert(result.resHeader === "rewritten", "response header rewritten");

  // Pause everything and confirm rules are dropped.
  await options.evaluate(async () => {
    const { state } = await chrome.storage.local.get("state");
    state.enabled = false;
    await chrome.storage.local.set({ state });
    await new Promise((r) => setTimeout(r, 600));
  });
  const paused = await page.evaluate(async () => (await (await fetch("/echo")).json()).headers);
  assert(paused["x-headrule-test"] === undefined, "master pause removes rules");

  // Import parser: ModHeader-format file
  const imported = await options.evaluate(async () => {
    const mod = await import(chrome.runtime.getURL("lib/storage.js"));
    const profiles = mod.parseImport(JSON.stringify([{ title: "MH", headers: [{ enabled: true, name: "X-From-MH", value: "1" }], respHeaders: [{ enabled: true, name: "X-Resp", value: "" }] }]));
    return profiles.map((p) => ({ name: p.name, rules: p.rules.map((r) => [r.type, r.op, r.name]) }));
  });
  assert(imported[0].rules.length === 2 && imported[0].rules[1][1] === "remove", "ModHeader export imports (empty value => remove)");

  if (SHOTS) {
    await options.evaluate(async () => {
      const { state } = await chrome.storage.local.get("state");
      state.enabled = true;
      state.profiles[0].rules = state.profiles[0].rules.filter((r) => !["r5", "r6", "r7"].includes(r.id));
      state.profiles[0].rules[0].comment = "";
      state.profiles[0].rules[1].urlFilter = "||api.staging.example.com";
      state.profiles[0].rules[3].urlFilter = "||localhost";
      state.profiles.push({ id: "p_prod", name: "Production", enabled: true, rules: [] });
      state.profiles.push({ id: "p_cors", name: "CORS debug", enabled: true, rules: [] });
      await chrome.storage.local.set({ state });
    });
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 680, height: 330 });
    await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
    await popup.waitForTimeout(600);
    await popup.screenshot({ path: path.join(ROOT, "store", "raw-popup.png") });
    await options.reload();
    await options.waitForTimeout(400);
    await options.setViewportSize({ width: 900, height: 1000 });
    await options.screenshot({ path: path.join(ROOT, "store", "raw-options.png"), fullPage: true });
    console.log("raw screenshots written to store/");
  }
  console.log("\nALL CHECKS PASSED");
} finally {
  await context.close();
  server.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
