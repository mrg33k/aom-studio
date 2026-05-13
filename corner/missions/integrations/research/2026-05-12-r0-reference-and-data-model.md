# R0 Research: 180-Integration Reference + Data Model + Menu UX

**Date:** 2026-05-12
**Mission:** `corner:integrations`
**Round:** R0 — research only, no code changes
**Status:** landed

---

## 1. Reference App Identified: Pica (picaos.com / withone.ai)

### Verdict

**Pica is the reference Patrik called out.** Conversation logs were not accessible in this snapshot; identification is based on candidate analysis. Pica is the only candidate that satisfies all three signal criteria simultaneously:

| Criterion | Pica | Composio | n8n | StackOne |
|-----------|------|----------|-----|----------|
| ~180 integration count | ✅ 160-170 confirmed | ❌ 982 toolkits | ✅ ~180 nodes but workflow-first | ❌ 270+ |
| Available vs Connected split | ✅ Explicit in UI + MCP API | ❌ No binary split | ❌ No | ❌ "Live/Planned" not user-state |
| Built for AI agents | ✅ "the reliable integration layer for AI agents" | ✅ Yes | ⚠️ Partially | ⚠️ Enterprise HR vertical |

### Pica details

- **URL:** picaos.com (now rebranding to withone.ai)
- **Integration count:** Marketed as "160+ connectors" (LinkedIn post) / "170+ integrations" (Bolt.new blog). API docs show 142 paginated entries at a 2025-Q1 snapshot; current product is in the 160-180 range — the ~180 count Patrik would have seen.
- **Available vs Connected:** The dashboard at `app.picaos.com/connections` splits into services the user hasn't yet authorized (Available) vs those they've connected (Connected). The MCP tool `list_pica_integrations` explicitly returns these two sets. The AuthKit embeddable shows "available integrations to browse and select from" with connected status tracked separately per account.
- **Category structure (confirmed):** AI, Payments, Email, CRM (Salesforce, HubSpot, Attio), Communication (Slack, Gmail), Productivity (Notion, Todoist), Accounting (QuickBooks), E-commerce (Shopify), Dev Tools (GitHub), Databases (Supabase, InstantDB).
- **Per-card design:** Logo (40px) + service name (bold) + status indicator (connected = green filled circle; available = ghost circle). Clean minimal card, AI-agent focused.
- **Why "perfect to model after":** Pica was designed from day one as an integration layer for AI agents/agentic workflows, mapping directly to Corner's direction. The Available/Connected split is exactly the UX pattern needed for per-account state.

### Composio as secondary UX reference

Composio (composio.dev) has 982 toolkits — too many to match the ~180 count, but its **category taxonomy** is the most thorough available and worth borrowing for Corner's catalog organization. Confirmed categories: Developer Tools & DevOps, Collaboration & Communication, CRM, Finance & Accounting, Marketing & Social Media, Document & File Management, AI & ML, Productivity & Project Management, Design & Creative, Scheduling & Booking, E-commerce, Sales & Customer Support, HR & Recruiting, Social Media, Workflow Automation, Education.

---

## 2. Slash Command Path Audit

### Files examined

| File | Path |
|------|------|
| Autocomplete picker | `src/dashboard/components/cv3/SlashCommandAutocomplete.jsx` |
| Skills catalog | `src/data/skills.json` |
| Thread input bar | `src/dashboard/components/cv3/thread/ThreadInputBar.jsx` |
| Project input bar | `src/dashboard/components/cv3/project-chat/ProjectInputBar.jsx` |

### How it works today

**`skills.json`** is a static JSON file with a `skills` array. Each entry has:
```json
{
  "name": "/video-story-cut",
  "alias": "/b-roll-story-cut",
  "description": "Full structured edit: transcript > story > cut",
  "category": "video",
  "categoryLabel": "Video / Content Production"
}
```

