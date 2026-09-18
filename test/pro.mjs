// Pro end-to-end checks with the Lemon Squeezy License API mocked at the
// network layer (same response shapes as the docs). Not part of `npm test` yet:
// run with  PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1 node test/pro.mjs
// On 1.0.0 the sync, ModHeader-import and stale-options-tab checks fail on
// purpose; they describe bugs to fix in 1.0.1 (see HANDOVER.md 5-4).
import { chromium } from "playwright";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, "..", "extension");
const STORE_ID = 473656, PRODUCT_ID = 1362488;
const results = [];
function check(cond, msg) { results.push([!!cond, msg]); console.log(`  ${cond ? "ok  " : "FAIL"} - ${msg}`); }

function echoServer() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      if (req.url.startsWith("/echo")) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ headers: req.headers })); return; }
      res.setHeader("Content-Type", "text/html"); res.end("<!doctype html><title>t</title>");
    });
    s.listen(0, "127.0.0.1", () => resolve({ s, port: s.address().port }));
  });
}

// Mock License API. mode controls the answers.
const api = { mode: "ok", calls: [] };
function lsBody(route) {
  const url = new URL(route.request().url());
  const ep = url.pathname.split("/").pop();
  const params = Object.fromEntries(new URLSearchParams(route.request().postData() || ""));
  api.calls.push({ ep, params });
  const meta = { store_id: STORE_ID, order_id: 1, order_item_id: 1, product_id: PRODUCT_ID, product_name: "Headrule Pro", variant_id: 99, variant_name: "Default", customer_id: 1, customer_name: "Test", customer_email: "buyer@example.com" };
  const lk = (status) => ({ id: 1, status, key: params.license_key, activation_limit: 5, activation_usage: 1, created_at: "2026-09-18T00:00:00Z", expires_at: null });
  if (api.mode === "offline") return route.abort("internetdisconnected");
  if (ep === "activate") {
    if (api.mode === "limit") return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ activated: false, error: "This license key has reached the activation limit.", license_key: lk("active"), meta }) });
    if (api.mode === "otherproduct") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ activated: true, error: null, license_key: lk("active"), instance: { id: "inst-1", name: params.instance_name }, meta: { ...meta, product_id: 1 } }) });
    if (api.mode === "notfound") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ activated: false, error: "license_key not found.", license_key: null, meta: null }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ activated: true, error: null, license_key: lk("active"), instance: { id: "inst-1", name: params.instance_name }, meta }) });
  }
  if (ep === "validate") {
    if (api.mode === "disabled") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: false, error: null, license_key: lk("disabled"), instance: null, meta }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true, error: null, license_key: lk("active"), instance: { id: "inst-1" }, meta }) });
  }
  if (ep === "deactivate") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ deactivated: true, error: null, license_key: lk("inactive"), meta }) });
  return route.fulfill({ status: 404, body: "{}" });
}

async function launch(dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium", headless: true, acceptDownloads: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`], viewport: { width: 1100, height: 900 }
  });
  await ctx.route("https://api.lemonsqueezy.com/**", lsBody);
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  return { ctx, sw, extId: new URL(sw.url()).host };
}

