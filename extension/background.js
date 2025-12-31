import { buildOtpauthUri, generateSecret, sanitizeDomains, verifyTotp } from "./utils/totp.js";

const ALARM_NAME = "coding-mode-session";
const RULE_REDIRECT_PATH = "/blocked.html";
const RULE_RESOURCE_TYPES = ["main_frame", "sub_frame"];
const STORAGE_KEYS = {
  sessionEnd: "sessionEnd",
  authEnabled: "authEnabled",
  totpSecret: "totpSecret",
  blockedDomains: "blockedDomains",
  autoTriggerEnabled: "autoTriggerEnabled"
};

const PROGRAMMING_SITES = [
  "leetcode.com",
  "www.leetcode.com",
  "codeforces.com",
  "www.codeforces.com",
  "codechef.com",
  "www.codechef.com",
  "hackerrank.com",
  "www.hackerrank.com",
  "atcoder.jp",
  "topcoder.com",
  "www.topcoder.com",
  "geeksforgeeks.org",
  "www.geeksforgeeks.org",
  "codingame.com",
  "www.codingame.com",
  "exercism.org",
  "www.exercism.org"
];

const loadDefaultDomains = async () => {
  try {
    const response = await fetch(chrome.runtime.getURL("rules.json"));
    if (!response.ok) throw new Error("Failed to load rules.json");
    const domains = await response.json();
    return Array.isArray(domains) ? sanitizeDomains(domains) : [];
  } catch (err) {
    console.error("Coding Mode: unable to load default domains", err);
    return [];
  }
};

const ensureDefaults = async () => {
  const defaults = await loadDefaultDomains();
  const existing = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const updates = {};
  const existingDomains = existing[STORAGE_KEYS.blockedDomains] || [];
  const merged = Array.from(new Set([...existingDomains, ...defaults]));
  if (!Array.isArray(existingDomains) || merged.length !== existingDomains.length) {
    updates[STORAGE_KEYS.blockedDomains] = merged;
  }
  if (typeof existing[STORAGE_KEYS.authEnabled] !== "boolean") {
    updates[STORAGE_KEYS.authEnabled] = false;
  }
  if (typeof existing[STORAGE_KEYS.autoTriggerEnabled] !== "boolean") {
    updates[STORAGE_KEYS.autoTriggerEnabled] = true;
  }
  if (existing[STORAGE_KEYS.totpSecret] == null) {
    updates[STORAGE_KEYS.totpSecret] = null;
  }
  if (existing[STORAGE_KEYS.sessionEnd] == null) {
    updates[STORAGE_KEYS.sessionEnd] = null;
  }
  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
};

const getState = async () => {
  await ensureDefaults();
  const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const sessionEnd = stored[STORAGE_KEYS.sessionEnd];
  const now = Date.now();
  const active = typeof sessionEnd === "number" && sessionEnd > now;
  const remainingMs = active ? sessionEnd - now : 0;
  return {
    active,
    remainingMs,
    sessionEnd: active ? sessionEnd : null,
    authEnabled: Boolean(stored[STORAGE_KEYS.authEnabled]),
    totpSecret: stored[STORAGE_KEYS.totpSecret] || null,
    blockedDomains: sanitizeDomains(stored[STORAGE_KEYS.blockedDomains] || [])
  };
};

const clearRules = async () => {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (!existing.length) return;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: []
  });
};

const applyRules = async (domains) => {
  const sanitized = sanitizeDomains(domains);
  await clearRules();
  if (!sanitized.length) return;

  const rules = sanitized.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: RULE_REDIRECT_PATH }
    },
    condition: {
      urlFilter: `||${domain}/*`,
      resourceTypes: RULE_RESOURCE_TYPES
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules, removeRuleIds: [] });
};

const scheduleAlarm = async (when) => {
  await chrome.alarms.clear(ALARM_NAME);
  if (typeof when === "number" && when > Date.now()) {
    await chrome.alarms.create(ALARM_NAME, { when });
  }
};

const startSession = async (durationMinutes) => {
  const minutes = Number(durationMinutes);
  if (!minutes || minutes <= 0) {
    throw new Error("Duration must be greater than 0");
  }
  const { blockedDomains } = await getState();
  if (!blockedDomains.length) {
    throw new Error("No blocked domains configured");
  }
  const sessionEnd = Date.now() + minutes * 60 * 1000;
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionEnd]: sessionEnd });
  await applyRules(blockedDomains);
  await scheduleAlarm(sessionEnd);

  // Reload all open tabs that match blocked domains
  if (Array.isArray(blockedDomains) && blockedDomains.length > 0) {
    const patterns = blockedDomains.map(domain => `*://${domain}/*`);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url) {
          for (const domain of blockedDomains) {
            if (tab.url.includes(domain)) {
              chrome.tabs.reload(tab.id);
              break;
            }
          }
        }
      });
    });
  }

  return { sessionEnd };
};

