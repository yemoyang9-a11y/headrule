// Translate Headrule profile rules into declarativeNetRequest dynamic rules.

export const ALL_RESOURCE_TYPES = [
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object",
  "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport",
  "webbundle", "other"
];

// Request headers Chrome allows "append" on (per DNR docs). Everything else
// must use "set" or "remove".
const APPENDABLE_REQUEST_HEADERS = new Set([
  "accept", "accept-encoding", "accept-language", "access-control-request-headers",
  "cache-control", "connection", "content-language", "cookie", "forwarded",
  "if-match", "if-none-match", "keep-alive", "range", "te", "trailer",
  "transfer-encoding", "upgrade", "user-agent", "via", "want-digest", "x-forwarded-for"
]);

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function validateRule(rule, { allowRegex }) {
  const name = (rule.name || "").trim();
  if (!name) return "Header name is empty";
  if (!HEADER_NAME_RE.test(name)) return "Header name contains invalid characters";
  if (rule.op !== "remove" && /[\r\n]/.test(rule.value || "")) return "Header value cannot contain line breaks";
  if (rule.op === "append" && rule.type === "request" && !APPENDABLE_REQUEST_HEADERS.has(name.toLowerCase())) {
    return `Chrome only allows "append" on a few request headers (Accept, Cookie, User-Agent...). Use "set" for ${name}.`;
  }
  const f = (rule.urlFilter || "").trim();
  if (f.startsWith("regex:")) {
    if (!allowRegex) return "Regex URL filters are a Pro feature";
    try { new RegExp(f.slice(6)); } catch { return "Invalid regular expression"; }
  }
  return null;
}

export function toCondition(urlFilter) {
  const f = (urlFilter || "").trim();
  const condition = { resourceTypes: ALL_RESOURCE_TYPES };
  if (!f) return condition;
  if (f.startsWith("regex:")) {
    condition.regexFilter = f.slice(6);
  } else {
    condition.urlFilter = f;
    condition.isUrlFilterCaseSensitive = false;
  }
  return condition;
}

// Returns { dnrRules, errors } where errors is { [ruleId]: message }.
export function buildDnrRules(profile, opts = { allowRegex: false }) {
  const errors = {};
  const dnrRules = [];
  if (!profile) return { dnrRules, errors };
  const enabledRules = profile.rules.filter((r) => r.enabled);
  const total = enabledRules.length;
  enabledRules.forEach((rule, index) => {
    const err = validateRule(rule, opts);
    if (err) { errors[rule.id] = err; return; }
    const info = { header: rule.name.trim(), operation: rule.op };
    if (rule.op !== "remove") info.value = rule.value ?? "";
    const action = { type: "modifyHeaders" };
    if (rule.type === "response") action.responseHeaders = [info];
    else action.requestHeaders = [info];
    dnrRules.push({
      id: dnrRules.length + 1,
      // Rules listed higher in the UI win when they touch the same header.
      priority: total - index,
      action,
      condition: toCondition(rule.urlFilter),
      _sourceId: rule.id
    });
  });
  return { dnrRules, errors };
}

// Apply rules atomically; if Chrome rejects the batch, fall back to one at a
// time so a single bad rule does not disable everything, and report which
// rule failed.
export async function applyDnrRules(dnrRules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const clean = dnrRules.map(({ _sourceId, ...r }) => r);
  const errors = {};
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: clean });
    return { applied: clean.length, errors };
  } catch (batchErr) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
    let applied = 0;
    for (let i = 0; i < clean.length; i++) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [clean[i]] });
        applied++;
      } catch (e) {
        errors[dnrRules[i]._sourceId] = String(e?.message || e).replace(/^Error:\s*/, "");
      }
    }
    return { applied, errors };
  }
}
