# Privacy Policy – Coding Mode Chrome Extension

**Effective Date:** December 31, 2025

## Overview
Coding Mode is designed with privacy and user control as top priorities. This extension does not collect, transmit, or store any personal data outside your device. All permissions are user-controlled and only used for the extension’s core features.

## Data Collection
- **No personal data is collected.**
- All settings, session data, and authentication secrets are stored locally in your browser using `chrome.storage.local`.
- No data is sent to any external server or third party.

## Permissions
- **storage**: Used to save your extension settings and session state locally.
- **declarativeNetRequest**: Used to block specified domains as configured by you.
- **alarms**: Used to manage session timers.
- **webNavigation**: Used to detect navigation for optional auto-triggering (only if you enable it).
- **tabs**: Used to reload open tabs when a session starts or ends. No browsing history or content is read or sent.

All permissions are required for the extension’s core functionality and are only active as needed. You control which features are enabled.

## User Control
- You can enable or disable auto-trigger, TOTP authentication, and custom domain blocking at any time in the extension’s settings.
- You can remove the extension at any time.

## Security
- All authentication secrets (for TOTP) are generated and stored locally.
- No sensitive information is ever transmitted or shared.

## Contact
For questions or concerns, contact: support@supanroy.com

---

© 2025 Supan Roy. All rights reserved.