**`SlashCommandAutocomplete.jsx`** flow:
1. `findActiveSlash(value, caret)` — scans backward from caret; returns `{ start, end, query }` if cursor is inside a `/token`
2. `scoreSkill(skill, q)` — fuzzy match with scoring; top 8 shown
3. `insertSkill(skill)` — **the single action**: replaces the `/token` with `skill.name + ' '` and repositions caret. **No dispatch, no modal, no side effects beyond text mutation.**
4. Keyboard: ArrowUp/Down navigate, Enter/Tab selects (calls `insertSkill`), Escape dismisses
5. Both `ThreadInputBar` and `ProjectInputBar` mount it identically:
   ```jsx
   <SlashCommandAutocomplete value={input} setValue={setInput} inputRef={inputRef} caret={caret} />
   ```

### Where `kind: 'modal'` lands cleanest

**Recommended: `onModalDispatch` prop (Option A)**

Add a single prop to `SlashCommandAutocomplete`. When a picked skill has `kind: 'modal'`, call the prop instead of inserting text:

```jsx
// SlashCommandAutocomplete.jsx — modified insertSkill
const insertSkill = useCallback((skill) => {
  if (!active) return
  if (skill.kind === 'modal' && onModalDispatch) {
    onModalDispatch(skill.modalId)        // ← dispatch to parent
    setOpen(false)
    // clear the /token so it doesn't linger
    const before = value.slice(0, active.start)
    const after = value.slice(active.end)
    setValue(before + after.trimStart())
    return
  }
  // existing text-insert path unchanged
  const before = value.slice(0, active.start)
  const after = value.slice(active.end)
  const trail = after.startsWith(' ') ? '' : ' '
  setValue(before + skill.name + trail + after)
  setOpen(false)
  ...
}, [active, value, setValue, inputRef, onModalDispatch])
```

**State placement:** Add `integrationsModalOpen / setIntegrationsModalOpen` to `ChatPanelContext` (already consumed by both input bars). Both input bars then pass:
```jsx
onModalDispatch={(modalId) => modalId === 'integrations' && setIntegrationsModalOpen(true)}
```

**skills.json entry to add:**
```json
{
  "name": "/integrations",
  "alias": null,
  "description": "Browse and manage your connected integrations",
  "category": "corner",
  "categoryLabel": "Corner Platform",
  "kind": "modal",
  "modalId": "integrations"
}
```

**Why not a parallel `SlashCommandRouter`?** A router is cleaner long-term, but for R1 the modal count is 1. The `onModalDispatch` prop adds ~8 lines to `SlashCommandAutocomplete` with zero breaking changes to existing skills. A router can be extracted when there are 3+ modal-type commands.

---

## 3. Data Model Proposal

### `account_integrations` table

```sql
CREATE TABLE account_integrations (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_slug  text        NOT NULL,
  status            text        NOT NULL DEFAULT 'available',
    -- 'available' | 'connected' | 'configuring' | 'error'
  connected_at      timestamptz,
  last_used_at      timestamptz,
  credentials_ref   text,                         -- Supabase Vault secret ID (UUID)
  config            jsonb       DEFAULT '{}'::jsonb,
    -- non-secret config: webhook URLs, granted scopes, display name override
  error_message     text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT account_integrations_user_slug_unique
    UNIQUE (user_id, integration_slug),
  CONSTRAINT account_integrations_status_check
    CHECK (status IN ('available','connected','configuring','error'))
);

CREATE INDEX account_integrations_user_id_idx ON account_integrations (user_id);
CREATE INDEX account_integrations_status_idx  ON account_integrations (status);
CREATE INDEX account_integrations_slug_idx    ON account_integrations (integration_slug);

ALTER TABLE account_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON account_integrations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON account_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON account_integrations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON account_integrations
  FOR DELETE USING (auth.uid() = user_id);
```

### Credential storage

**Supabase Vault only.** Never store tokens, API keys, or OAuth secrets in `account_integrations` directly.

