import { loadState, updateState, exportProfiles, parseImportDetailed, defaultState } from "../lib/storage.js";
import { activateLicense, deactivateLicense, validateLicense, limits } from "../lib/license.js";
import { readRemote, clearRemote, getSyncInfo, setSyncInfo, isPristine, mergeProfiles, profilesJson, sha256 } from "../lib/sync.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
// Read-only copy for rendering. Every change goes through updateState(), which
// re-reads storage first, so edits made in the popup meanwhile are never lost.
let state = null;
let syncInfo = null;
let pendingRemote = null; // remote copy waiting for the user's merge choice
let syncBusy = false; // keeps the box ticked while sync is being switched on

function setMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = `statusline${ok ? " ok" : ""}`;
}

function ago(ts) {
  if (!ts) return "";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

function render() {
  if (!state) return;
  const lim = limits(state.license);
  $("version").textContent = `v${chrome.runtime.getManifest().version}`;
  $("buyLink").href = CONFIG.buyUrl;
  $("siteLink").href = CONFIG.siteUrl;
  $("privacyLink").href = `${CONFIG.siteUrl}/privacy.html`;
  $("supportLink").href = `mailto:${CONFIG.supportEmail}`;

  $("licenseFree").hidden = lim.pro;
  $("licensePro").hidden = !lim.pro;
  if (lim.pro) {
    setMsg($("licenseStatus"), `Pro active${state.license.email ? ` · ${state.license.email}` : ""}`, true);
  } else if (state.license?.key) {
    setMsg($("licenseStatus"), `License ${state.license.status}. Re-enter your key or contact support.`);
  } else {
    setMsg($("licenseStatus"), "Free plan");
  }
  $("ioPill").classList.toggle("off", lim.allowImportExport);
  $("syncPill").classList.toggle("off", lim.allowSync);
  $("exportBtn").disabled = !lim.allowImportExport;
  $("importBtn").disabled = !lim.allowImportExport;
  $("syncEnabled").disabled = !lim.allowSync;
  $("syncEnabled").checked = syncBusy || (!!state.settings.syncEnabled && lim.allowSync);
  $("showBadge").checked = state.settings.showBadge !== false;
  renderSync();
}

function renderSync() {
  const on = !!state.settings.syncEnabled && limits(state.license).allowSync;
  $("syncChoice").hidden = !pendingRemote;
  if (pendingRemote) {
    $("syncChoiceText").textContent = `Chrome sync already holds ${pendingRemote.profiles.length} profile${pendingRemote.profiles.length === 1 ? "" : "s"} from another browser${pendingRemote.updatedAt ? ` (updated ${ago(pendingRemote.updatedAt)})` : ""}. This browser has its own rules too. What should Headrule do?`;
  }
  const msg = $("syncMsg");
  if (!on) { msg.textContent = ""; return; }
  if (syncInfo?.error) setMsg(msg, syncInfo.error);
  else if (syncInfo?.lastSyncAt) setMsg(msg, `Synced ${ago(syncInfo.lastSyncAt)}`, true);
  else setMsg(msg, "Sync is on. Changes reach your other signed-in Chrome browsers within a few seconds.", true);
}

$("activateBtn").addEventListener("click", async () => {
  const btn = $("activateBtn");
  const err = $("licenseError");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = "Activating…";
  try {
    const license = await activateLicense($("licenseKey").value);
    await updateState((s) => { s.license = license; return s; });
    $("licenseKey").value = "";
  } catch (e) {
    err.textContent = e.message || String(e);
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Activate";
  }
});

$("recheckBtn").addEventListener("click", async () => {
  try {
    const res = await validateLicense(state.license);
    await updateState((s) => {
      if (s.license) { s.license.status = res.status; s.license.validatedAt = Date.now(); }
      return s;
    });
    setMsg($("licenseStatus"), res.valid ? "License verified" : `License ${res.status}${res.error ? `: ${res.error}` : ""}`, res.valid);
  } catch (e) {
    setMsg($("licenseStatus"), e.message || String(e));
  }
});

$("deactivateBtn").addEventListener("click", async () => {
  await deactivateLicense(state.license);
  await updateState((s) => { s.license = null; s.settings.syncEnabled = false; return s; });
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([exportProfiles(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `headrule-profiles-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setMsg($("ioMsg"), `Exported ${state.profiles.length} profile(s)`, true);
});

$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async () => {
  const file = $("importFile").files?.[0];
  if (!file) return;
  try {
    const { profiles, notes } = parseImportDetailed(await file.text());
    await updateState((s) => { s.profiles.push(...profiles); return s; });
    const rules = profiles.reduce((n, p) => n + p.rules.length, 0);
    const extra = [];
    if (notes.rulesOff) extra.push(`${notes.rulesOff} rule(s) were imported switched off because a ModHeader filter could not be converted; see the rule comment`);
    if (notes.regexRules && !limits(state.license).allowRegex) extra.push(`${notes.regexRules} rule(s) use a regular-expression URL filter, which needs Pro; edit the filter or upgrade to apply them`);
    if (notes.skippedItems) extra.push(`${notes.skippedItems} cookie, CSP or URL-replacement item(s) were skipped (not supported)`);
    setMsg($("ioMsg"), `Imported ${profiles.length} profile(s) with ${rules} rule(s). Pick them in the popup.${extra.length ? ` Note: ${extra.join(". ")}.` : ""}`, true);
  } catch (e) {
    setMsg($("ioMsg"), `Import failed: ${e.message}`);
  } finally {
    $("importFile").value = "";
  }
});

async function enableSync() {
  const msg = $("syncMsg");
  let remote = null;
  try { remote = await readRemote(); } catch { remote = null; }
  if (remote?.incomplete) {
    setMsg(msg, "Chrome is still downloading synced data. Try again in a moment.");
    $("syncEnabled").checked = false;
    return;
  }
  const localHash = await sha256(profilesJson(state.profiles));
  if (!remote || remote.hash === localHash) {
    if (remote) await setSyncInfo({ lastHash: remote.hash, lastSyncAt: Date.now(), error: null });
    await updateState((s) => { s.settings.syncEnabled = true; return s; });
    return;
  }
  if (isPristine(state.profiles)) {
    await applyRemote(remote);
    return;
  }
  pendingRemote = remote;
}

async function applyRemote(remote) {
  await setSyncInfo({ lastHash: remote.hash, lastSyncAt: Date.now(), localDirtyAt: 0, error: null });
  await updateState((s) => {
    s.profiles = remote.profiles;
    if (!s.profiles.some((p) => p.id === s.activeProfileId)) s.activeProfileId = s.profiles[0]?.id;
    s.settings.syncEnabled = true;
    return s;
  });
}

$("syncEnabled").addEventListener("change", async () => {
  if ($("syncEnabled").checked) {
    syncBusy = true;
    try { await enableSync(); } finally { syncBusy = false; render(); }
  } else {
    pendingRemote = null;
    await updateState((s) => { s.settings.syncEnabled = false; return s; });
    setMsg($("syncMsg"), "Sync is off on this browser. The synced copy stays in your Chrome account for your other browsers.");
    $("syncClear").hidden = false;
  }
});

$("syncMerge").addEventListener("click", async () => {
  const remote = pendingRemote;
  pendingRemote = null;
  if (!remote) return;
  await updateState((s) => { s.profiles = mergeProfiles(s.profiles, remote.profiles); s.settings.syncEnabled = true; return s; });
});

$("syncUseRemote").addEventListener("click", async () => {
  const remote = pendingRemote;
  pendingRemote = null;
  if (remote) await applyRemote(remote);
});

$("syncUseLocal").addEventListener("click", async () => {
  pendingRemote = null;
  // Mark this browser as the newer side so its profiles replace the synced copy.
  await setSyncInfo({ lastHash: "replace-remote", localDirtyAt: Date.now() });
  await updateState((s) => { s.settings.syncEnabled = true; return s; });
});

$("syncCancel").addEventListener("click", () => {
  pendingRemote = null;
  renderSync();
});

$("syncClear").addEventListener("click", async () => {
  await clearRemote();
  await setSyncInfo({ lastHash: null, lastSyncAt: 0 });
  $("syncClear").hidden = true;
  setMsg($("syncMsg"), "The synced copy was deleted from your Chrome account.", true);
});

$("showBadge").addEventListener("change", async () => {
  const checked = $("showBadge").checked;
  await updateState((s) => { s.settings.showBadge = checked; return s; });
});

let resetArmed = false;
$("resetBtn").addEventListener("click", async () => {
  if (!resetArmed) {
    resetArmed = true;
    $("resetBtn").textContent = "Click again to confirm reset";
    setTimeout(() => { resetArmed = false; $("resetBtn").textContent = "Reset all rules"; }, 4000);
    return;
  }
  await updateState((s) => ({ ...defaultState(), license: s.license, settings: s.settings }));
  resetArmed = false;
  $("resetBtn").textContent = "Reset all rules";
});

// Stay current with changes made in the popup, the shortcut or other browsers.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.state?.newValue) state = changes.state.newValue;
  if (changes.syncInfo) syncInfo = changes.syncInfo.newValue || null;
  if (changes.state || changes.syncInfo) render();
});

(async function init() {
  state = await loadState();
  syncInfo = await getSyncInfo();
  render();
})();
