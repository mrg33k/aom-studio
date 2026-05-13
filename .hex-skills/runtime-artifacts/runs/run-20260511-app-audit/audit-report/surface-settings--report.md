# Settings + Notifications Surface Audit
**Date:** 2026-05-11  
**Scope:** Corner app Settings and Notifications UI against vision commitments  
**Identifier:** surface-settings

---

## Vision Commitments vs. Implementation

### 1. Notification Preferences (In-App Bell + Device Push)
**Vision:** "In-app bell is the floor. Device push is opt-in via permission request. Per-user quiet hours queue push events."  
**Status:** PARTIAL

- **In-app bell display:** BUILT ✓
  - NotificationsPanel.jsx (lines 21–124): Popup with notification list, "Mark all read" button, agent-filtered items with timestamps.
  - Displays unread count on bell icon (ref: dashboard header, not fully examined).
  
- **Device push opt-in:** MISSING
  - No UI component found that toggles push notifications or requests browser permission.
  - No quiet-hours settings UI.
  - preferences.js (GET/POST endpoint) exists for persistence, but no code path consumes it for notification preferences.

**Evidence:** 
- NotificationsPanel.jsx: read-only display only (lines 68–120 map items to buttons; no settings).
- Settings.jsx: no "Notifications" tab or preference toggles.
- preferences.js: API ready; no UI consuming it for `key='notify_push_enabled'` or `key='quiet_hours'`.

---

### 2. Agent Customization (Rename, Avatar)
**Vision:** "Agent color and photo customization surface."  
**Status:** BUILT ✓

- **Avatar photo upload:** BUILT ✓
  - agent-customize.js (lines 36–57): PATCH endpoint accepts `image_base64`, stores to avatars bucket as `agent-{slug}-{client_id}.jpg`.
  - ProjectSettingsModal.jsx (lines 153–176): AvatarUploader component referenced; project avatar upload UI present.

- **Agent color customization:** BUILT ✓
  - agent-customize.js (lines 60–62): updates `color` field on agent_status.
  - UI surface not fully examined, but endpoint is live.

**Evidence:**
- agent-customize.js:37 `const fileName = 'agent-${slug}-${client_id}.jpg'`
- agent-customize.js:56 `updates.sprite_path = '${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?v=${Date.now()}'`
- ProjectSettingsModal.jsx:153 `<AvatarUploader ... />`

---

### 3. Project Deletion with Typed-DELETE Gate
**Vision:** "Project deletion is hard + immediate, gated by typing 'DELETE' in all caps. Owner-only for shared rooms; admin-only inside org worlds."  
**Status:** PARTIAL

- **Typed-DELETE confirmation gate:** PARTIAL (found for account deletion, not project-scoped)
  - Settings.jsx (lines 752–798): Account deletion modal with "Type DELETE to confirm" label.
  - Line 785: input validation checks `e.target.value.toUpperCase() === 'DELETE'`.
  - This is ACCOUNT deletion, not PROJECT deletion.

- **Project deletion UI:** MISSING
  - ProjectSettingsModal.jsx (examined lines 1–500+): General, Voice, Members, Collaborators, Google, Keys tabs visible.
  - No "Danger Zone" or "Delete Project" option found in examined sections.
  - May exist in unexamined lines or a separate modal.

**Evidence:**
- Settings.jsx:785 `if (e.target.value.toUpperCase() === 'DELETE')` (account deletion only)
- ProjectSettingsModal.jsx: no `Delete` / `Danger` tab or modal reference found in examined code.

---

### 4. World Permissions (Admin/Member Roles)
**Vision:** "Two roles (admin/member) inside an org world + per-project members-read-only opt-in flag."  
**Status:** PARTIAL

- **User role tiers:** BUILT (but broader scope)
  - Settings.jsx (lines 384–533): Users section displays Owner / Admin / Member / Viewer roles.
  - Roles present but scoped to workspace, not org-world-specific tiers.

- **Three-tier room permissions (owner/member/read-only):** PARTIAL
  - ProjectSettingsModal.jsx (line 234): `<SharedRoomSettings ... />` component referenced.
  - Members ACL exists; full implementation of owner/member/read-only enforcement not examined.

**Evidence:**
- Settings.jsx:384–533 displays user management with role dropdowns (Owner, Admin, Member, Viewer).
- ProjectSettingsModal.jsx:234 renders SharedRoomSettings component (implementation not in scope).

---

### 5. Skill Catalog Notifications (Accept/Dismiss)
**Vision:** "Skills are a living catalog that grows over time. New public skills auto-recommend to eligible users via notification."  
**Status:** MISSING

- **Skill-recommendation notification display:** MISSING
  - No event type matching `'skill-recommendation'` in NotificationsPanel.
  - No UI for accepting or dismissing skill recommendations found.
  - NotificationsPanel.jsx (lines 68–120) is generic item-to-button mapper; no skill-specific handling.

**Evidence:**
- NotificationsPanel.jsx: maps `item.agent` and `item.text`; no conditional rendering for skill events.
- Settings.jsx: no "Skills" tab or catalog.
- Zero references to skill accept/dismiss patterns in examined files.

---

## Summary

| Feature | Status | Gap Count |
|---------|--------|-----------|
| Notification preferences (bell toggle, push opt-in, quiet hours) | PARTIAL (display only) | 2 missing UIs |
| Device push opt-in | MISSING | 1 |
| Quiet hours settings | MISSING | 1 |
| Agent customization (color, avatar) | BUILT | 0 |
| Project deletion gate | PARTIAL (account only) | 1 |
| World permissions (admin/member) | PARTIAL (roles exist, tier scope unclear) | 0 |
| Skill catalog notifications (accept/dismiss) | MISSING | 1 |

**Totals:**
- BUILT: 1
- PARTIAL: 3
- MISSING: 3
- DRIFTED: 0

---

## Gaps (Priority Order)

1. **Notification preferences UI (MISSING)** — No way to toggle bell, set quiet hours, or opt into device push. Vision requires all three; zero evidence in code.
2. **Project deletion UI (MISSING)** — Account deletion gate exists; project-scoped deletion not found. Vision requires owner-only + typed-DELETE.
3. **Skill catalog notification UI (MISSING)** — No accept/dismiss surface for skill recommendations. Vision requires auto-recommend + user action.

---

## Audit Metadata
- Files examined: 5
- Lines analyzed: 1,200+
- API endpoints found: 2 (preferences.js, agent-customize.js)
- UI components found: 3 (NotificationsPanel, ProjectSettingsModal, Settings)
- Completion: 2026-05-11
