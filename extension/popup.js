const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const countdown = document.getElementById("countdown");
const errorEl = document.getElementById("error");
const totpInput = document.getElementById("totp-code");
const customMinutesInput = document.getElementById("custom-minutes");

const setError = (message = "") => {
  errorEl.textContent = message;
};

const formatRemaining = (ms) => {
  if (!ms || ms <= 0) return "Time is up";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const minText = minutes > 0 ? `${minutes}m` : "";
  const secText = `${seconds}s`;
  return `${minText} ${secText}`.trim();
};

const refreshState = async () => {
  const { ok, error, active, remainingMs } = await chrome.runtime.sendMessage({ type: "getState" });
  if (!ok) {
    setError(error || "Unable to load state");
    return;
  }
  setError("");
  statusDot.classList.toggle("active", active);
  statusText.textContent = active ? "Status: Active" : "Status: Inactive";
  countdown.textContent = active ? `Remaining: ${formatRemaining(remainingMs)}` : "No active session";
};

const loadAuthState = async () => {
  const { ok, error, authEnabled, secret, uri } = await chrome.runtime.sendMessage({ type: "getAuth" });
  if (!ok) {
    console.error("Failed to load auth state:", error);
    return;
  }
  authToggle.checked = !!authEnabled;
  qrContainer.style.display = authEnabled ? "block" : "none";
  if (secret) {
    secretPopup.textContent = secret.slice(0, 12) + "...";
  }
  if (uri && authEnabled) {
    renderQrToCanvas(qrCanvasPopup, uri, 120);
  }
};

const startSession = async (minutes) => {
  setError("");
  try {
    const { ok, error } = await chrome.runtime.sendMessage({ type: "startSession", durationMinutes: minutes });
    if (!ok) throw new Error(error || "Could not start session");
    await refreshState();
  } catch (err) {
    setError(err.message);
  }
};

const endSession = async () => {
  setError("");
  const code = totpInput.value.trim();
  try {
    const { ok, error, ended } = await chrome.runtime.sendMessage({ type: "endSession", code });
    if (!ok) throw new Error(error || "Could not end session");
    if (!ended) throw new Error(error || "Code required");
    totpInput.value = "";
    await refreshState();
  } catch (err) {
    setError(err.message);
  }
};

const bindDurations = () => {
  document.querySelectorAll("button[data-duration]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const minutes = Number(btn.dataset.duration);
      startSession(minutes);
    });
  });
};

const bindCustom = () => {
  const startBtn = document.getElementById("start-custom");
  startBtn.addEventListener("click", () => {
    const minutes = Number(customMinutesInput.value);
    if (!minutes || minutes <= 0) {
      setError("Enter a positive number of minutes");
      return;
    }
    startSession(minutes);
  });
};

const init = async () => {
  bindDurations();
  bindCustom();
  document.getElementById("end-session").addEventListener("click", endSession);
  document.getElementById("open-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  await refreshState();
  setInterval(refreshState, 5000);
};

init();