Flow:
1. OAuth callback → `vault.create_secret(token_json, label)` → returns `secret_id`
2. Store `secret_id` in `credentials_ref`
3. When agent needs credential: `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = credentials_ref`
4. Vault handles encryption at rest via pgsodium

The `config` jsonb holds non-sensitive metadata: granted scopes, preferred display name, webhook URL.

### Status transitions

```
available
  │
  ▼ user clicks "Connect"
configuring
  │                │
  ▼ OAuth success  ▼ OAuth failure
connected          error
  │                │
  ▼ disconnect     ▼ user retries
available        configuring

connected ──► error       (token refresh fails, 401 from downstream API)
error     ──► configuring (user hits Retry)
```

---

## 4. Menu UX Proposal

Modeled on Pica's Available/Connected split, with Composio's category taxonomy depth.

### Modal layout

```
┌─────────────────────────────────────────────────────────┐
│  Integrations                                     [✕]   │
│  23 connected · 142 available                           │
│─────────────────────────────────────────────────────────│
│  [🔍 Search integrations...]                            │
│  [ All ]  [ Connected ]                                 │
│─────────────────────────────────────────────────────────│
│ ◀ sidebar ▶ │  ◀──────── card grid (2-3 col) ─────────▶│
│             │                                           │
│  All        │  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  Comms      │  │ [Gmail]  │  │ [Slack]  │  │[Notion]│  │
│  Calendar   │  │  Gmail   │  │  Slack   │  │ Notion │  │
│  CRM        │  │  Email   │  │  Msgs    │  │  Docs  │  │
│  Productivity│  │✓Connected│  │ +Connect │  │+Connect│  │
│  Dev Tools  │  └──────────┘  └──────────┘  └────────┘  │
│  Payments   │                                           │
│  Storage    │  ┌──────────┐  ┌──────────┐  ...         │
│  Social     │  │ [Stripe] │  │ [GCal]   │              │
│  AI & ML    │  │  Stripe  │  │ G.Cal    │              │
│  E-commerce │  │ Payments │  │ Calendar │              │
│  Marketing  │  │ +Connect │  │ +Connect │              │
│  HR         │  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

### Categories (R1 starter set — 12 categories)

| slug | label | example integrations |
|------|-------|---------------------|
| `comms` | Communication | Gmail, Outlook, Slack, Discord, Teams |
| `calendar` | Calendar & Scheduling | Google Calendar, Outlook Calendar, Calendly |
| `crm` | CRM | HubSpot, Salesforce, Attio, Close |
| `productivity` | Productivity | Notion, Linear, Asana, Todoist, Trello |
| `devtools` | Developer Tools | GitHub, GitLab, Jira, Linear |
| `payments` | Payments & Finance | Stripe, QuickBooks, Xero |
| `storage` | Storage & Files | Google Drive, Dropbox, OneDrive |
| `social` | Social Media | Twitter/X, LinkedIn, Instagram |
| `ai` | AI & ML | OpenAI, Anthropic, Perplexity |
| `ecommerce` | E-commerce | Shopify, WooCommerce |
| `marketing` | Marketing | Mailchimp, ActiveCampaign, Klaviyo |
| `hr` | HR & Recruiting | Greenhouse, BambooHR, Rippling |

### Per-card layout

```
┌─────────────────────────────────┐
│ [Logo 40×40]  Service Name      │
│               Short description  │
│                                  │
│  [✓ Connected]  or  [+ Connect]  │
└─────────────────────────────────┘
```

- **Connected:** Green pill `✓ Connected` + 3-dot overflow on hover → "Configure" / "Disconnect"
- **Available:** Ghost button `+ Connect` (stub in R1, real OAuth in R2+)
- **Configuring:** Spinner + "Connecting..."
- **Error:** Red badge `⚠ Error` + "Retry" button

### Search

Client-side fuzzy match on `name` + `description` + `category`. No server call — catalog is fully in `integrations.json`. Debounced 150ms. Show result count ("12 results").

### Empty states

**Connected tab — nothing connected yet:**
```
  [🔌]
  No integrations connected yet.
  Browse the catalog and connect your tools
  to unlock agent capabilities.
  [Browse catalog →]
