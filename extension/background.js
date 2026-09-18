// Headrule service worker: keeps declarativeNetRequest dynamic rules in sync
// with the active profile, maintains the badge, re-validates licenses and runs
// Pro sync between the user's own Chrome browsers.
import { loadState, updateState, activeProfile } from "./lib/storage.js";
import { buildDnrRules, applyDnrRules } from "./lib/rules.js";
import { limits, needsRecheck, validateLicense } from "./lib/license.js";
import { readRemote, writeRemote, getSyncInfo, setSyncInfo, deviceId, profilesJson, sha256, isPristine, mergeProfiles, SYNC_META } from "./lib/sync.js";

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
      s.license.status = res.status;
      s.license.validatedAt = Date.now();
      return s;
    });
  } catch {
    // Offline or rate limited: keep the last known status; grace period applies.
  }
}

// Pro sync -----------------------------------------------------------------
// Local edits are pushed a few seconds after the last change (Chrome allows
// about 120 sync writes a minute). Changes from other browsers arrive through
// storage.onChanged("sync") and replace this browser's profiles unless it has
// newer unsent edits. Last writer wins.
const PUSH_DELAY_MS = 3000;
const RETRY_ALARM = "headrule-sync-retry";
let pushTimer = null;
let pullTimer = null;

async function syncActive(state) {
  return !!state.settings?.syncEnabled && limits(state.license).allowSync;
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow().catch(() => {}), PUSH_DELAY_MS);
}

async function pushNow() {
  const state = await loadState();
  if (!(await syncActive(state))) return;
  const hash = await sha256(profilesJson(state.profiles));
  const info = await getSyncInfo();
  if (hash === info.lastHash) return;
  try {
    const res = await writeRemote(state.profiles, await deviceId());
    await setSyncInfo({ lastHash: res.hash, lastSyncAt: res.updatedAt, localDirtyAt: 0, error: null });
  } catch (e) {
    const msg = e?.code === "too_large" ? e.message : `Chrome did not accept the sync update (${String(e?.message || e)}). Retrying in a minute.`;
    await setSyncInfo({ error: msg });
    if (e?.code !== "too_large") chrome.alarms.create(RETRY_ALARM, { delayInMinutes: 1 });
  }
}

function schedulePull() {
  clearTimeout(pullTimer);
  pullTimer = setTimeout(() => pullNow().catch(() => {}), 500);
}

async function pullNow() {
  const state = await loadState();
  if (!(await syncActive(state))) return;
  const remote = await readRemote();
  if (!remote || remote.incomplete) return;
  const info = await getSyncInfo();
  if (remote.hash === info.lastHash) return;
  if (remote.device && remote.device === (await deviceId())) return;
  if (!info.lastHash) {
    // First sync on this browser, for example right after updating from 1.0.0:
    // never drop local rules. Keep both sides and upload the result.
    if (isPristine(remote.profiles)) return schedulePush();
    if (!isPristine(state.profiles)) {
      await updateState((s) => { s.profiles = mergeProfiles(s.profiles, remote.profiles); return s; });
      return schedulePush();
    }
  } else if (info.localDirtyAt && info.localDirtyAt > remote.updatedAt) {
    return; // our newer edit will be pushed
  }
  await setSyncInfo({ lastHash: remote.hash, lastSyncAt: Date.now(), localDirtyAt: 0, error: null });
  await updateState((s) => {
    s.profiles = remote.profiles;
    if (!s.profiles.some((p) => p.id === s.activeProfileId)) s.activeProfileId = s.profiles[0]?.id;
    return s;
  });
}

async function onLocalStateChange(change) {
  const next = change.newValue;
  if (!next || !(await syncActive(next))) return;
  const hash = await sha256(profilesJson(next.profiles));
  const info = await getSyncInfo();
  if (hash === info.lastHash) return;
  if (!info.localDirtyAt) await setSyncInfo({ localDirtyAt: Date.now() });
  schedulePush();
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
  if (area === "local" && changes.state) {
    syncRules();
    onLocalStateChange(changes.state).catch(() => {});
  }
  if (area === "sync" && Object.keys(changes).some((k) => k === SYNC_META || k.startsWith("hr_sync_"))) schedulePull();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LICENSE_ALARM) checkLicense();
  if (alarm.name === RETRY_ALARM) pushNow().catch(() => {});
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
  if (msg?.type === "headrule:syncNow") {
    pullNow().then(() => pushNow()).catch(() => {}).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "headrule:checkLicense") {
    checkLicense().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

// Service workers can be restarted at any time; make sure rules match state
// and catch up on sync changes that arrived while this worker was asleep.
syncRules();
pullNow().then(() => pushNow()).catch(() => {});
