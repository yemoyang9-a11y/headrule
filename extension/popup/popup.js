import { loadState, saveState, activeProfile, newRule, newProfile } from "../lib/storage.js";
import { limits } from "../lib/license.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
const els = {
  profileSelect: $("profileSelect"), profileNameInput: $("profileNameInput"), profileAdd: $("profileAdd"), profileRename: $("profileRename"),
  profileDelete: $("profileDelete"), masterToggle: $("masterToggle"), rulesBody: $("rulesBody"),
  empty: $("empty"), addRule: $("addRule"), status: $("status"), openOptions: $("openOptions"),
  upsell: $("upsell"), upsellText: $("upsellText"), upsellLink: $("upsellLink"), upsellClose: $("upsellClose"),
  helpLink: $("helpLink")
};

let state = null;
let ruleErrors = {};
let saveTimer = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 150);
}

async function persist() {
  clearTimeout(saveTimer);
  await saveState(state);
  // Background applies rules on storage change; give it a moment then refresh status.
  setTimeout(refreshStatus, 250);
}

async function refreshStatus() {
  try {
    const { ruleStatus } = await chrome.storage.session.get("ruleStatus");
    ruleErrors = ruleStatus?.errors || {};
    const profile = activeProfile(state);
    const enabledCount = profile.rules.filter((r) => r.enabled).length;
    const errCount = Object.keys(ruleErrors).filter((id) => profile.rules.some((r) => r.id === id)).length;
    if (!state.enabled) {
      els.status.textContent = "Paused. Press Alt+Shift+H or flip the switch to resume.";
      els.status.className = "status";
    } else if (errCount) {
      els.status.textContent = `${errCount} rule${errCount === 1 ? "" : "s"} could not be applied`;
      els.status.className = "status bad";
    } else {
      els.status.textContent = enabledCount ? `${enabledCount} rule${enabledCount === 1 ? "" : "s"} active` : "No active rules";
      els.status.className = "status";
    }
    renderRowErrors();
  } catch {
    /* session storage unavailable; ignore */
  }
}

function renderProfiles() {
  els.profileSelect.innerHTML = state.profiles
    .map((p) => `<option value="${esc(p.id)}"${p.id === state.activeProfileId ? " selected" : ""}>${esc(p.name)}</option>`)
    .join("");
  els.profileDelete.disabled = state.profiles.length <= 1;
}

function renderRules() {
  const profile = activeProfile(state);
  els.empty.hidden = profile.rules.length > 0;
  els.rulesBody.innerHTML = profile.rules
    .map((r) => {
      const isRemove = r.op === "remove";
      return `
      <tr data-id="${esc(r.id)}" class="${r.enabled ? "" : "off"}">
        <td class="c-on"><input type="checkbox" data-f="enabled" ${r.enabled ? "checked" : ""} title="Enable rule"></td>
        <td class="c-type">
          <select data-f="type" title="Request or response header">
            <option value="request"${r.type === "request" ? " selected" : ""}>Request</option>
            <option value="response"${r.type === "response" ? " selected" : ""}>Response</option>
          </select>
        </td>
        <td class="c-op">
          <select data-f="op" title="Set replaces the header, Append adds another value, Remove deletes it">
            <option value="set"${r.op === "set" ? " selected" : ""}>Set</option>
            <option value="append"${r.op === "append" ? " selected" : ""}>Append</option>
            <option value="remove"${r.op === "remove" ? " selected" : ""}>Remove</option>
          </select>
        </td>
        <td class="c-name"><input type="text" class="name" data-f="name" list="headerNames" placeholder="Header-Name" value="${esc(r.name)}" spellcheck="false"></td>
        <td class="c-value"><input type="text" data-f="value" placeholder="${isRemove ? "(not used for remove)" : "value"}" value="${esc(r.value)}" ${isRemove ? "disabled" : ""} spellcheck="false"></td>
        <td class="c-url"><input type="text" data-f="urlFilter" placeholder="all URLs" value="${esc(r.urlFilter)}" spellcheck="false" title="Empty = all URLs. ||example.com = that domain. regex:^https://api\\. = regular expression (Pro)"></td>
        <td class="c-del"><button data-act="delete" title="Delete rule">×</button></td>
      </tr>`;
    })
    .join("");
  renderRowErrors();
}

function renderRowErrors() {
  const rows = [...els.rulesBody.querySelectorAll("tr[data-id]")];
  for (const row of rows) {
    const id = row.dataset.id;
    const next = row.nextElementSibling;
    if (next && next.classList.contains("errrow")) next.remove();
    const msg = ruleErrors[id];
    row.classList.toggle("err", !!msg);
    if (msg) {
      const tr = document.createElement("tr");
      tr.className = "errrow";
      tr.innerHTML = `<td colspan="7">${esc(msg)}</td>`;
      row.after(tr);
    }
  }
}

