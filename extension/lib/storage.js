// Storage schema and helpers. All state lives in chrome.storage.local;
// Pro users may mirror profiles into chrome.storage.sync.

export const SCHEMA_VERSION = 1;

export const RULE_TYPES = ["request", "response"];
export const RULE_OPS = ["set", "append", "remove"];

export function uid(prefix = "r") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function newRule(partial = {}) {
  return {
    id: uid("r"),
    enabled: true,
    type: "request", // request | response
    op: "set", // set | append | remove
    name: "",
    value: "",
    urlFilter: "", // empty = all URLs; "regex:" prefix = regexFilter (Pro)
    comment: "",
    ...partial
  };
}

export function newProfile(name = "Default", rules = []) {
  return { id: uid("p"), name, enabled: true, rules };
}

export function defaultState() {
  const profile = newProfile("Default", [
    newRule({ name: "X-Headrule", value: "hello", comment: "Example rule. Edit or delete me." })
  ]);
  return {
    version: SCHEMA_VERSION,
    enabled: true,
    activeProfileId: profile.id,
    profiles: [profile],
    settings: { syncEnabled: false, showBadge: true },
    license: null
  };
}

export async function loadState() {
  const data = await chrome.storage.local.get("state");
  if (!data.state) {
    const state = defaultState();
    await chrome.storage.local.set({ state });
    return state;
  }
  return migrate(data.state);
}

export async function saveState(state) {
  await chrome.storage.local.set({ state });
  if (state.settings?.syncEnabled) {
    try {
      // Sync only the parts that make sense across devices.
      await chrome.storage.sync.set({
        syncedProfiles: { profiles: state.profiles, activeProfileId: state.activeProfileId, updatedAt: Date.now() }
      });
    } catch (e) {
      // Sync quota exceeded or unavailable; local copy is still authoritative.
      console.warn("Headrule: sync write failed", e);
    }
  }
}

export async function updateState(mutator) {
  const state = await loadState();
  const next = (await mutator(state)) || state;
  await saveState(next);
  return next;
}

function migrate(state) {
  if (!state.version) state.version = 1;
  if (!Array.isArray(state.profiles) || state.profiles.length === 0) {
    const def = defaultState();
    return { ...def, ...state, profiles: def.profiles, activeProfileId: def.activeProfileId };
  }
  if (!state.profiles.find((p) => p.id === state.activeProfileId)) {
    state.activeProfileId = state.profiles[0].id;
  }
  state.settings = { syncEnabled: false, showBadge: true, ...(state.settings || {}) };
  return state;
}

export function activeProfile(state) {
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
}

// Export/import format (Pro). Kept deliberately simple and human-editable.
export function exportProfiles(state) {
  return JSON.stringify(
    {
      app: "headrule",
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profiles: state.profiles.map((p) => ({
        name: p.name,
        rules: p.rules.map(({ enabled, type, op, name, value, urlFilter, comment }) => ({
          enabled, type, op, name, value, urlFilter, comment
        }))
      }))
    },
    null,
    2
  );
}

export function parseImport(text) {
  const data = JSON.parse(text);
  // Accept our own format and a ModHeader-style export (array of profiles
  // with headers/respHeaders arrays) so switching is painless.
  const profiles = [];
  const src = Array.isArray(data) ? data : data.profiles;
  if (!Array.isArray(src)) throw new Error("No profiles found in file");
  for (const p of src) {
    const rules = [];
    if (Array.isArray(p.rules)) {
      for (const r of p.rules) {
        if (!r || typeof r.name !== "string") continue;
        rules.push(
          newRule({
            enabled: r.enabled !== false,
            type: RULE_TYPES.includes(r.type) ? r.type : "request",
            op: RULE_OPS.includes(r.op) ? r.op : "set",
            name: r.name,
            value: typeof r.value === "string" ? r.value : "",
            urlFilter: typeof r.urlFilter === "string" ? r.urlFilter : "",
            comment: typeof r.comment === "string" ? r.comment : ""
          })
        );
      }
    }
    // ModHeader export compatibility
    const mh = (arr, type) => {
      if (!Array.isArray(arr)) return;
      for (const h of arr) {
        if (!h || typeof h.name !== "string") continue;
        rules.push(
          newRule({
            enabled: h.enabled !== false,
            type,
            op: h.value === "" || h.value == null ? "remove" : "set",
            name: h.name,
            value: h.value || "",
            comment: h.comment || ""
          })
        );
      }
    };
    mh(p.headers, "request");
    mh(p.respHeaders, "response");
    profiles.push(newProfile(typeof p.name === "string" && p.name ? p.name : `Imported ${profiles.length + 1}`, rules));
  }
  if (profiles.length === 0) throw new Error("File contained no usable profiles");
  return profiles;
}
