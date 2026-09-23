// UI audit for the popup: axe-core (WCAG 2.2 AA) in light and dark mode,
// small click targets (WCAG 2.5.8, 24x24 px), and screenshots for review.
//
// Usage: node test/ui-audit.mjs [--out dir] [--strict]
//   --strict  exit 1 if axe finds violations or targets are too small
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), "headrule-ui-"));
const STRICT = process.argv.includes("--strict");
fs.mkdirSync(OUT, { recursive: true });

const RULES = [
  { id: "r1", enabled: true, type: "request", op: "set", name: "X-Headrule-Test", value: "applied", urlFilter: "", comment: "" },
  { id: "r2", enabled: true, type: "request", op: "set", name: "Authorization", value: "Bearer test-token", urlFilter: "||api.staging.example.com", comment: "" },
  { id: "r3", enabled: true, type: "request", op: "remove", name: "Accept-Language", value: "", urlFilter: "", comment: "" },
  { id: "r4", enabled: false, type: "response", op: "set", name: "X-Echo-Original", value: "rewritten", urlFilter: "||localhost", comment: "" },
  { id: "r5", enabled: true, type: "request", op: "append", name: "X-Bad-Append", value: "x", urlFilter: "", comment: "" }
];

function stateWith(rules, enabled = true) {
  return {
    version: 1, enabled, activeProfileId: "p1",
    profiles: [{ id: "p1", name: "Staging", enabled: true, rules }],
    settings: { syncEnabled: false, showBadge: true }, license: null
  };
}

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "headrule-audit-"));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium", headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 800, height: 600 }, deviceScaleFactor: 2
});

let failed = false;
try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 15000 });
  const extId = new URL(sw.url()).host;
  const url = `chrome-extension://${extId}/popup/popup.html`;
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extId}/options/options.html`);

  async function scenario(name, state, scheme) {
    await helper.evaluate(async (s) => { await chrome.storage.local.set({ state: s }); }, state);
    await new Promise((r) => setTimeout(r, 700));
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 680, height: 420 });
    await page.goto(url);
    await page.waitForTimeout(700);
    const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
    await page.setViewportSize({ width: Math.min(800, Math.max(size.w, 300)), height: Math.min(600, Math.max(size.h, 120)) });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `popup-${name}-${scheme}.png`) });

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("button, input, select, a, [role=button]")) {
        if (el.type === "hidden" || el.hidden || el.closest("[hidden]")) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // Checkboxes inside a label count the label as the target.
        const label = el.closest("label");
        const lr = label ? label.getBoundingClientRect() : r;
        const w = Math.max(r.width, lr.width), h = Math.max(r.height, lr.height);
        if (w < 24 || h < 24) out.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.dataset.f ? "[" + el.dataset.f + "]" : ""}${el.dataset.act ? "[" + el.dataset.act + "]" : ""} ${Math.round(w)}x${Math.round(h)}`);
      }
      return [...new Set(out)];
    });
    console.log(`\n[${name} / ${scheme}] popup ${size.w}x${size.h}`);
    if (axe.violations.length) {
      for (const v of axe.violations) {
        console.log(`  AXE ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
        for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(" ")}`);
      }
    } else console.log("  axe: 0 violations");
    if (small.length) console.log(`  targets under 24px: ${small.join(", ")}`);
    else console.log("  targets: all >= 24px");
    if (axe.violations.length || small.length) failed = true;
    await page.close();
  }

  for (const scheme of ["light", "dark"]) {
    await scenario("rules", stateWith(RULES), scheme);
  }
  await scenario("empty", stateWith([]), "light");
  await scenario("paused", stateWith(RULES, false), "light");

  // Behaviour checks for the popup interactions added in 1.0.2.
  const check = (cond, msg) => { console.log(`  ${cond ? "ok  " : "FAIL"} - ${msg}`); if (!cond) failed = true; };
  const getRules = () => helper.evaluate(async () => (await chrome.storage.local.get("state")).state.profiles[0].rules);
  console.log("\n[interactions]");
  await helper.evaluate(async (s) => { await chrome.storage.local.set({ state: s }); }, stateWith(RULES));
  await new Promise((r) => setTimeout(r, 500));
  let page = await context.newPage();
  await page.goto(url); await page.waitForTimeout(500);
  await page.click('#rulesBody tr[data-id="r1"] button[data-act="delete"]');
  await page.waitForTimeout(500);
  check((await getRules()).length === RULES.length - 1, "delete removes the rule from storage");
  check(await page.isVisible("#undoBtn") && /Deleted "X-Headrule-Test"/.test(await page.textContent("#status")), "delete offers Undo with the header name");
  check(await page.evaluate(() => document.activeElement?.dataset.act === "delete"), "focus moves to the next row's delete button");
  await page.click("#undoBtn"); await page.waitForTimeout(500);
  const restored = await getRules();
  check(restored.length === RULES.length && restored[0].id === "r1", "Undo puts the rule back in its original position");
  check(!(await page.isVisible("#undoBtn")), "Undo button hides after use");
  await page.close();

  await helper.evaluate(async (s) => { await chrome.storage.local.set({ state: s }); }, stateWith([]));
  await new Promise((r) => setTimeout(r, 500));
  page = await context.newPage();
  await page.goto(url); await page.waitForTimeout(500);
  check(!(await page.isVisible("#rulesTable")) && await page.isVisible("#empty"), "empty profile shows the empty state instead of an empty table");
  await page.click('button[data-preset="cors"]'); await page.waitForTimeout(500);
  const added = await getRules();
  check(added.length === 1 && added[0].type === "response" && added[0].name === "Access-Control-Allow-Origin" && added[0].value === "*", "CORS example adds a response rule");
  check(await page.evaluate(() => document.activeElement?.dataset.f === "urlFilter"), "focus lands on the field to edit next");
  await page.close();
  console.log(`\nscreenshots: ${OUT}`);
} finally {
  await context.close();
}
if (STRICT && failed) process.exit(1);
