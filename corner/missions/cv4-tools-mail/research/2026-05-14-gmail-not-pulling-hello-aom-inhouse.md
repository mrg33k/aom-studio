# Gmail not pulling for hello@aom-inhouse.com — R3-A diagnosis

**Date:** 2026-05-14  
**Task:** 19b6a480-2599-40e1-8e66-f21d10b3d8fc  
**Status:** ROOT CAUSE CONFIRMED — no code fix needed; action required from Patrik

---

## Three-cause checklist

### Cause 1: Missing Vercel env vars
**Eliminated.** R1 verification flagged `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `TOKEN_ENC_KEY` as missing. All three were added to production ~12 hours ago (visible in `vercel env ls production` — all show "12h ago"). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were already present. No env var gap remains.

### Cause 2: No Gmail OAuth row for this account ← CONFIRMED ROOT CAUSE
**Confirmed.** Queried `account_integrations` table (Supabase project `mcngatprgluexjjcqpkp`) against service role key. Result: **0 rows total** — not just for `hello@aom-inhouse.com`, but for every user in the system. No Gmail (or any) OAuth consent flow has ever been completed.

The `hello@aom-inhouse.com` address is not a Corner auth account (it does not appear in `auth.users`). It is the Gmail inbox Patrik wants to connect. The Corner session Patrik uses (`patrikmatheson@gmail.com`, user ID `833f6828-...`, or whichever account he browses `/cv4` from) is what must be signed in when clicking "Connect Gmail."

### Cause 3: Live API error
**Not reached** — no token row to decrypt, so the live API path has never been exercised. `getGmailToken` returns `null` on a missing row, which makes `list.js` return `{mode:'not-connected'}` — the `NotConnected` component renders correctly. No code bug in this path.

---

## What Patrik needs to do (in order)

### Step 1 — Verify Google Cloud Console redirect URI
The OAuth app behind `GOOGLE_OAUTH_CLIENT_ID` must have this exact URI registered as an authorized redirect:
```
https://aheadofmarket.com/api/integrations/oauth/callback
```
If this URI is missing, Google returns `redirect_uri_mismatch` immediately and no token is issued. Check in Google Cloud Console → APIs & Services → Credentials → the OAuth 2.0 Client ID matching the `GOOGLE_OAUTH_CLIENT_ID` value → Authorized redirect URIs.

### Step 2 — Connect Gmail via the Mail Room UI
1. Browse to `https://aheadofmarket.com/cv4` while signed in to Corner
2. Click **Tools → Mail** in the left drawer
3. The right rail shows "Connect Gmail" (rendered by `MailListPanel.jsx → NotConnected`)
4. Click **Connect Gmail** → hits `/api/integrations/oauth/start?slug=gmail` → redirects to Google's consent screen
5. Grant `gmail.modify` + `gmail.send` scopes for `hello@aom-inhouse.com`
6. Google redirects back to `/api/integrations/oauth/callback` → token is AES-GCM encrypted and upserted into `account_integrations` under the signed-in Corner user's `user_id`

### Step 3 — Verify the row landed
After completing the consent flow, `account_integrations` should have 1 row with `integration_slug = 'gmail'`. The Mail Room rail automatically polls within 30 seconds and populates.

---

## Code review — no bugs found in the happy path

Reviewed the full chain end-to-end:

- `authFetch.js` — attaches Supabase session `access_token` as `Authorization: Bearer` ✓
- `verifyTenant.js → extractJwt` — reads Bearer header ✓
- `gmailClient.js → getUserIdFromRequest` — resolves `user_id` from JWT via Supabase auth ✓
- `gmailClient.js → loadRow` — queries `account_integrations?user_id=eq.{id}&integration_slug=eq.gmail` ✓
- `gmailClient.js → getGmailToken` — decrypts token, checks expiry, refreshes using Google creds ✓
- `list.js` — applies real-human filter, returns `{mode:'not-connected'}` when creds are null ✓

The `NotConnected` component renders with a working "Connect Gmail" anchor pointing to `/api/integrations/oauth/start?slug=gmail`. Once a token row exists, the full pull path is clean.

---

## Summary

| Cause | Status | Action |
|-------|--------|--------|
| Missing env vars | Eliminated — all three added ~12h ago | None |
| No OAuth row | **Root cause** — zero rows in table | Patrik clicks "Connect Gmail" |
| Code bug | Not found | None |

**Blocker for Patrik before clicking Connect Gmail:** verify `https://aheadofmarket.com/api/integrations/oauth/callback` is registered as an authorized redirect URI in Google Cloud Console for the OAuth app.
