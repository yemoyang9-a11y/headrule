// Storage schema and helpers. All state lives in chrome.storage.local;
// Pro users may also sync profiles through chrome.storage.sync (lib/sync.js).

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
  // Sync to other browsers (Pro) is handled by the service worker, which
  // watches this key; see lib/sync.js.
  await chrome.storage.local.set({ state });
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

// Turn a ModHeader URL regex into a declarativeNetRequest urlFilter when it is
// one of the common shapes, for example ".*://api\.example\.com/.*" becomes
// "||api.example.com". Anything else is kept as a regular expression
// ("regex:" prefix, a Pro feature) so its meaning never silently widens.
export function modheaderRegexToFilter(regex) {
  const src = String(regex ?? "").trim();
  if (!src) return "";
  const asRegex = `regex:${src}`;
  let s = src.replace(/\\\//g, "/");
  let endAnchored = false;
  if (s.startsWith("^")) s = s.slice(1);
  if (s.endsWith("$") && !s.endsWith("\\$")) { s = s.slice(0, -1); endAnchored = true; }

  const schemeMatch = s.match(/^(\.\*|https\?|\(https\?\)|\(http\|https\)|\(https\|http\)|https|http)?:\/\//);
  if (!schemeMatch) {
    // ".*some-text.*" is a plain substring match.
    const sub = s.match(/^\.\*((?:[A-Za-z0-9_\-/:]|\\\.)+)\.\*$/);
    return sub ? sub[1].replace(/\\\./g, ".") : asRegex;
  }
  const scheme = schemeMatch[1] || ".*";
  s = s.slice(schemeMatch[0].length);

  let anySubdomain = false;
  const wild = s.match(/^(\(\.\*\\\.\)\?|\(\.\*\.\)\?|\.\*\\\.|\.\*\.|\.\*)/);
  if (wild) { anySubdomain = true; s = s.slice(wild[0].length); }

  const hostMatch = s.match(/^[A-Za-z0-9-]+(?:(?:\\\.|\.)[A-Za-z0-9-]+)*/);
  if (!hostMatch) return asRegex;
  const host = hostMatch[0].replace(/\\\./g, ".").toLowerCase();
  s = s.slice(hostMatch[0].length);

  let port = "";
  const portMatch = s.match(/^:\d+/);
  if (portMatch) { port = portMatch[0]; s = s.slice(port.length); }

  let open = true;
  let path = s;
  if (path.endsWith(".*")) path = path.slice(0, -2);
  else open = !endAnchored;
  if (path && !/^\/(?:[A-Za-z0-9_~!&'+,;=:@%/-]|\\\.)*$/.test(path)) return asRegex;
  path = path.replace(/\\\./g, ".");
  if (path === "/" && open) path = "";

  const exactScheme = (scheme === "http" || scheme === "https") && !anySubdomain;
  let filter = exactScheme ? `|${scheme}://${host}${port}${path}` : `||${host}${port}${path}`;
  if (!open) filter += "|";
  return filter;
}

const MODHEADER_UNSUPPORTED_FILTERS = ["excludeUrlFilters", "resourceFilters", "tabFilters", "tabGroupFilters", "windowFilters", "timeFilters"];
const MODHEADER_UNSUPPORTED_ITEMS = ["cookieHeaders", "setCookieHeaders", "urlReplacements", "cspHeaders"];
const asArray = (v) => (Array.isArray(v) ? v : []);

function modheaderFilterInfo(p) {
  const include = [];
  const unsupported = new Set();
  for (const f of asArray(p.urlFilters)) {
    if (!f || f.enabled === false) continue;
    const re = f.urlRegex ?? f.urlPattern ?? f.value;
    if (typeof re === "string" && re.trim()) include.push(re);
  }
  for (const f of asArray(p.filters)) {
    if (!f || f.enabled === false) continue;
    const type = f.type || "urls";
    const re = f.urlRegex ?? f.urlPattern ?? f.value;
    if (type === "urls" && typeof re === "string" && re.trim()) include.push(re);
    else unsupported.add(type);
  }
  for (const key of MODHEADER_UNSUPPORTED_FILTERS) {
    if (asArray(p[key]).some((f) => f && f.enabled !== false)) unsupported.add(key.replace(/Filters$/, " filters").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
  }
  return { include, unsupported: [...unsupported] };
}

// Parses a Headrule export or a ModHeader export. Returns
// { profiles, notes } where notes explain anything that did not carry over.
export function parseImportDetailed(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("The file is not valid JSON"); }
  const profiles = [];
  const notes = { rulesOff: 0, regexRules: 0, skippedItems: 0 };
  const src = Array.isArray(data) ? data : data?.profiles;
  if (!Array.isArray(src)) throw new Error("No profiles found in file");
  for (const p of src) {
    if (!p || typeof p !== "object") continue;
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
    const isModHeader = Array.isArray(p.headers) || Array.isArray(p.respHeaders);
    if (isModHeader) {
      const { include, unsupported } = modheaderFilterInfo(p);
      const filters = include.length ? include.map(modheaderRegexToFilter) : [""];
      for (const key of MODHEADER_UNSUPPORTED_ITEMS) notes.skippedItems += asArray(p[key]).filter(Boolean).length;
      const add = (arr, type) => {
        for (const h of asArray(arr)) {
          if (!h || typeof h.name !== "string" || !h.name.trim()) continue;
          const remove = h.value === "" || h.value == null;
          const wantsAppend = !remove && (h.appendMode === true || h.appendMode === "append" || p.appendMode === true);
          const canAppend = type === "response" || APPENDABLE.has(h.name.trim().toLowerCase());
          for (const urlFilter of filters) {
            const off = unsupported.length > 0;
            const comment = [
              typeof h.comment === "string" ? h.comment : "",
              off ? `Imported switched off: ModHeader ${unsupported.join(", ")} are not supported. Check the URL filter, then switch it on.` : "",
              wantsAppend && !canAppend ? "ModHeader append mode: Chrome only appends to a few request headers, so this was imported as Set." : ""
            ].filter(Boolean).join(" ");
            if (off) notes.rulesOff++;
            if (urlFilter.startsWith("regex:")) notes.regexRules++;
            rules.push(
              newRule({
                enabled: h.enabled !== false && !off,
                type,
                op: remove ? "remove" : wantsAppend && canAppend ? "append" : "set",
                name: h.name.trim(),
                value: remove ? "" : String(h.value),
                urlFilter,
                comment
              })
            );
          }
        }
      };
      add(p.headers, "request");
      add(p.respHeaders, "response");
    }
    const name = [p.name, p.title, p.shortTitle].find((v) => typeof v === "string" && v.trim());
    profiles.push(newProfile(name ? name.trim().slice(0, 40) : `Imported ${profiles.length + 1}`, rules));
  }
  if (profiles.length === 0) throw new Error("File contained no usable profiles");
  return { profiles, notes };
}

export function parseImport(text) {
  return parseImportDetailed(text).profiles;
}

// Request headers Chrome allows "append" on (mirrors lib/rules.js).
const APPENDABLE = new Set([
  "accept", "accept-encoding", "accept-language", "access-control-request-headers",
  "cache-control", "connection", "content-language", "cookie", "forwarded",
  "if-match", "if-none-match", "keep-alive", "range", "te", "trailer",
  "transfer-encoding", "upgrade", "user-agent", "via", "want-digest", "x-forwarded-for"
]);
