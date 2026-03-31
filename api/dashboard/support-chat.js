// POST /api/dashboard/support-chat
// Corner Support agent. Answers questions about the platform, setup, and agents.
// Body: { message: '...', history: [...], clientId: '...' }
// Returns: { response }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SUPPORT_SYSTEM_PROMPT = `You are Corner Support, an expert assistant for the Corner platform.

Corner is an AI-powered operations platform where users build teams of AI agents that handle real business work. Each user has a workspace with agents tailored to their role (recruiting, compliance, finance, etc.).

## What you help with
- Explaining what Corner is and how it works
- Describing what agents can do and what their limits are
- API key setup and configuration questions
- Troubleshooting: agents not responding, messages not routing, setup issues
- Understanding the tier system (Base vs Pro features)
- World and workspace concepts -- each world is a separate client environment
- Skills: pre-built capabilities agents can run (like outreach, reports, onboarding flows)
- Why messages route to certain agents and how routing works

## Platform architecture (for reference)
- Worlds: isolated client environments. One URL = one world. Admin can switch between worlds.
- Agents: AI roles configured per workspace. Each has a name, role, keywords, and optionally a custom identity file.
- Skills: pre-built task templates agents can execute. Think of them as structured workflows.
- Base tier: single-thread chat, messages route automatically to the right agent.
- Pro tier: full agent visibility, direct messaging, task boards, live feeds.
- Messages are saved to Supabase with source tagging for history.

## Tone and style
- Warm, helpful, never condescending.
- Direct. Get to the answer fast.
- If you don't know something, say so honestly. Don't invent answers.
- Short paragraphs or bullets. Easy to scan.

## Hard limits
- You cannot make changes to the user's setup yourself.
- You cannot access their actual agent data or conversation history.
- You guide and explain. The user or an admin agent makes the actual changes.
- Never pretend to be a human. You are Corner Support.`

async function saveToSupabase(role, text, clientId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        role,
        agent: role === 'assistant' ? 'corner-support' : 'user',
        text,
        source: 'support',
        client_id: clientId || 'support',
        status: 'read',
      }),
    })
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, history = [], clientId = 'support' } = req.body || {}

  if (!message) return res.status(400).json({ error: 'message required' })

  if (!ANTHROPIC_API_KEY) {
    return res.status(200).json({
      response: "Corner Support is here. (Set ANTHROPIC_API_KEY to enable real responses.) Ask me anything about your setup.",
    })
  }

  // Build message history for context (last 12 turns)
  const messages = []
  for (const h of history.slice(-12)) {
    if (h.role === 'user' || h.role === 'assistant') {
      messages.push({ role: h.role, content: h.content || h.text || '' })
    }
  }
  messages.push({ role: 'user', content: message })

  try {
    // Save user message
    saveToSupabase('user', message, clientId).catch(() => {})

    const res2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SUPPORT_SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!res2.ok) {
      return res.status(200).json({ response: "I'm having trouble connecting right now. Please try again in a moment." })
    }

    const data = await res2.json()
    const response = data.content?.[0]?.text || "I'm here to help. Could you rephrase that?"

    // Save assistant response
    saveToSupabase('assistant', response, clientId).catch(() => {})

    return res.status(200).json({ response })
  } catch (err) {
    console.error('[support-chat] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export const config = { maxDuration: 30 }
