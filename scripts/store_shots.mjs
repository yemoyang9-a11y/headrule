// Renders the three Chrome Web Store screenshots (1280x800) from HTML so the
// type is large enough to read on the store's small preview.
// Needs store/raw-popup.png (node test/smoke.mjs --shots).
// Usage: node scripts/store_shots.mjs
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "store");
const b64 = (f) => `data:image/png;base64,${fs.readFileSync(path.join(STORE, f)).toString("base64")}`;
const icon = b64("icon-512.png");
const popup = b64("raw-popup.png");

const base = `
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; font-family: "Noto Sans CJK KR", "Liberation Sans", sans-serif;
         color: #fff; background: radial-gradient(1200px 700px at 20% 0%, #1b2b4d 0%, #0d1117 60%); }
  .brand { position: absolute; left: 64px; top: 48px; display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 30px; }
  .brand img { width: 48px; height: 48px; border-radius: 12px; }
  h1 { font-weight: 900; letter-spacing: -0.02em; line-height: 1.08; }
  .sub { color: #b9c6da; font-weight: 500; }
  .accent { color: #58a6ff; }
  .pill { display: inline-block; background: #1f6feb; color: #fff; font-weight: 700; border-radius: 999px; }
</style>`;

const shot1 = `${base}
<style>
  h1 { position: absolute; left: 64px; top: 128px; font-size: 76px; }
  .sub { position: absolute; left: 64px; top: 232px; font-size: 32px; }
  /* The raw popup is 680x262 logical px (plus blank space below); shown at 1100px wide. */
  .stage { position: absolute; left: 90px; top: 336px; width: 1100px; height: 424px; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
  .clip { position: absolute; inset: 0; overflow: hidden; border-radius: 18px; }
  .clip img { width: 100%; display: block; }
  /* Highlight boxes in % of the popup image so they follow its size. */
  .hl { position: absolute; border: 4px solid #58a6ff; border-radius: 14px; box-shadow: 0 0 0 9999px rgba(0,0,0,0) ; }
  .hl .pill { position: absolute; left: 50%; top: -22px; transform: translateX(-50%); white-space: nowrap; font-size: 21px; padding: 6px 14px; }
</style>
<div class="brand"><img src="${icon}">Headrule</div>
<h1>Change any HTTP header.</h1>
<div class="sub">Request or response. Per URL or domain. <span class="accent">Free.</span></div>
<div class="stage">
  <div class="clip"><img src="${popup}"></div>
  <div class="hl" style="left:222px; width:146px; top:92px; height:250px"><span class="pill">Set, append, remove</span></div>
  <div class="hl" style="left:814px; width:228px; top:92px; height:250px"><span class="pill">Only where you point it</span></div>
</div>
`;

const shot2 = `${base}
<style>
  .wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .wrap img { width: 150px; height: 150px; border-radius: 34px; margin-bottom: 40px; box-shadow: 0 20px 60px rgba(31,111,235,.45); }
  h1 { font-size: 72px; }
  .list { margin-top: 44px; display: flex; gap: 22px; }
  .item { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 22px 26px; width: 360px; text-align: left; }
  .item b { display: block; font-size: 28px; margin-bottom: 8px; }
  .item span { color: #b9c6da; font-size: 21px; line-height: 1.4; }
</style>
<div class="wrap">
  <img src="${icon}">
  <h1>No account. No tracking.</h1>
  <div class="list">
    <div class="item"><b>Never reads pages</b><span>No content scripts. Chrome's own engine changes the headers.</span></div>
    <div class="item"><b>No server of ours</b><span>Rules stay in your browser. Pro sync uses your Chrome account.</span></div>
    <div class="item"><b>Source is public</b><span>One fetch() in the whole codebase: the Pro license check.</span></div>
  </div>
</div>
`;

const shot3 = `${base}
<style>
  h1 { position: absolute; left: 64px; top: 128px; font-size: 76px; }
  .sub { position: absolute; left: 64px; top: 232px; font-size: 32px; }
  .cards { position: absolute; left: 64px; right: 64px; top: 318px; display: flex; gap: 24px; }
  .card { flex: 1; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); border-radius: 22px; padding: 30px 30px 32px; }
  .ic { width: 72px; height: 72px; border-radius: 18px; background: #1f6feb; display: flex; align-items: center; justify-content: center;
        font: 800 36px "DejaVu Sans Mono", monospace; margin-bottom: 22px; }
  .card b { display: block; font-size: 34px; line-height: 1.15; margin-bottom: 12px; }
  .card span { color: #b9c6da; font-size: 23px; line-height: 1.4; }
  .free { position: absolute; left: 64px; bottom: 56px; font-size: 26px; padding: 12px 26px; }
</style>
<div class="brand"><img src="${icon}">Headrule</div>
<h1>Pro: <span class="accent">$9 once.</span></h1>
<div class="sub">No subscription. Your key never expires.</div>
<div class="cards">
  <div class="card"><div class="ic">∞</div><b>Unlimited profiles</b><span>Staging, production, client A. Switch in one click.</span></div>
  <div class="card"><div class="ic">.*</div><b>Regex URL filters</b><span>Match exactly the URLs you mean.</span></div>
  <div class="card"><div class="ic">⟳</div><b>Browser sync</b><span>Through your own Chrome account. No Headrule server.</span></div>
</div>
<span class="pill free">Free for everyone: unlimited rules and ModHeader import</span>
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
for (const [n, html] of [[1, shot1], [2, shot2], [3, shot3]]) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(STORE, `screenshot-${n}-1280x800.png`) });
}
await browser.close();
console.log("store/screenshot-1..3-1280x800.png written");
