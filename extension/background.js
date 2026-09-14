// Headrule service worker: keeps declarativeNetRequest dynamic rules in sync
// with the active profile, maintains the badge, and re-validates licenses.
import { loadState, updateState, activeProfile } from "./lib/storage.js";
import { buildDnrRules, applyDnrRules } from "./lib/rules.js";
import { limits, needsRecheck, validateLicense } from "./lib/license.js";

const LICENSE_ALARM = "headrule-license-check";
let syncing = null;

async function syncRules() {
  // Coalesce concurrent calls; storage change events can fire in bursts.
  if (syncing) return syncing;
  syncing = (async () => {
    const state = await loadState();
    const lim = limits(state.license);
    let result = { applied: 0, errors: {} };
    if (state.enabled) {
      const profile = activeProfile(state);
      const { dnrRules, errors } = buildDnrRules(profile, { allowRegex: lim.allowRegex });
      const applyResult = await applyDnrRules(dnrRules);
      result = { applied: applyResult.applied, errors: { ...errors, ...applyResult.errors } };
    } else {
      const existing = await chrome.declarativeNetRequest.getDynamicRules();
      if (existing.length) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map((r) => r.id) });
      }
    }
    await chrome.storage.session.set({ ruleStatus: { ...result, at: Date.now() } }).catch(() => {});
    await updateBadge(state, result.applied);
  })().finally(() => { syncing = null; });
  return syncing;
}

async function updateBadge(state, applied) {
  if (!state.settings?.showBadge) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (!state.enabled) {
    await chrome.action.setBadgeText({ text: "II" });
    await chrome.action.setBadgeBackgroundColor({ color: "#9aa0a6" });
    await chrome.action.setTitle({ title: "Headrule (paused)" });
    return;
  }
  await chrome.action.setBadgeText({ text: applied ? String(applied) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#1f6feb" });
  await chrome.action.setTitle({ title: applied ? `Headrule: ${applied} rule${applied === 1 ? "" : "s"} active` : "Headrule" });
}

async function checkLicense() {
  const state = await loadState();
  if (!needsRecheck(state.license)) return;
  try {
    const res = await validateLicense(state.license);
    await updateState((s) => {
      if (!s.license) return s;
      s.license.status = res.valid ? "active" : res.status;
      s.license.validatedAt = Date.now();
      return s;
    });
  } catch {
    // Offline or rate limited: keep the last known status; grace period applies.
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await syncRules();
  chrome.alarms.create(LICENSE_ALARM, { periodInMinutes: 60 * 12 });
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage?.();
  }
});

chrome.runtime.onStartup.addListener(() => {
  syncRules();
  chrome.alarms.create(LICENSE_ALARM, { periodInMinutes: 60 * 12 });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.state) syncRules();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LICENSE_ALARM) checkLicense();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-all") {
    await updateState((s) => { s.enabled = !s.enabled; return s; });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "headrule:sync") {
    syncRules().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "headrule:checkLicense") {
    checkLicense().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

// Service workers can be restarted at any time; make sure rules match state.
syncRules();
