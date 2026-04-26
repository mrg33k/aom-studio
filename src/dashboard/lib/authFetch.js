// Wrap window.fetch to attach the current Supabase session's access_token as
// an Authorization: Bearer header. Used by dashboard callers of /api/dashboard/*
// endpoints that enforce tenant isolation via aom-studio/api/_lib/verifyTenant.js.
//
// If supabase isn't configured (localhost without env), or no session is active,
// the request goes out without an Authorization header — the endpoint will
// reject with 401, which is the correct outcome.
import { supabase } from './supabase.js'

export async function authFetch(url, opts = {}) {
  let token = null
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession()
      token = data?.session?.access_token || null
    } catch {
      token = null
    }
  }
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, { ...opts, headers })
}
