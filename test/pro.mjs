// Pro and import end-to-end checks in a real Chromium, with the Lemon Squeezy
// License API mocked at the network layer (same response shapes as its docs).
// Usage: node test/pro.mjs
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Lets context.route() see requests made by the extension's service worker.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const { chromium } = await import("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, "..", "extension");
const STORE_ID = 473656, PRODUCT_ID = 1362488;
const results = [];
function check(cond, msg) { results.push([!!cond, msg]); console.log(`  ${cond ? "ok  " : "FAIL"} - ${msg}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function echoServer() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ url: req.url, headers: req.headers }));
    });
    s.listen(0, "127.0.0.1", () => resolve({ s, port: s.address().port }));
  });
}

// Mock License API; api.mode picks the answer.
const api = { mode: "ok", calls: [] };
function lemonSqueezy(route) {
  const ep = new URL(route.request().url()).pathname.split("/").pop();
  const params = Object.fromEntries(new URLSearchParams(route.request().postData() || ""));
  api.calls.push({ ep, params });
  const meta = { store_id: STORE_ID, order_id: 1, order_item_id: 1, product_id: PRODUCT_ID, product_name: "Headrule Pro", variant_id: 99, variant_name: "Default", customer_id: 1, customer_name: "Test", customer_email: "buyer@example.com" };
  const lk = (status) => ({ id: 1, status, key: params.license_key, activation_limit: 5, activation_usage: 1, created_at: "2026-09-18T00:00:00Z", expires_at: null });
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (api.mode === "offline") return route.abort("internetdisconnected");
  if (ep === "activate") {
    if (api.mode === "limit") return json(400, { activated: false, error: "This license key has reached the activation limit.", license_key: lk("active"), meta });
    if (api.mode === "otherproduct") return json(200, { activated: true, error: null, license_key: lk("active"), instance: { id: "inst-x" }, meta: { ...meta, product_id: 1 } });
    if (api.mode === "notfound") return json(404, { activated: false, error: "license_key not found.", license_key: null, meta: null });
    return json(200, { activated: true, error: null, license_key: lk("active"), instance: { id: "inst-1", name: params.instance_name }, meta });
  }
  if (ep === "validate") {
    if (api.mode === "disabled") return json(200, { valid: false, error: null, license_key: lk("disabled"), instance: null, meta });
    if (api.mode === "instance_gone") return json(404, { valid: false, error: "license_key instance not found.", license_key: lk("active"), instance: null, meta });
    return json(200, { valid: true, error: null, license_key: lk("active"), instance: { id: "inst-1" }, meta });
  }
  if (ep === "deactivate") return json(200, { deactivated: true, error: null, license_key: lk("inactive"), meta });
  return json(404, {});
}

async function launch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "headrule-pro-"));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium", headless: true, acceptDownloads: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`], viewport: { width: 1100, height: 900 }
  });
  await ctx.route("https://api.lemonsqueezy.com/**", lemonSqueezy);
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = new URL(sw.url()).host;
  await sleep(600);
  for (const p of ctx.pages()) if (p.url().includes("options.html")) await p.close(); // opened on install
  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options/options.html`);
  await sleep(300);
  return { ctx, extId, opt, dir };
}

const getState = (page) => page.evaluate(async () => (await chrome.storage.local.get("state")).state);
// Runs `mutate(state)` inside the extension and saves the result.
const setState = (page, mutate) => page.evaluate(`(async () => {
  const { state } = await chrome.storage.local.get("state");
  const next = (${mutate.toString()})(state) || state;
  await chrome.storage.local.set({ state: next });
  await new Promise((r) => setTimeout(r, 700));
})()`);
const ruleStatus = (page) => page.evaluate(async () => (await chrome.storage.session.get("ruleStatus")).ruleStatus);
const remoteNames = (page) => page.evaluate(async () => { const m = await import(chrome.runtime.getURL("lib/sync.js")); const r = await m.readRemote(); return r && !r.incomplete ? r.profiles.map((p) => p.name) : r; });
async function importFile(page, data) {
  const f = path.join(os.tmpdir(), `import-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(data));
  await page.setInputFiles("#importFile", f);
  await sleep(500);
  return page.textContent("#ioMsg");
}
async function activate(page, key = "REAL-KEY-123") {
  api.mode = "ok";
  await page.fill("#licenseKey", key);
  await page.click("#activateBtn");
  await sleep(600);
}

