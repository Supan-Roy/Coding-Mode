const remainingEl = document.getElementById("remaining");
const blockMessage = document.getElementById("block-message");
const blockNote = document.getElementById("block-note");

const formatRemaining = (ms) => {
  if (!ms || ms <= 0) return "less than a minute";
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "less than 1 minute";
  return `less than ${minutes} minutes`;
};

const refresh = async () => {
  const { sessionEnd } = await chrome.storage.local.get("sessionEnd");
  const now = Date.now();
  if (typeof sessionEnd !== "number" || sessionEnd <= now) {
    blockMessage.textContent = "You can close this tab and open any chatbot.";
    blockNote.textContent = "Session ended. AI access is now unlocked.";
    return;
  }
  const remaining = sessionEnd - now;
  remainingEl.textContent = formatRemaining(remaining);
};

refresh();
setInterval(refresh, 5000);
