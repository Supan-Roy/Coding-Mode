const remainingEl = document.getElementById("remaining");

const formatRemaining = (ms) => {
  if (!ms || ms <= 0) return "less than a minute";
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
};

const refresh = async () => {
  const { sessionEnd } = await chrome.storage.local.get("sessionEnd");
  if (typeof sessionEnd !== "number") {
    remainingEl.textContent = "a moment";
    return;
  }
  const now = Date.now();
  const remaining = sessionEnd - now;
  remainingEl.textContent = formatRemaining(remaining);
};

refresh();
setInterval(refresh, 5000);
