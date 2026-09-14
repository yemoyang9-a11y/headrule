import { loadState, saveState, exportProfiles, parseImport, defaultState } from "../lib/storage.js";
import { activateLicense, deactivateLicense, validateLicense, limits } from "../lib/license.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
let state = null;

function setMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = `statusline${ok ? " ok" : ""}`;
}

function render() {
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
    setMsg($("licenseStatus"), `License ${state.license.status}. Re-enter or contact support.`);
  } else {
    setMsg($("licenseStatus"), "Free plan");
  }
  $("ioPill").classList.toggle("off", lim.allowImportExport);
  $("syncPill").classList.toggle("off", lim.allowSync);
  $("exportBtn").disabled = !lim.allowImportExport;
  $("importBtn").disabled = !lim.allowImportExport;
  $("syncEnabled").disabled = !lim.allowSync;
  $("syncEnabled").checked = !!state.settings.syncEnabled && lim.allowSync;
  $("showBadge").checked = state.settings.showBadge !== false;
}

async function persist() {
  await saveState(state);
}

$("activateBtn").addEventListener("click", async () => {
  const btn = $("activateBtn");
  const err = $("licenseError");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = "Activating…";
  try {
    state.license = await activateLicense($("licenseKey").value);
    await persist();
    render();
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
    state.license.status = res.valid ? "active" : res.status;
    state.license.validatedAt = Date.now();
    await persist();
    render();
    setMsg($("licenseStatus"), res.valid ? "License verified" : `License ${res.status}${res.error ? `: ${res.error}` : ""}`, res.valid);
  } catch (e) {
    setMsg($("licenseStatus"), `Could not reach license server: ${e.message}`);
  }
});

$("deactivateBtn").addEventListener("click", async () => {
  await deactivateLicense(state.license);
  state.license = null;
  state.settings.syncEnabled = false;
  await persist();
  render();
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
    const profiles = parseImport(await file.text());
    state.profiles.push(...profiles);
    await persist();
    setMsg($("ioMsg"), `Imported ${profiles.length} profile(s) with ${profiles.reduce((n, p) => n + p.rules.length, 0)} rule(s)`, true);
  } catch (e) {
    setMsg($("ioMsg"), `Import failed: ${e.message}`);
  } finally {
    $("importFile").value = "";
  }
});

$("syncEnabled").addEventListener("change", async () => {
  state.settings.syncEnabled = $("syncEnabled").checked;
  if (!state.settings.syncEnabled) {
    try { await chrome.storage.sync.remove("syncedProfiles"); } catch { /* ignore */ }
  }
  await persist();
});

$("showBadge").addEventListener("change", async () => {
  state.settings.showBadge = $("showBadge").checked;
  await persist();
});

let resetArmed = false;
$("resetBtn").addEventListener("click", async () => {
  if (!resetArmed) {
    resetArmed = true;
    $("resetBtn").textContent = "Click again to confirm reset";
    setTimeout(() => { resetArmed = false; $("resetBtn").textContent = "Reset all rules"; }, 4000);
    return;
  }
  const license = state.license;
  const settings = state.settings;
  state = { ...defaultState(), license, settings };
  await persist();
  resetArmed = false;
  $("resetBtn").textContent = "Reset all rules";
  render();
});

(async function init() {
  state = await loadState();
  // Pull synced profiles if sync is on and this device has none of its own yet.
  if (state.settings.syncEnabled && limits(state.license).allowSync) {
    try {
      const { syncedProfiles } = await chrome.storage.sync.get("syncedProfiles");
      if (syncedProfiles?.profiles?.length && state.profiles.length <= 1 && state.profiles[0].rules.length <= 1) {
        state.profiles = syncedProfiles.profiles;
        state.activeProfileId = syncedProfiles.activeProfileId;
        await persist();
      }
    } catch { /* ignore */ }
  }
  render();
})();
