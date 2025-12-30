import { renderQrToCanvas } from "./utils/qr.js";

const authToggle = document.getElementById("auth-toggle");
const qrCanvas = document.getElementById("qr-canvas");
const secretValue = document.getElementById("secret-value");
const resetAuthBtn = document.getElementById("reset-auth");
const copyUriBtn = document.getElementById("copy-uri");
const authFeedback = document.getElementById("auth-feedback");
const domainFeedback = document.getElementById("domain-feedback");
const domainsTextarea = document.getElementById("domains");
const saveDomainsBtn = document.getElementById("save-domains");
const errorEl = document.getElementById("error");

const setError = (msg = "") => {
  errorEl.textContent = msg;
};

const setAuthFeedback = (msg = "") => {
  authFeedback.textContent = msg;
  if (msg) {
    authFeedback.classList.add("success");
    setTimeout(() => {
      authFeedback.textContent = "";
      authFeedback.classList.remove("success");
    }, 3000);
  }
};

const setDomainFeedback = (msg = "") => {
  domainFeedback.textContent = msg;
  if (msg) {
    domainFeedback.classList.add("success");
    setTimeout(() => {
      domainFeedback.textContent = "";
      domainFeedback.classList.remove("success");
    }, 3000);
  }
};

const populateDomains = (list = []) => {
  domainsTextarea.value = (list || []).join("\n");
};

const loadState = async () => {
  const { ok, error, authEnabled, secret, uri, blockedDomains } = await chrome.runtime.sendMessage({ type: "getAuth" });
  if (!ok) {
    setError(error || "Unable to load authenticator state");
    return;
  }
  authToggle.checked = !!authEnabled;
  secretValue.textContent = secret ? secret.slice(0, 20) + "..." : "—";
  
  if (secret && uri) {
    try {
      renderQrToCanvas(qrCanvas, uri, 160);
    } catch (err) {
      console.error("Failed to render QR:", err);
    }
  }
  
  const { ok: okState, blockedDomains: domains, error: stateError } = await chrome.runtime.sendMessage({ type: "getState" });
  if (!okState) {
    setError(stateError || "Unable to load domains");
  } else {
    populateDomains(domains);
  }
};

const handleToggle = async () => {
  setError("");
  setAuthFeedback("");
  const enabled = authToggle.checked;
  const { ok, error, secret } = await chrome.runtime.sendMessage({ type: "toggleAuth", enabled });
  if (!ok) {
    authToggle.checked = !enabled;
    setError(error || "Could not update authenticator state");
    return;
  }
  if (secret && uri) {
    secretValue.textContent = secret.slice(0, 20) + "...";
    try {
      renderQrToCanvas(qrCanvas, uri, 160);
    } catch (err) {
      console.error("Failed to render QR:", err);
    }
  }
  setAuthFeedback(enabled ? "✓ Authentication enabled" : "✓ Authentication disabled");
};

const handleReset = async () => {
  setError("");
  setAuthFeedback("");
  const { ok, error, secret, uri } = await chrome.runtime.sendMessage({ type: "resetAuth" });
  if (!ok) {
    setError(error || "Could not reset authenticator");
    return;
  }
  secretValue.textContent = secret ? secret.slice(0, 20) + "..." : "—";
  if (uri) {
    try {
      renderQrToCanvas(qrCanvas, uri, 160);
    } catch (err) {
      console.error("Failed to render QR:", err);
    }
  }
  setAuthFeedback("✓ Secret reset. Rescan QR in your authenticator app.");
};

const handleCopyUri = async () => {
  const { ok, uri } = await chrome.runtime.sendMessage({ type: "getAuth" });
  if (!ok || !uri) return;
  await navigator.clipboard.writeText(uri);
  setAuthFeedback("✓ URI copied to clipboard");
};

const handleSaveDomains = async () => {
  setError("");
  setDomainFeedback("");
  const raw = domainsTextarea.value.split(/\n+/).map((v) => v.trim()).filter(Boolean);
  const { ok, error } = await chrome.runtime.sendMessage({ type: "updateDomains", domains: raw });
  if (!ok) {
    setError(error || "Could not save domains");
    return;
  }
  setDomainFeedback("✓ Domains saved. Active sessions updated.");
};

const init = async () => {
  authToggle.addEventListener("change", handleToggle);
  resetAuthBtn.addEventListener("click", handleReset);
  copyUriBtn.addEventListener("click", handleCopyUri);
  saveDomainsBtn.addEventListener("click", handleSaveDomains);
  await loadState();
};

init();