const endSession = async () => {
  // Get the blocked domains before clearing
  const { blockedDomains } = await getState();
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionEnd]: null });
  await clearRules();
  await scheduleAlarm(null);

  // Reload all open tabs that match previously blocked domains
  if (Array.isArray(blockedDomains) && blockedDomains.length > 0) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url) {
          for (const domain of blockedDomains) {
            if (tab.url.includes(domain)) {
              chrome.tabs.reload(tab.id);
              break;
            }
          }
        }
      });
    });
  }
};

const extendSession = async (additionalMinutes) => {
  const minutes = Number(additionalMinutes);
  if (!minutes || minutes <= 0) {
    throw new Error("Additional minutes must be greater than 0");
  }
  const state = await getState();
  if (!state.active) {
    throw new Error("No active session to extend");
  }
  const newSessionEnd = state.sessionEnd + minutes * 60 * 1000;
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionEnd]: newSessionEnd });
  await scheduleAlarm(newSessionEnd);
  return { sessionEnd: newSessionEnd };
};

const handleEarlyEnd = async (code) => {
  const state = await getState();
  if (!state.active) return { ended: true };

  if (state.authEnabled) {
    if (!state.totpSecret) {
      return { ended: false, error: "Authenticator not set" };
    }
    const valid = await verifyTotp(state.totpSecret, code || "");
    if (!valid) {
      return { ended: false, error: "Invalid code" };
    }
  }

  await endSession();
  return { ended: true };
};

const updateDomains = async (domains) => {
  const sanitized = sanitizeDomains(domains);
  await chrome.storage.local.set({ [STORAGE_KEYS.blockedDomains]: sanitized });
  const { active } = await getState();
  if (active) {
    await applyRules(sanitized);
  }
  return sanitized;
};

const getOrCreateSecret = async () => {
  const state = await getState();
  if (state.totpSecret) return state.totpSecret;
  const secret = generateSecret();
  await chrome.storage.local.set({ [STORAGE_KEYS.totpSecret]: secret });
  return secret;
};

const resetSecret = async () => {
  const secret = generateSecret();
  await chrome.storage.local.set({ [STORAGE_KEYS.totpSecret]: secret });
  return secret;
};

const toggleAuth = async (enabled) => {
  const updates = { [STORAGE_KEYS.authEnabled]: Boolean(enabled) };
  if (enabled) {
    updates[STORAGE_KEYS.totpSecret] = await getOrCreateSecret();
  }
  await chrome.storage.local.set(updates);
  const secret = updates[STORAGE_KEYS.totpSecret] || (await getState()).totpSecret;
  const uri = buildOtpauthUri(secret);
  return { authEnabled: updates[STORAGE_KEYS.authEnabled], secret, uri };
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
});

chrome.runtime.onStartup.addListener(async () => {
  const state = await getState();
  if (state.active) {
    await applyRules(state.blockedDomains);
    await scheduleAlarm(state.sessionEnd);
  } else {
    await endSession();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const state = await getState();
  if (state.active) {
    const remaining = state.sessionEnd - Date.now();
    if (remaining <= 0) {
      await endSession();
    } else {
      await scheduleAlarm(state.sessionEnd);
    }
  } else {
    await endSession();
  }
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const { autoTriggerEnabled } = await chrome.storage.local.get([STORAGE_KEYS.autoTriggerEnabled]);
  if (!autoTriggerEnabled) return;
  
  const state = await getState();
  if (state.active) return;
  
  try {
    const url = new URL(details.url);
    const hostname = url.hostname;
    
    if (PROGRAMMING_SITES.includes(hostname)) {
      await startSession(30);
      console.log(`Coding Mode: Auto-triggered 30-min session for ${hostname}`);
    }
  } catch (err) {
    console.error("Coding Mode: Auto-trigger error", err);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const respond = (payload) => sendResponse({ ok: true, ...payload });
  const respondError = (error) => sendResponse({ ok: false, error: error?.message || error });

  const handler = async () => {
    switch (message?.type) {
      case "getState": {
        const state = await getState();
        return respond(state);
      }
      case "startSession": {
        const { durationMinutes } = message;
        const result = await startSession(durationMinutes);
        return respond(result);
      }
      case "extendSession": {
        const { additionalMinutes } = message;
        const result = await extendSession(additionalMinutes);
        return respond(result);
      }
      case "endSession": {
        const result = await handleEarlyEnd(message.code);
        return respond(result);
      }
      case "updateDomains": {
        const sanitized = await updateDomains(message.domains || []);
        return respond({ blockedDomains: sanitized });
      }
      case "toggleAuth": {
        const result = await toggleAuth(message.enabled);
        return respond(result);
      }
      case "resetAuth": {
        const secret = await resetSecret();
        const uri = buildOtpauthUri(secret);
        return respond({ secret, uri });
      }
      case "getAuth": {
        const state = await getState();
        const secret = state.totpSecret || (await getOrCreateSecret());
        const uri = buildOtpauthUri(secret);
        return respond({ secret, uri, authEnabled: state.authEnabled });
      }
      default:
        return respondError("Unknown message type");
    }
  };

  handler().catch((err) => respondError(err));
  return true;
});
