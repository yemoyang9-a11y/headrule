// Pro sync of profiles through the user's own Chrome account
// (chrome.storage.sync). There is no Headrule server.
//
// Chrome allows at most 8 KB per sync item and about 100 KB in total, so the
// profile list is serialised, base64-encoded and split across several items.
// A SHA-256 of the JSON is stored next to the chunks; a device only applies an
// update once every chunk has arrived and the hash matches.

export const SYNC_META = "hr_sync_meta";
const CHUNK_PREFIX = "hr_sync_";
const CHUNK_CHARS = 7000;
export const SYNC_MAX_CHARS = 90 * 1024; // headroom under Chrome's 100 KB total
const LEGACY_KEY = "syncedProfiles"; // 1.0.0 stored everything in one item

const chunkKey = (i) => `${CHUNK_PREFIX}${i}`;

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function profilesJson(profiles) {
  return JSON.stringify(profiles || []);
}

// Returns null when nothing is synced, { incomplete: true } while chunks are
// still arriving, or { profiles, hash, updatedAt, device }.
export async function readRemote() {
  const all = await chrome.storage.sync.get(null);
  const meta = all[SYNC_META];
  if (!meta) {
    const legacy = all[LEGACY_KEY];
    if (legacy && Array.isArray(legacy.profiles) && legacy.profiles.length) {
      return { profiles: legacy.profiles, hash: await sha256(profilesJson(legacy.profiles)), updatedAt: legacy.updatedAt || 0, device: null, legacy: true };
    }
    return null;
  }
  let b64 = "";
  for (let i = 0; i < meta.n; i++) {
    const part = all[chunkKey(i)];
    if (typeof part !== "string") return { incomplete: true };
    b64 += part;
  }
  let json;
  try { json = fromBase64(b64); } catch { return { incomplete: true }; }
  if ((await sha256(json)) !== meta.hash) return { incomplete: true };
  return { profiles: JSON.parse(json), hash: meta.hash, updatedAt: meta.updatedAt || 0, device: meta.device || null };
}

export class SyncTooLargeError extends Error {
  constructor(chars) {
    super(`Your profiles are about ${Math.ceil((chars * 3) / 4 / 1024)} KB. Chrome sync holds about ${Math.floor((SYNC_MAX_CHARS * 3) / 4 / 1024)} KB, so sync is paused. Delete unused rules or profiles to resume.`);
    this.code = "too_large";
  }
}

export async function writeRemote(profiles, device) {
  const json = profilesJson(profiles);
  const b64 = toBase64(json);
  if (b64.length > SYNC_MAX_CHARS) throw new SyncTooLargeError(b64.length);
  const hash = await sha256(json);
  const n = Math.max(1, Math.ceil(b64.length / CHUNK_CHARS));
  const updatedAt = Date.now();
  const items = { [SYNC_META]: { v: 1, n, hash, updatedAt, device } };
  for (let i = 0; i < n; i++) items[chunkKey(i)] = b64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
  await chrome.storage.sync.set(items); // one write operation for all chunks
  const existing = await chrome.storage.sync.get(null);
  const stale = Object.keys(existing).filter((k) => k === LEGACY_KEY || (k.startsWith(CHUNK_PREFIX) && k !== SYNC_META && Number(k.slice(CHUNK_PREFIX.length)) >= n));
  if (stale.length) await chrome.storage.sync.remove(stale);
  return { hash, updatedAt };
}

export async function clearRemote() {
  const existing = await chrome.storage.sync.get(null);
  const keys = Object.keys(existing).filter((k) => k === LEGACY_KEY || k.startsWith(CHUNK_PREFIX));
  if (keys.length) await chrome.storage.sync.remove(keys);
}

// Per-browser bookkeeping, kept out of `state` so it never triggers a push.
export async function getSyncInfo() {
  const { syncInfo } = await chrome.storage.local.get("syncInfo");
  return { lastHash: null, lastSyncAt: 0, localDirtyAt: 0, error: null, ...(syncInfo || {}) };
}

export async function setSyncInfo(patch) {
  const next = { ...(await getSyncInfo()), ...patch };
  await chrome.storage.local.set({ syncInfo: next });
  return next;
}

export async function deviceId() {
  const { deviceId: id } = await chrome.storage.local.get("deviceId");
  if (id) return id;
  const fresh = `d_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  await chrome.storage.local.set({ deviceId: fresh });
  return fresh;
}

// A browser that still has only the starter profile has nothing worth keeping.
export function isPristine(profiles) {
  if (!Array.isArray(profiles) || profiles.length !== 1) return false;
  const rules = profiles[0].rules || [];
  return rules.length === 0 || (rules.length === 1 && rules[0].name === "X-Headrule" && rules[0].value === "hello");
}

// Keep every local profile and add remote profiles this browser does not have.
export function mergeProfiles(local, remote) {
  const ids = new Set(local.map((p) => p.id));
  return [...local, ...remote.filter((p) => !ids.has(p.id))];
}