const { s: server, port } = await echoServer();
const base = `http://127.0.0.1:${port}`;
const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "hr-a-"));
const { ctx, sw, extId } = await launch(dirA);
const warnings = [];
sw.on?.("console", (m) => warnings.push(m.text()));
try {
  const opt = await ctx.newPage();
  opt.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  await opt.goto(`chrome-extension://${extId}/options/options.html`);
  await opt.waitForTimeout(500);
  const pages = ctx.pages().filter((p) => p !== opt);
  for (const p of pages) if (p.url().includes("options.html")) await p.close(); // onInstalled opens options

  console.log("\n[1] Free plan gating");
  check(await opt.isDisabled("#exportBtn") && await opt.isDisabled("#importBtn"), "free: import/export buttons disabled");
  check(await opt.isDisabled("#syncEnabled"), "free: sync checkbox disabled");
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  await popup.waitForTimeout(400);
  await popup.click("#profileAdd");
  await popup.waitForTimeout(200);
  check(await popup.isVisible("#upsell") && /Pro feature/.test(await popup.textContent("#upsellText")), "free: adding a 2nd profile shows the Pro upsell");
  const buyHref = await popup.getAttribute("#upsellLink", "href");
  check(buyHref.includes("headrule.lemonsqueezy.com/checkout/buy/116bb731"), "free: upsell links to the live checkout");
  // regex rule as free user
  const freeRegex = await opt.evaluate(async (base) => {
    const { state } = await chrome.storage.local.get("state");
    state.profiles[0].rules = [{ id: "rx", enabled: true, type: "request", op: "set", name: "X-Regex", value: "1", urlFilter: `regex:^${base.replace(/[.]/g, "\\.")}/echo`, comment: "" }];
    await chrome.storage.local.set({ state });
    await new Promise((r) => setTimeout(r, 700));
    return (await chrome.storage.session.get("ruleStatus")).ruleStatus;
  }, base);
  check(/Pro feature/.test(freeRegex?.errors?.rx || ""), "free: regex filter rejected with 'Pro feature' message");
  await opt.reload(); await opt.waitForTimeout(400); // options page keeps its own copy of state

  console.log("\n[2] Activation errors");
  for (const [mode, re, label] of [["notfound", /not found/i, "unknown key"], ["limit", /activation limit/i, "6th browser (limit 5)"], ["otherproduct", /different product/i, "key from another product"]]) {
    api.mode = mode;
    await opt.fill("#licenseKey", "KEY-" + mode);
    await opt.click("#activateBtn");
    await opt.waitForTimeout(500);
    const err = await opt.textContent("#licenseError");
    check(await opt.isVisible("#licenseError") && re.test(err), `${label}: clear error shown ("${err}")`);
    check(!(await opt.isVisible("#licensePro")), `${label}: Pro stays locked`);
  }
  api.mode = "offline";
  await opt.fill("#licenseKey", "KEY-offline");
  await opt.click("#activateBtn");
  await opt.waitForTimeout(500);
  check(await opt.isVisible("#licenseError"), `offline activation: error shown ("${await opt.textContent("#licenseError")}")`);

  console.log("\n[3] Successful activation");
  api.mode = "ok"; api.calls.length = 0;
  await opt.fill("#licenseKey", "  REAL-KEY-123  ");
  await opt.click("#activateBtn");
  await opt.waitForTimeout(600);
  check(await opt.isVisible("#licensePro"), "Pro panel shown after activation");
  check(/Pro active/.test(await opt.textContent("#licenseStatus")), `status line: "${await opt.textContent("#licenseStatus")}"`);
  const act = api.calls.find((c) => c.ep === "activate");
  check(act && act.params.license_key === "REAL-KEY-123" && /^Headrule on /.test(act.params.instance_name), `activate request sends trimmed key + device label ("${act?.params.instance_name}")`);
  check(!(await opt.isDisabled("#exportBtn")) && !(await opt.isDisabled("#importBtn")) && !(await opt.isDisabled("#syncEnabled")), "Pro: import/export and sync controls enabled");

  console.log("\n[4] Pro features work");
  const proRegex = await opt.evaluate(async () => { await new Promise((r) => setTimeout(r, 200)); const { state } = await chrome.storage.local.get("state"); await chrome.storage.local.set({ state: { ...state } }); await new Promise((r) => setTimeout(r, 700)); return (await chrome.storage.session.get("ruleStatus")).ruleStatus; });
  check(!proRegex?.errors?.rx && proRegex.applied === 1, "Pro: regex rule accepted by Chrome");
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  const h1 = await page.evaluate(async () => (await (await fetch("/echo")).json()).headers);
  check(h1["x-regex"] === "1", "Pro: regex-filtered header actually sent");
  // add profiles through the real popup UI
  await popup.reload(); await popup.waitForTimeout(400);
  for (const name of ["Production", "Client A", "CORS debug"]) {
    await popup.click("#profileAdd"); await popup.waitForTimeout(100);
    await popup.fill("#profileNameInput", name); await popup.press("#profileNameInput", "Enter"); await popup.waitForTimeout(200);
  }
  const nProf = await popup.evaluate(async () => (await chrome.storage.local.get("state")).state.profiles.length);
  check(nProf === 4, `Pro: created 3 more profiles in the popup (total ${nProf})`);
  // export
  await opt.reload(); await opt.waitForTimeout(400);
  const [dl] = await Promise.all([opt.waitForEvent("download"), opt.click("#exportBtn")]);
  const exported = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(exported.app === "headrule" && exported.profiles.length === 4, `Pro: export downloads JSON with 4 profiles (${dl.suggestedFilename()})`);
  // import a realistic ModHeader export (with url filters)
  const mh = [{ title: "Staging API", shortTitle: "1", headers: [{ enabled: true, name: "Authorization", value: "Bearer secret-staging-token", comment: "staging only" }], respHeaders: [], urlFilters: [{ enabled: true, urlRegex: ".*://api\\.staging\\.example\\.com/.*" }] }];
  const mhFile = path.join(os.tmpdir(), "modheader-export.json");
  fs.writeFileSync(mhFile, JSON.stringify(mh));
  await opt.setInputFiles("#importFile", mhFile);
  await opt.waitForTimeout(500);
  check(/Imported 1 profile/.test(await opt.textContent("#ioMsg")), `Pro: ModHeader import message ("${await opt.textContent("#ioMsg")}")`);
  const imp = await opt.evaluate(async () => { const { state } = await chrome.storage.local.get("state"); return state.profiles.at(-1); });
  check(imp.name === "Staging API", `imported profile keeps ModHeader name "title" (got "${imp.name}")`);
  check(imp.rules[0].urlFilter !== "", `imported token rule keeps its URL filter (got "${imp.rules[0].urlFilter}")`);
  // re-import our own export round trip
  const ownFile = path.join(os.tmpdir(), "own.json");
  fs.writeFileSync(ownFile, JSON.stringify(exported));
  await opt.setInputFiles("#importFile", ownFile); await opt.waitForTimeout(400);
  check(/Imported 4 profile/.test(await opt.textContent("#ioMsg")), "Pro: re-importing our own export works");

  console.log("\n[5] Sync");
  await opt.check("#syncEnabled"); await opt.waitForTimeout(400);
  const synced = await opt.evaluate(async () => (await chrome.storage.sync.get("syncedProfiles")).syncedProfiles);
  check(synced && synced.profiles.length >= 4, `sync on: profiles written to chrome.storage.sync (${synced?.profiles.length})`);
  // large profile set vs 8 KB per-item quota
  const big = await opt.evaluate(async () => {
    const { state } = await chrome.storage.local.get("state");
    const jwt = "eyJ" + "a".repeat(900);
    state.profiles[0].rules.push(...Array.from({ length: 12 }, (_, i) => ({ id: "big" + i, enabled: false, type: "request", op: "set", name: "Authorization", value: "Bearer " + jwt, urlFilter: "", comment: "" })));
    const mod = await import(chrome.runtime.getURL("lib/storage.js"));
    await mod.saveState(state);
    const { syncedProfiles } = await chrome.storage.sync.get("syncedProfiles");
    return { localRules: state.profiles[0].rules.length, syncedRules: syncedProfiles.profiles[0].rules.length, bytes: JSON.stringify(state.profiles).length };
  });
  check(big.syncedRules === big.localRules, `sync keeps up with ~${Math.round(big.bytes / 1024)} KB of profiles (local ${big.localRules} rules, synced ${big.syncedRules})`);

  console.log("\n[6] Second device (fresh browser, same Google account data)");
  // Simulate device B: fresh profile whose chrome.storage.sync already holds device A's data.
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "hr-b-"));
  const b = await launch(dirB);
  const optB = await b.ctx.newPage();
  await optB.goto(`chrome-extension://${b.extId}/options/options.html`); await optB.waitForTimeout(400);
  await optB.evaluate(async (synced) => { await chrome.storage.sync.set({ syncedProfiles: synced }); }, { profiles: exported.profiles.map((p, i) => ({ id: "pa" + i, name: p.name, enabled: true, rules: p.rules.map((r, j) => ({ ...r, id: `ra${i}_${j}` })) })), activeProfileId: "pa0", updatedAt: Date.now() });
  api.mode = "ok";
  await optB.fill("#licenseKey", "REAL-KEY-123"); await optB.click("#activateBtn"); await optB.waitForTimeout(500);
  await optB.check("#syncEnabled"); await optB.waitForTimeout(400);
  await optB.reload(); await optB.waitForTimeout(600);
  const devB = await optB.evaluate(async () => ({
    local: (await chrome.storage.local.get("state")).state.profiles.map((p) => p.name),
    cloud: (await chrome.storage.sync.get("syncedProfiles")).syncedProfiles.profiles.map((p) => p.name)
  }));
  check(devB.local.length === 4, `device B receives device A's 4 profiles after turning sync on (B has: ${JSON.stringify(devB.local)})`);
  check(devB.cloud.length === 4, `device A's synced copy survives B turning sync on (cloud now: ${JSON.stringify(devB.cloud)})`);
  await b.ctx.close();

  console.log("\n[7] Refund / disabled key and offline grace");
  api.mode = "disabled";
  await opt.evaluate(async () => { const { state } = await chrome.storage.local.get("state"); state.license.validatedAt = Date.now() - 8 * 864e5; await chrome.storage.local.set({ state }); });
  await opt.evaluate(() => new Promise((r) => chrome.runtime.sendMessage({ type: "headrule:checkLicense" }, r)));
  await opt.waitForTimeout(500);
  const afterRefund = await opt.evaluate(async () => (await chrome.storage.local.get("state")).state.license.status);
  check(afterRefund === "disabled", `refunded (disabled) key detected by weekly check (status "${afterRefund}")`);
  await opt.reload(); await opt.waitForTimeout(400);
  check(!(await opt.isVisible("#licensePro")) && /disabled/.test(await opt.textContent("#licenseStatus")), `options shows: "${await opt.textContent("#licenseStatus")}"`);
  api.mode = "offline";
  await opt.evaluate(async () => { const { state } = await chrome.storage.local.get("state"); state.license.status = "active"; state.license.validatedAt = Date.now() - 8 * 864e5; await chrome.storage.local.set({ state }); });
  await opt.evaluate(() => new Promise((r) => chrome.runtime.sendMessage({ type: "headrule:checkLicense" }, r)));
  await opt.waitForTimeout(400);
  const offl = await opt.evaluate(async () => { const m = await import(chrome.runtime.getURL("lib/license.js")); const { state } = await chrome.storage.local.get("state"); return m.isPro(state.license); });
  check(offl === true, "offline for 8 days: Pro keeps working (grace period)");
  const offl31 = await opt.evaluate(async () => { const m = await import(chrome.runtime.getURL("lib/license.js")); const { state } = await chrome.storage.local.get("state"); state.license.validatedAt = Date.now() - 31 * 864e5; return m.isPro(state.license); });
  check(offl31 === false, "offline for 31 days: Pro pauses until the next successful check");

  console.log("\n[8] Deactivate frees a slot");
  api.mode = "ok"; api.calls.length = 0;
  await opt.evaluate(async () => { const { state } = await chrome.storage.local.get("state"); state.license.status = "active"; state.license.validatedAt = Date.now(); await chrome.storage.local.set({ state }); });
  await opt.reload(); await opt.waitForTimeout(400);
  await opt.click("#deactivateBtn"); await opt.waitForTimeout(400);
  check(api.calls.some((c) => c.ep === "deactivate" && c.params.instance_id === "inst-1"), "deactivate sends the instance id to the license server");
  check(await opt.isVisible("#licenseFree"), "after deactivation the browser is back on Free");

  console.log("\n[9] Options tab left open while rules are edited in the popup");
  await opt.evaluate(async () => { const { state } = await chrome.storage.local.get("state"); state.license = null; await chrome.storage.local.set({ state }); });
  await opt.reload(); await opt.waitForTimeout(400);
  const pop2 = await ctx.newPage(); await pop2.goto(`chrome-extension://${extId}/popup/popup.html`); await pop2.waitForTimeout(300);
  await pop2.click("#addRule"); await pop2.waitForTimeout(100);
  await pop2.locator("#rulesBody tr[data-id]").last().locator("input[data-f=name]").fill("X-Edited-In-Popup");
  await pop2.waitForTimeout(500); await pop2.close();
  api.mode = "ok";
  await opt.fill("#licenseKey", "REAL-KEY-123"); await opt.click("#activateBtn"); await opt.waitForTimeout(600);
  const kept = await opt.evaluate(async () => (await chrome.storage.local.get("state")).state.profiles.some((p) => p.rules.some((r) => r.name === "X-Edited-In-Popup")));
  check(kept, "activating Pro in an options tab opened earlier keeps rules edited in the popup since");
} finally {
  await ctx.close();
  server.close();
}
const failed = results.filter(([ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (warnings.length) console.log("console warnings:", [...new Set(warnings)].slice(0, 5));