function showUpsell(text) {
  els.upsellText.textContent = text;
  els.upsellLink.href = CONFIG.buyUrl;
  els.upsell.hidden = false;
}

function render() {
  els.masterToggle.checked = !!state.enabled;
  renderProfiles();
  renderRules();
  refreshStatus();
}

// Event wiring -----------------------------------------------------------

els.rulesBody.addEventListener("input", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (!row) return;
  const rule = activeProfile(state).rules.find((r) => r.id === row.dataset.id);
  const field = e.target.dataset.f;
  if (!rule || !field) return;
  if (field === "enabled") {
    rule.enabled = e.target.checked;
    row.classList.toggle("off", !rule.enabled);
  } else {
    rule[field] = e.target.value;
    if (field === "op") {
      const valueInput = row.querySelector('input[data-f="value"]');
      valueInput.disabled = rule.op === "remove";
      valueInput.placeholder = rule.op === "remove" ? "(not used for remove)" : "value";
    }
    if (field === "urlFilter" && rule.urlFilter.trim().startsWith("regex:") && !limits(state.license).allowRegex) {
      showUpsell("Regex URL filters are a Pro feature. One payment, yours forever.");
    }
  }
  schedulePersist();
});

els.rulesBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const row = btn.closest("tr[data-id]");
  const profile = activeProfile(state);
  profile.rules = profile.rules.filter((r) => r.id !== row.dataset.id);
  renderRules();
  persist();
});

els.addRule.addEventListener("click", () => {
  const profile = activeProfile(state);
  profile.rules.push(newRule());
  renderRules();
  const last = els.rulesBody.querySelector("tr:last-child input.name");
  last?.focus();
  persist();
});

els.masterToggle.addEventListener("change", () => {
  state.enabled = els.masterToggle.checked;
  persist();
});

els.profileSelect.addEventListener("change", () => {
  state.activeProfileId = els.profileSelect.value;
  renderRules();
  persist();
});

// Inline profile name editor (popups should not use prompt()/confirm()).
let nameEditMode = null; // "add" | "rename" | null
function openNameEditor(mode, initial) {
  nameEditMode = mode;
  els.profileSelect.hidden = true;
  els.profileNameInput.hidden = false;
  els.profileNameInput.value = initial;
  els.profileNameInput.focus();
  els.profileNameInput.select();
}
function closeNameEditor(commit) {
  if (!nameEditMode) return;
  const name = els.profileNameInput.value.trim();
  const mode = nameEditMode;
  nameEditMode = null;
  els.profileNameInput.hidden = true;
  els.profileSelect.hidden = false;
  if (!commit || !name) return;
  if (mode === "add") {
    const p = newProfile(name);
    state.profiles.push(p);
    state.activeProfileId = p.id;
    render();
  } else {
    activeProfile(state).name = name;
    renderProfiles();
  }
  persist();
}
els.profileNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") closeNameEditor(true);
  if (e.key === "Escape") closeNameEditor(false);
});
els.profileNameInput.addEventListener("blur", () => closeNameEditor(true));

els.profileAdd.addEventListener("click", () => {
  const lim = limits(state.license);
  if (state.profiles.length >= lim.maxProfiles) {
    showUpsell("Multiple profiles (staging, prod, client A...) are a Pro feature. One payment, yours forever.");
    return;
  }
  openNameEditor("add", `Profile ${state.profiles.length + 1}`);
});

els.profileRename.addEventListener("click", () => {
  openNameEditor("rename", activeProfile(state).name);
});

// Delete needs a second click within 3 seconds instead of a confirm() dialog.
let deleteArmed = null;
els.profileDelete.addEventListener("click", () => {
  if (state.profiles.length <= 1) return;
  if (!deleteArmed) {
    deleteArmed = setTimeout(() => {
      deleteArmed = null;
      els.profileDelete.textContent = "🗑";
      els.profileDelete.classList.remove("confirm");
    }, 3000);
    els.profileDelete.textContent = "Delete?";
    els.profileDelete.classList.add("confirm");
    return;
  }
  clearTimeout(deleteArmed);
  deleteArmed = null;
  els.profileDelete.textContent = "🗑";
  els.profileDelete.classList.remove("confirm");
  const p = activeProfile(state);
  state.profiles = state.profiles.filter((x) => x.id !== p.id);
  state.activeProfileId = state.profiles[0].id;
  render();
  persist();
});

els.openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

els.upsellClose.addEventListener("click", () => { els.upsell.hidden = true; });
els.helpLink.href = `${CONFIG.siteUrl}/#help`;

// Keep the popup in sync if the shortcut toggles state while it is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.state && document.activeElement?.tagName !== "INPUT") {
    state = changes.state.newValue;
    render();
  }
  if (area === "session" && changes.ruleStatus) refreshStatus();
});

(async function init() {
  state = await loadState();
  render();
})();
