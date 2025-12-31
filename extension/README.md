# Coding Mode – Try First Before You Ask AI

A Chrome extension to help you focus on coding by temporarily blocking AI chat sites during coding sessions. Unlock early with TOTP authentication, customize blocked domains, and auto-trigger sessions on coding platforms (optional).

## Features
- Temporarily block AI chat sites (ChatGPT, Gemini, Claude, etc.)
- TOTP unlock for early session end (optional)
- Custom domain blocking
- Auto-trigger on coding platforms (user-controlled)
- Modern, theme-adaptive UI
- Privacy-first: No data leaves your device

## Installation
1. Download or clone this repository.
2. Go to `chrome://extensions` in your browser.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the `extension` folder.

## Permissions
- All permissions are user-controlled and only used for core functionality:
  - `storage`: Save your settings and session state locally
  - `declarativeNetRequest`: Block specified domains
  - `alarms`: Manage session timers
  - `webNavigation`: Detect navigation for auto-trigger (if enabled)
  - `tabs`: Reload open tabs when session starts/ends (no data is read or sent)
- No data is ever sent to any server. All logic runs locally in your browser.

## Privacy
See [PRIVACY.md](PRIVACY.md) for full details. In short: **Your data never leaves your device.**

## Support
- [Report an issue](https://github.com/Supan-Roy/Coding-Mode/issues)
- Email: support@supanroy.com

---

© 2025 Supan Roy. Licensed under the MIT License.