const { s: server, port } = await echoServer();
const base = `http://127.0.0.1:${port}`;
const A = await launch();
const { ctx, extId, opt } = A;
const B = { ctx: null };
try {
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  const headersFor = (p) => page.evaluate(async (p) => (await (await fetch(p)).json()).headers, p);

  console.log("\n[1] Free plan");
  check(!(await opt.isDisabled("#importBtn")) && !(await opt.isDisabled("#exportBtn")), "free: import and export are available");
  check(await opt.isDisabled("#syncEnabled"), "free: sync checkbox disabled (Pro)");
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  await sleep(300);
  await popup.click("#profileAdd");
  await sleep(200);
  check(await popup.isVisible("#upsell") && /Pro feature/.test(await popup.textContent("#upsellText")), "free: a 2nd profile shows the Pro upsell");
  check((await popup.getAttribute("#upsellLink", "href")).includes("headrule.lemonsqueezy.com/checkout/buy/116bb731"), "free: upsell links to the live checkout");
  await popup.close();
  await setState(opt, (s) => { s.profiles[0].rules = [{ id: "rx", enabled: true, type: "request", op: "set", name: "X-Regex", value: "1", urlFilter: "regex:/echo/regex", comment: "" }]; });
  check(/Pro feature/.test((await ruleStatus(opt))?.errors?.rx || ""), "free: regex URL filter rejected with a 'Pro feature' message");

  console.log("\n[2] ModHeader import (free)");
  const mh = [
    { title: "Staging API", shortTitle: "1", version: 2, appendMode: false,
      headers: [{ enabled: true, name: "X-Token", value: "secret-staging-token", comment: "staging only" }, { enabled: true, name: "Accept-Language", value: "" }],
      respHeaders: [{ enabled: true, name: "X-Resp", value: "r" }],
      urlFilters: [{ enabled: true, urlRegex: `.*://127\\.0\\.0\\.1:${port}/echo/api.*` }] },
    { title: "Two filters", headers: [{ enabled: true, name: "X-Two", value: "2" }],
      urlFilters: [{ enabled: true, urlRegex: `.*://127\\.0\\.0\\.1:${port}/echo/a.*` }, { enabled: true, urlRegex: `.*://127\\.0\\.0\\.1:${port}/echo/b.*` }] },
    { title: "Old style filters", headers: [{ enabled: true, name: "X-Old", value: "o" }], filters: [{ enabled: true, type: "urls", urlRegex: `http://127.0.0.1:${port}/echo/old.*` }] },
    { title: "Excluded", headers: [{ enabled: true, name: "X-Excl", value: "e" }], excludeUrlFilters: [{ enabled: true, urlRegex: ".*google.*" }] },
    { title: "Complex regex", headers: [{ enabled: true, name: "X-Complex", value: "c" }], urlFilters: [{ enabled: true, urlRegex: `.*/echo/v[0-9]+/.*` }] },
    { title: "Cookies", headers: [], cookieHeaders: [{ enabled: true, name: "c", value: "1" }] }
  ];
  const msg = await importFile(opt, mh);
  check(/Imported 6 profile\(s\)/.test(msg), `import message: "${msg}"`);
  const st = await getState(opt);
  const byName = Object.fromEntries(st.profiles.map((p) => [p.name, p]));
  check(["Staging API", "Two filters", "Old style filters", "Excluded", "Complex regex", "Cookies"].every((n) => byName[n]), "profile names come from ModHeader 'title'");
  const tok = byName["Staging API"]?.rules.find((r) => r.name === "X-Token");
  check(tok && tok.urlFilter === `||127.0.0.1:${port}/echo/api` && tok.enabled, `URL filter converted ("${tok?.urlFilter}")`);
  check(byName["Staging API"]?.rules.find((r) => r.name === "Accept-Language")?.op === "remove", "empty ModHeader value imports as Remove");
  check(byName["Two filters"]?.rules.length === 2, "two ModHeader filters become two rules");
  check(byName["Old style filters"]?.rules[0]?.urlFilter === `|http://127.0.0.1:${port}/echo/old`, `older 'filters' format converted ("${byName["Old style filters"]?.rules[0]?.urlFilter}")`);
  check(byName["Excluded"]?.rules[0]?.enabled === false && /not supported/.test(byName["Excluded"]?.rules[0]?.comment), "profile with exclude filters imports switched off, with a note");
  check(byName["Complex regex"]?.rules[0]?.urlFilter.startsWith("regex:"), "complex regex kept as a regex filter");
  check(/regular-expression URL filter, which needs Pro/.test(msg) && /skipped/.test(msg) && /switched off/.test(msg), "import message explains regex, skipped and switched-off items");
  // Use the imported profile and prove the token only goes where the filter says.
  await setState(opt, (s) => { s.activeProfileId = s.profiles.find((p) => p.name === "Staging API").id; });
  const onApi = await headersFor("/echo/api/users");
  const elsewhere = await headersFor("/echo/other");
  check(onApi["x-token"] === "secret-staging-token", "imported token is sent to the filtered URL");
  check(elsewhere["x-token"] === undefined, "imported token is NOT sent to other URLs");

  console.log("\n[3] Activation");
  for (const [mode, re, label] of [["notfound", /not found/i, "unknown key"], ["limit", /activation limit/i, "6th browser (limit 5)"], ["otherproduct", /different product/i, "key for another product"], ["offline", /Could not reach the license server/, "offline"]]) {
    api.mode = mode;
    await opt.fill("#licenseKey", "KEY-" + mode);
    await opt.click("#activateBtn");
    await sleep(500);
    const err = await opt.textContent("#licenseError");
    check(await opt.isVisible("#licenseError") && re.test(err) && !(await opt.isVisible("#licensePro")), `${label}: clear error, Pro stays locked ("${err}")`);
  }
  api.calls.length = 0;
  await activate(opt, "  REAL-KEY-123  ");
  check(await opt.isVisible("#licensePro") && /Pro active · buyer@example.com/.test(await opt.textContent("#licenseStatus")), "valid key: Pro active with buyer email");
  const act = api.calls.find((c) => c.ep === "activate");
  check(act?.params.license_key === "REAL-KEY-123" && /^Headrule on /.test(act?.params.instance_name), `activation sends trimmed key and device label ("${act?.params.instance_name}")`);

  console.log("\n[4] Pro features");
  await setState(opt, (s) => { s.profiles[0].rules = [{ id: "rx", enabled: true, type: "request", op: "set", name: "X-Regex", value: "1", urlFilter: "regex:/echo/regex", comment: "" }]; s.activeProfileId = s.profiles[0].id; });
  check(!(await ruleStatus(opt))?.errors?.rx, "Pro: regex rule accepted by Chrome");
  check((await headersFor("/echo/regex"))["x-regex"] === "1" && (await headersFor("/echo/plain"))["x-regex"] === undefined, "Pro: regex filter matches only its URLs");
  const complex = (await getState(opt)).profiles.find((p) => p.name === "Complex regex");
  await setState(opt, (s) => { s.activeProfileId = s.profiles.find((p) => p.name === "Complex regex").id; });
  check((await headersFor("/echo/v2/x"))["x-complex"] === "c", "Pro: imported regex filter works once Pro is active");
  const popup2 = await ctx.newPage();
  await popup2.goto(`chrome-extension://${extId}/popup/popup.html`);
  await sleep(300);
  const before = (await getState(opt)).profiles.length;
  for (const name of ["Production", "Client A"]) {
    await popup2.click("#profileAdd"); await sleep(100);
    await popup2.fill("#profileNameInput", name); await popup2.press("#profileNameInput", "Enter"); await sleep(250);
  }
  check((await getState(opt)).profiles.length === before + 2, "Pro: more profiles can be created in the popup");
  await popup2.close();
  const [dl] = await Promise.all([opt.waitForEvent("download"), opt.click("#exportBtn")]);
  const exported = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check(exported.app === "headrule" && exported.profiles.length === before + 2, `export downloads every profile (${exported.profiles.length})`);
  const round = await importFile(opt, exported);
  check(new RegExp(`Imported ${before + 2} profile`).test(round), "our own export imports back");
  await setState(opt, (s) => { s.profiles = s.profiles.slice(0, 4); s.activeProfileId = s.profiles[0].id; });

  console.log("\n[5] Sync on the first browser");
  await opt.reload(); await sleep(300);
  await opt.click("#syncEnabled");
  await sleep(4200);
  let names = await remoteNames(opt);
  check(Array.isArray(names) && names.length === 4, `turning sync on uploads this browser's profiles (${JSON.stringify(names)})`);
  check(/Synced/.test(await opt.textContent("#syncMsg")), `options shows sync status ("${await opt.textContent("#syncMsg")}")`);
  await setState(opt, (s) => { s.profiles[0].name = "Renamed on A"; });
  await sleep(4200);
  names = await remoteNames(opt);
  check(names?.[0] === "Renamed on A", "a later edit reaches Chrome sync within a few seconds");
  const bigOk = await opt.evaluate(async () => {
    const { state } = await chrome.storage.local.get("state");
    const jwt = "eyJ" + "a".repeat(1500);
    state.profiles[1].rules = Array.from({ length: 30 }, (_, i) => ({ id: "big" + i, enabled: false, type: "request", op: "set", name: "Authorization", value: "Bearer " + jwt + i, urlFilter: "", comment: "" }));
    await chrome.storage.local.set({ state });
    return JSON.stringify(state.profiles).length;
  });
  await sleep(4200);
  const bigRemote = await opt.evaluate(async () => { const m = await import(chrome.runtime.getURL("lib/sync.js")); const r = await m.readRemote(); const keys = Object.keys(await chrome.storage.sync.get(null)); return { rules: r?.profiles?.[1]?.rules?.length, chunks: keys.filter((k) => /^hr_sync_\d+$/.test(k)).length }; });
  check(bigRemote.rules === 30 && bigRemote.chunks > 1, `~${Math.round(bigOk / 1024)} KB of profiles sync in ${bigRemote.chunks} chunks (8 KB per item limit)`);
  await opt.evaluate(async () => {
    const { state } = await chrome.storage.local.get("state");
    state.profiles[1].rules = state.profiles[1].rules.concat(Array.from({ length: 40 }, (_, i) => ({ id: "huge" + i, enabled: false, type: "request", op: "set", name: "Authorization", value: "Bearer " + "b".repeat(1500) + i, urlFilter: "", comment: "" })));
    await chrome.storage.local.set({ state });
  });
  await sleep(4200);
  const tooBig = await opt.textContent("#syncMsg");
  check(/sync is paused/.test(tooBig), `too much data: clear message instead of silent failure ("${tooBig.slice(0, 80)}...")`);
  await setState(opt, (s) => { s.profiles[1].rules = []; });
  await sleep(4200);
  check(/Synced/.test(await opt.textContent("#syncMsg")), "sync resumes after deleting rules");

  console.log("\n[6] Changes from another browser");
  await opt.evaluate(async () => {
    const m = await import(chrome.runtime.getURL("lib/sync.js"));
    const r = await m.readRemote();
    const profiles = r.profiles.map((p, i) => (i === 0 ? { ...p, name: "Edited on laptop" } : p));
    await m.writeRemote(profiles, "d_other_browser");
  });
  await sleep(1500);
  check((await getState(opt)).profiles[0].name === "Edited on laptop", "an update from another browser is applied here");

  console.log("\n[7] Second browser");
  const cloud = await opt.evaluate(async () => Object.fromEntries(Object.entries(await chrome.storage.sync.get(null))));
  Object.assign(B, await launch());
  await B.opt.evaluate(async (items) => { await chrome.storage.sync.set(items); }, cloud); // what Chrome sync would deliver
  await activate(B.opt);
  await B.opt.click("#syncEnabled");
  await sleep(1200);
  const bNames = (await getState(B.opt)).profiles.map((p) => p.name);
  check(bNames.length === 4 && bNames[0] === "Edited on laptop", `a fresh browser receives the synced profiles (${JSON.stringify(bNames)})`);
  check((await remoteNames(B.opt))?.length === 4, "the synced copy is not overwritten by the fresh browser");
  // A browser that already has its own rules gets asked.
  await B.opt.click("#syncEnabled"); await sleep(300);
  await setState(B.opt, (s) => { s.profiles = [{ id: "p_own", name: "Own on B", enabled: true, rules: [{ id: "rb", enabled: true, type: "request", op: "set", name: "X-B", value: "b", urlFilter: "", comment: "" }] }]; s.activeProfileId = "p_own"; });
  await B.opt.click("#syncEnabled"); await sleep(600); // box stays unticked until the user chooses
  check(await B.opt.isVisible("#syncChoice"), "a browser with its own rules is asked: merge, use synced or use local");
  await B.opt.click("#syncMerge");
  await sleep(4200);
  const merged = (await getState(B.opt)).profiles.map((p) => p.name);
  check(merged.length === 5 && merged.includes("Own on B") && merged.includes("Edited on laptop"), `Merge keeps both sides (${JSON.stringify(merged)})`);
  check((await remoteNames(B.opt))?.length === 5, "the merged set is uploaded");
  await B.opt.click("#syncEnabled"); await sleep(300);
  check((await remoteNames(B.opt))?.length === 5 && await B.opt.isVisible("#syncClear"), "turning sync off keeps the synced copy for other browsers");
  await B.opt.click("#syncClear"); await sleep(400);
  check((await remoteNames(B.opt)) === null, "'Delete the synced copy' removes it from Chrome sync");
  await B.ctx.close(); B.ctx = null;

  console.log("\n[8] License changes after purchase");
  const expire = (page, status = "active") => setState(page, (s) => { s.license.validatedAt = Date.now() - 8 * 864e5; });
  const recheck = (page) => page.evaluate(() => new Promise((r) => chrome.runtime.sendMessage({ type: "headrule:checkLicense" }, r)));
  api.mode = "disabled"; await expire(opt); await recheck(opt); await sleep(400);
  check((await getState(opt)).license.status === "disabled", "refund (key disabled) is detected by the weekly check");
  check(!(await opt.isVisible("#licensePro")) && /disabled/.test(await opt.textContent("#licenseStatus")), `options explains it ("${await opt.textContent("#licenseStatus")}")`);
  api.mode = "instance_gone"; await setState(opt, (s) => { s.license.status = "active"; }); await expire(opt); await recheck(opt); await sleep(400);
  check((await getState(opt)).license.status === "invalid", "activation removed on the server: Pro turns off here (status invalid)");
  api.mode = "offline"; await setState(opt, (s) => { s.license.status = "active"; }); await expire(opt); await recheck(opt); await sleep(400);
  const grace = await opt.evaluate(async () => { const m = await import(chrome.runtime.getURL("lib/license.js")); const { state } = await chrome.storage.local.get("state"); const now = m.isPro(state.license); state.license.validatedAt = Date.now() - 31 * 864e5; return [now, m.isPro(state.license)]; });
  check(grace[0] === true && grace[1] === false, "offline: Pro keeps working for 30 days, then pauses until the next successful check");

  console.log("\n[9] Deactivate");
  api.mode = "ok"; api.calls.length = 0;
  await setState(opt, (s) => { s.license.status = "active"; s.license.validatedAt = Date.now(); });
  await opt.click("#deactivateBtn"); await sleep(500);
  check(api.calls.some((c) => c.ep === "deactivate" && c.params.instance_id === "inst-1"), "deactivate frees the slot on the license server");
  check(await opt.isVisible("#licenseFree") && !(await getState(opt)).settings.syncEnabled, "this browser is back on Free with sync off");

  console.log("\n[10] Options tab left open while rules change in the popup");
  const pop3 = await ctx.newPage();
  await pop3.goto(`chrome-extension://${extId}/popup/popup.html`); await sleep(300);
  await pop3.click("#addRule"); await sleep(100);
  await pop3.locator("#rulesBody tr[data-id]").last().locator("input[data-f=name]").fill("X-Edited-In-Popup");
  await sleep(500); await pop3.close();
  await activate(opt);
  const kept = (await getState(opt)).profiles.some((p) => p.rules.some((r) => r.name === "X-Edited-In-Popup"));
  check(kept, "activating Pro in an options tab opened earlier keeps rules edited in the popup since");
  await opt.click("#showBadge"); await sleep(300);
  check((await getState(opt)).profiles.some((p) => p.rules.some((r) => r.name === "X-Edited-In-Popup")), "changing a setting there keeps them too");

  console.log("\n[11] Updating from 1.0.0 with sync already on");
  // 1.0.0 kept one "syncedProfiles" item, and a second browser could have
  // overwritten it with its starter profile. The update must not lose rules.
  const C = await launch();
  B.ctx = C.ctx;
  const realRules = [{ id: "p_real", name: "Real work", enabled: true, rules: [{ id: "rr", enabled: true, type: "request", op: "set", name: "X-Real", value: "1", urlFilter: "", comment: "" }] }];
  await C.opt.evaluate(async (profiles) => {
    const { state } = await chrome.storage.local.get("state");
    state.profiles = profiles; state.activeProfileId = profiles[0].id;
    state.settings.syncEnabled = true;
    state.license = { key: "K", instanceId: "inst-1", status: "active", validatedAt: Date.now() };
    await chrome.storage.local.set({ state });
    await chrome.storage.local.remove("syncInfo");
    await chrome.storage.sync.set({ syncedProfiles: { profiles: [{ id: "p_def", name: "Default", enabled: true, rules: [{ id: "r0", enabled: true, type: "request", op: "set", name: "X-Headrule", value: "hello", urlFilter: "", comment: "" }] }], activeProfileId: "p_def", updatedAt: Date.now() } });
  }, realRules);
  await C.opt.evaluate(() => new Promise((r) => chrome.runtime.sendMessage({ type: "headrule:syncNow" }, r)));
  await sleep(4500);
  const upgraded = (await getState(C.opt)).profiles.map((p) => p.name);
  check(JSON.stringify(upgraded) === JSON.stringify(["Real work"]), `a starter profile left by 1.0.0 does not replace real rules (${JSON.stringify(upgraded)})`);
  const legacyGone = await C.opt.evaluate(async () => !(await chrome.storage.sync.get("syncedProfiles")).syncedProfiles);
  check(JSON.stringify(await remoteNames(C.opt)) === JSON.stringify(["Real work"]) && legacyGone, "the synced copy is rewritten in the new format and the old item removed");
  // Another browser's real profiles waiting in sync on first run: keep both.
  await C.opt.evaluate(async () => {
    await chrome.storage.local.remove("syncInfo");
    const m = await import(chrome.runtime.getURL("lib/sync.js"));
    await m.writeRemote([{ id: "p_laptop", name: "Laptop work", enabled: true, rules: [{ id: "rl", enabled: true, type: "request", op: "set", name: "X-Laptop", value: "1", urlFilter: "", comment: "" }] }], "d_laptop");
  });
  await sleep(4500);
  const both = (await getState(C.opt)).profiles.map((p) => p.name).sort();
  check(JSON.stringify(both) === JSON.stringify(["Laptop work", "Real work"]), `first sync on a browser with its own rules merges instead of replacing (${JSON.stringify(both)})`);
  check(JSON.stringify((await remoteNames(C.opt))?.sort()) === JSON.stringify(["Laptop work", "Real work"]), "the merged set is uploaded");
} finally {
  if (B.ctx) await B.ctx.close();
  await ctx.close();
  server.close();
}
const failed = results.filter(([ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} Pro checks passed`);
if (failed.length) process.exit(1);
