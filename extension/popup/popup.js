import { loadState, saveState, activeProfile, newRule, newProfile } from "../lib/storage.js";
import { limits } from "../lib/license.js";
import { CONFIG } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
const els = {
  profileSelect: $("profileSelect"), profileNameInput: $("profileNameInput"), profileAdd: $("profileAdd"), profileRename: $("profileRename"),
  profileDelete: $("profileDelete"), masterToggle: $("masterToggle"), rulesBody: $("rulesBody"),
  empty: $("empty"), addRule: $("addRule"), status: $("status"), openOptions: $("openOptions"),
  upsell: $("upsell"), upsellText: $("upsellText"), upsellLink: $("upsellLink"), upsellClose: $("upsellClose"),
  helpLink: $("helpLink"), undoBtn: $("undoBtn"), rulesTable: $("rulesTable")
};
const TRASH_ICON = els.profileDelete.innerHTML;

let state = null;
let ruleErrors = {};
let saveTimer = null;
let undo = null; // { rule, index, profileId, timer } after a row is deleted

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
    if (undo) {
      // Keep "Rule deleted" and the Undo button visible until it expires.
    } else if (!state.enabled) {
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

const TEXT_ATTRS = 'spellcheck="false" autocomplete="off" autocapitalize="off"';

function renderRules() {
  const profile = activeProfile(state);
  const empty = profile.rules.length === 0;
  els.empty.hidden = !empty;
  els.rulesTable.hidden = empty;
  els.rulesBody.innerHTML = profile.rules
    .map((r, i) => {
      const isRemove = r.op === "remove";
      const n = i + 1;
      return `
      <tr data-id="${esc(r.id)}" class="${r.enabled ? "" : "off"}">
        <td class="c-on"><label title="Turn this rule on or off"><input type="checkbox" data-f="enabled" ${r.enabled ? "checked" : ""} aria-label="Rule ${n} on"></label></td>
        <td class="c-type">
          <select data-f="type" title="Request or response header" aria-label="Rule ${n} type">
            <option value="request"${r.type === "request" ? " selected" : ""}>Request</option>
            <option value="response"${r.type === "response" ? " selected" : ""}>Response</option>
          </select>
        </td>
        <td class="c-op">
          <select data-f="op" title="Set replaces the header, Append adds another value, Remove deletes it" aria-label="Rule ${n} action">
            <option value="set"${r.op === "set" ? " selected" : ""}>Set</option>
            <option value="append"${r.op === "append" ? " selected" : ""}>Append</option>
            <option value="remove"${r.op === "remove" ? " selected" : ""}>Remove</option>
          </select>
        </td>
        <td class="c-name"><input type="text" class="name" data-f="name" list="headerNames" placeholder="Header-Name" value="${esc(r.name)}" aria-label="Rule ${n} header name" ${TEXT_ATTRS}></td>
        <td class="c-value"><input type="text" data-f="value" placeholder="${isRemove ? "Not used" : "Value"}" value="${esc(r.value)}" ${isRemove ? "disabled" : ""} aria-label="Rule ${n} value" ${TEXT_ATTRS}></td>
        <td class="c-url"><input type="text" data-f="urlFilter" placeholder="All URLs" value="${esc(r.urlFilter)}" aria-label="Rule ${n} URL filter" ${TEXT_ATTRS} title="Empty = all URLs. ||example.com = that domain. regex:^https://api\\. = regular expression (Pro)"></td>
        <td class="c-del"><button class="icon ghost" data-act="delete" title="Delete rule" aria-label="Delete rule ${n}"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg></button></td>
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
    const nameInput = row.querySelector("input.name");
    if (nameInput) {
      if (msg) {
        nameInput.setAttribute("aria-invalid", "true");
        nameInput.setAttribute("aria-describedby", `err-${id}`);
      } else {
        nameInput.removeAttribute("aria-invalid");
        nameInput.removeAttribute("aria-describedby");
      }
    }
    if (msg) {
      const tr = document.createElement("tr");
      tr.className = "errrow";
      tr.innerHTML = `<td colspan="7" id="err-${esc(id)}">${esc(msg)}</td>`;
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
  // A storage change can re-render while the user is on a row control;
  // put focus back on the same control so keyboard users do not lose place.
  const active = document.activeElement;
  const row = active?.closest?.("tr[data-id]");
  const keep = row ? { id: row.dataset.id, f: active.dataset.f, act: active.dataset.act } : null;
  els.masterToggle.checked = !!state.enabled;
  renderProfiles();
  renderRules();
  refreshStatus();
  if (keep) {
    const sel = keep.f ? `[data-f="${keep.f}"]` : `[data-act="${keep.act}"]`;
    els.rulesBody.querySelector(`tr[data-id="${CSS.escape(keep.id)}"] ${sel}`)?.focus();
  }
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
      valueInput.placeholder = rule.op === "remove" ? "Not used" : "Value";
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
  const index = profile.rules.findIndex((r) => r.id === row.dataset.id);
  if (index < 0) return;
  const [rule] = profile.rules.splice(index, 1);
  renderRules();
  offerUndo(rule, index, profile.id);
  // Keep keyboard focus in the table: next row's delete button, or Add rule.
  const dels = els.rulesBody.querySelectorAll('button[data-act="delete"]');
  (dels[Math.min(index, dels.length - 1)] || els.addRule).focus();
  persist();
});

function clearUndo() {
  if (!undo) return;
  clearTimeout(undo.timer);
  undo = null;
  els.undoBtn.hidden = true;
}

function offerUndo(rule, index, profileId) {
  clearUndo();
  undo = { rule, index, profileId, timer: setTimeout(() => { clearUndo(); refreshStatus(); }, 6000) };
  els.status.textContent = `Deleted ${rule.name ? `"${rule.name}"` : "rule"}.`;
  els.status.className = "status";
  els.undoBtn.hidden = false;
}

els.undoBtn.addEventListener("click", () => {
  if (!undo) return;
  const { rule, index, profileId } = undo;
  clearUndo();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (profile) {
    profile.rules.splice(Math.min(index, profile.rules.length), 0, rule);
    if (profileId === state.activeProfileId) renderRules();
    persist();
  }
  refreshStatus();
});

// Empty-state examples: add a filled-in rule and focus the field to edit next.
const PRESETS = {
  auth: { type: "request", op: "set", name: "Authorization", value: "Bearer ", focus: "value" },
  ua: { type: "request", op: "set", name: "User-Agent", value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", focus: "urlFilter" },
  cors: { type: "response", op: "set", name: "Access-Control-Allow-Origin", value: "*", focus: "urlFilter" }
};
els.empty.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-preset]");
  const preset = btn && PRESETS[btn.dataset.preset];
  if (!preset) return;
  const { focus, ...fields } = preset;
  const rule = Object.assign(newRule(), fields);
  activeProfile(state).rules.push(rule);
  renderRules();
  const input = els.rulesBody.querySelector(`tr:last-child [data-f="${focus}"]`);
  if (input) { input.focus(); input.setSelectionRange?.(input.value.length, input.value.length); }
  persist();
});

els.addRule.addEventListener("click", () => {
  const profile = activeProfile(state);
  profile.rules.push(newRule());
  clearUndo();
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
  clearUndo();
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
      els.profileDelete.innerHTML = TRASH_ICON;
      els.profileDelete.classList.remove("confirm");
      els.profileDelete.setAttribute("aria-label", "Delete profile");
    }, 3000);
    els.profileDelete.textContent = "Delete?";
    els.profileDelete.setAttribute("aria-label", `Confirm: delete profile ${activeProfile(state).name}`);
    els.profileDelete.classList.add("confirm");
    return;
  }
  clearTimeout(deleteArmed);
  deleteArmed = null;
  els.profileDelete.innerHTML = TRASH_ICON;
  els.profileDelete.classList.remove("confirm");
  els.profileDelete.setAttribute("aria-label", "Delete profile");
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