```

**Search — no results:**
```
  [🔍]
  No integrations match "{query}".
  Try a different term or browse by category.
```

---

## 5. Conclusion — Build-Ready Spec for R1

### What R1 ships

1. `/integrations` slash command opens an integrations modal
2. Static catalog of 20-30 stub integrations from `integrations.json`
3. Supabase `account_integrations` table with RLS
4. Available / Connected split rendered from real per-account data
5. Search + category filter (client-side)
6. Stub connect/disconnect (creates/deletes rows; no real OAuth)

### Files to create

| File | Purpose |
|------|---------|
| `src/data/integrations.json` | Static catalog registry. Per-entry schema: `{ slug, name, description, category, logoUrl, authType, docsUrl }` |
| `src/dashboard/components/cv3/IntegrationsModal.jsx` | Modal: category sidebar, All/Connected tabs, search bar, card grid |
| `supabase/migrations/<timestamp>_account_integrations.sql` | Table + RLS + indexes as specified in §3 |
| `src/pages/api/integrations/list.js` | GET: merge catalog + per-account rows for calling user |
| `src/pages/api/integrations/connect.js` | POST: upsert row, set `status='connected'` (stub, no OAuth) |
| `src/pages/api/integrations/disconnect.js` | POST: set `status='available'`, null `credentials_ref` |

### Files to modify

| File | Change |
|------|--------|
| `src/data/skills.json` | Add `/integrations` entry with `kind: 'modal'`, `modalId: 'integrations'` |
| `src/dashboard/components/cv3/SlashCommandAutocomplete.jsx` | Accept `onModalDispatch` prop; add `kind === 'modal'` branch in `insertSkill` |
| `src/dashboard/components/cv3/thread/ThreadInputBar.jsx` | Pass `onModalDispatch`; render `<IntegrationsModal>` conditionally |
| `src/dashboard/components/cv3/project-chat/ProjectInputBar.jsx` | Same as ThreadInputBar |
| `src/dashboard/components/cv3/chat/ChatPanelContext.jsx` | Add `integrationsModalOpen / setIntegrationsModalOpen` to context value |

### Acceptance criteria for R1

- [ ] `/integrations` in thread or project chat → Enter/Tab → modal opens, input cleared
- [ ] Modal shows ≥20 catalog entries organized by category sidebar
- [ ] Search filters catalog client-side (name + description)
- [ ] "Connected" tab shows empty state when no integrations are connected
- [ ] Stub "Connect" creates row in `account_integrations`; card flips to Connected without page reload
- [ ] Stub "Disconnect" removes/updates row; card reverts to Available
- [ ] GET `/api/integrations/list` returns `{ catalog, connected }` for authenticated user
- [ ] Supabase migration applies cleanly in local dev (`supabase db reset` passes)
- [ ] No console errors at: modal open, tab switch, search, connect, disconnect
- [ ] Desktop: modal overlay, left category sidebar, 3-column card grid
- [ ] Mobile (≤768px): full-screen, horizontal category scroll, 2-column grid

### Open questions for Patrik before R1 brief is authored

1. **Modal vs drawer?** Centered modal overlay (Pica style, simpler) or right-side drawer (persistent, chat stays visible)? Recommendation: modal for R1.
2. **Which 20-30 stubs?** Suggested: Gmail, Google Calendar, Slack, Stripe, Linear, GitHub, Notion, HubSpot, Shopify, Zapier, OpenAI, Anthropic, Google Drive, Dropbox, Twitter/X, LinkedIn, Mailchimp, QuickBooks, Salesforce, Airtable, Asana, Discord, Figma, Intercom, Twilio.
3. **Logo source?** `simple-icons` npm package (free, comprehensive, offline) or individual brand CDN URLs? Recommend `simple-icons`.
