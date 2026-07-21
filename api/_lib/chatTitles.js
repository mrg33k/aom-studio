const AGENT_SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i

export function normalizeAgentSlug(value) {
  const slug = String(value || '').trim().toLowerCase()
  return AGENT_SLUG_RE.test(slug) ? slug : ''
}

export function normalizeChatTitle(value) {
  const title = String(value || '').replace(/\s+/g, ' ').trim()
  if (!title || title.length > 80) return ''
  return title
}

export function directChatTitleRoomId(clientId, agentSlug) {
  const tenant = String(clientId || '').trim().toLowerCase()
  const agent = normalizeAgentSlug(agentSlug)
  if (!tenant || !agent) return ''
  return `chat:${tenant}:agent:${agent}`
}

export function directChatTitlesByAgent(rows, clientId) {
  const prefix = `chat:${String(clientId || '').trim().toLowerCase()}:agent:`
  const out = {}
  for (const row of rows || []) {
    const id = String(row?.id || '')
    if (!id.startsWith(prefix)) continue
    const agent = normalizeAgentSlug(id.slice(prefix.length))
    const title = normalizeChatTitle(row?.name)
    if (agent && title) out[agent] = title
  }
  return out
}
