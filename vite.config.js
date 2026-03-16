import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import { WebSocketServer } from 'ws'
import { watch } from 'chokidar'

// AOM-EA local filesystem root for localhost dashboard mode
const AOM_EA_ROOT = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA'

// Agent folder mapping (slug -> project folder name)
const AGENT_FOLDERS = {
  bobby: 'bobby', colton: 'colton', steffen: 'steffen', jacob: 'jacob',
  elon: 'sys', alex: 'aom-strategy', steve: 'steve', cleo: 'content-agent',
  tony: 'tony', paige: 'paige', pixel: 'pixel', mom: 'mom',
}

const AGENTS_LIST = [
  { slug: 'bobby', name: 'Bobby', role: 'Web Dev' },
  { slug: 'colton', name: 'Colton', role: 'Backup Builder' },
  { slug: 'elmo', name: 'Elmo', role: 'QA Gate' },
  { slug: 'steffen', name: 'Steffen', role: 'Creative Director' },
  { slug: 'jacob', name: 'Jacob', role: 'Outreach' },
  { slug: 'elon', name: 'Elon', role: 'Systems' },
  { slug: 'alex', name: 'Alex', role: 'Strategy' },
  { slug: 'steve', name: 'Steve', role: 'AI Advisory' },
  { slug: 'cleo', name: 'Cleo', role: 'Content' },
  { slug: 'tony', name: 'Tony', role: 'Social Media' },
  { slug: 'paige', name: 'Paige', role: 'Client Success' },
  { slug: 'pixel', name: 'Pixel', role: 'Extension' },
  { slug: 'mom', name: 'Mom', role: 'Orchestrator' },
]

function readLocalFile(relativePath) {
  const fullPath = resolve(AOM_EA_ROOT, relativePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}

function parseTable(md, sectionHeader) {
  if (!md) return []
  const lines = md.split('\n')
  let inSection = false
  const rows = []
  let headerCols = null

  for (const line of lines) {
    if (line.includes(sectionHeader)) { inSection = true; continue }
    if (inSection && line.startsWith('## ') && !line.includes(sectionHeader)) break
    if (!inSection) continue
    if (line.startsWith('|') && !line.match(/^\|\s*-/)) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean)
      if (!headerCols) { headerCols = cols; continue }
      if (cols.length >= 2 && cols[0] !== '(none)') rows.push(cols)
    }
  }
  return rows
}

function parseMissions(md) {
  const running = [], completed = []
  for (const cols of parseTable(md, '## Running')) {
    running.push({ agent: cols[0], mission: cols[1] || '', launched: cols[2] || '', status: cols[3] || 'Running' })
  }
  for (const cols of parseTable(md, '## Recently Completed')) {
    completed.push({ agent: cols[0], mission: cols[1] || '', launched: cols[2] || '', completed: cols[3] || '', result: cols[4] || '' })
  }
  return { running, completed }
}

function parsePriorities(md) {
  const agentTable = []
  for (const cols of parseTable(md, '## AGENTS -- STATUS')) {
    agentTable.push({ agent: cols[0], status: cols[1] || '', whatsNext: cols[2] || '' })
  }
  const blockers = []
  if (md) {
    const lines = md.split('\n')
    let currentSection = ''
    for (const line of lines) {
      if (line.startsWith('## ')) currentSection = line.replace('## ', '').trim()
      if (/BLOCKED|blocking|needs approval|waiting on Patrik/i.test(line) && !line.startsWith('|') && line.trim().length > 10) {
        const clean = line.replace(/^[\s*\-\d.]+/, '').trim()
        if (clean.length > 5) blockers.push({ description: clean, source: currentSection })
      }
    }
  }
  return { agentTable, blockers }
}

function deriveAgentStatus(agentName, missions, priorities) {
  const running = missions.running.find(m => m.agent.toLowerCase() === agentName.toLowerCase())
  if (running) {
    if (running.status.toLowerCase().includes('block')) return { status: 'BLOCKED', task: running.mission, since: running.launched }
    return { status: 'WORKING', task: running.mission, since: running.launched }
  }
  const ps = priorities.agentTable.find(a => a.agent.toLowerCase() === agentName.toLowerCase())
  if (ps) {
    const s = ps.status.toUpperCase()
    let status = 'IDLE'
    if (s.includes('PAUSED')) status = 'PAUSED'
    else if (s.includes('BLOCKED')) status = 'BLOCKED'
    else if (s.includes('WAITING')) status = 'WAITING'
    else if (s.includes('DONE') || s.includes('COMPLETE')) status = 'DONE'
    else if (s.includes('ACTIVE')) status = 'WORKING'
    else if (s.includes('QUEUED')) status = 'WAITING'
    else if (s.includes('IDLE')) status = 'IDLE'
    else if (s.includes('INCOMPLETE')) status = 'WORKING'
    return { status, task: ps.whatsNext, since: null }
  }
  return { status: 'IDLE', task: 'Standing by', since: null }
}

function parseNotifications(md) {
  if (!md) return []
  const lines = md.split('\n').filter(l => l.trim().startsWith('['))
  return lines.slice(-30).reverse().map((line, i) => {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (!match) return null
    const time = match[1]
    const rest = match[2]
    // Try to extract agent name
    let agentName = null
    for (const a of AGENTS_LIST) {
      if (rest.toLowerCase().includes(a.name.toLowerCase())) { agentName = a.name; break }
    }
    return { id: `notif-${i}`, time, message: rest, agentName, agentSlug: agentName ? AGENTS_LIST.find(a => a.name === agentName)?.slug : null }
  }).filter(Boolean)
}

function localDashboardPlugin() {
  return {
    name: 'aom-local-dashboard',
    configureServer(server) {
      server.middlewares.use('/api/local/status', (req, res) => {
        const missionsRaw = readLocalFile('context/active-missions.md')
        const prioritiesRaw = readLocalFile('context/current-priorities.md')
        const missions = parseMissions(missionsRaw)
        const priorities = parsePriorities(prioritiesRaw)

        const agents = AGENTS_LIST.map(agent => {
          const derived = deriveAgentStatus(agent.name, missions, priorities)
          const lastCompletion = missions.completed.find(m => m.agent.toLowerCase() === agent.name.toLowerCase())
          return {
            slug: agent.slug, name: agent.name, role: agent.role,
            status: derived.status, currentTask: derived.task, timeActive: derived.since || null,
            lastCompletion: lastCompletion ? { date: lastCompletion.completed, description: lastCompletion.mission, result: lastCompletion.result } : null,
          }
        })

        const throughput = {
          working: agents.filter(a => a.status === 'WORKING').length,
          idle: agents.filter(a => a.status === 'IDLE').length,
          blocked: agents.filter(a => a.status === 'BLOCKED').length,
          doneToday: agents.filter(a => a.status === 'DONE').length,
          paused: agents.filter(a => a.status === 'PAUSED').length,
          waiting: agents.filter(a => a.status === 'WAITING').length,
          commitsToday: 0,
        }

        const blockers = priorities.blockers.map(b => {
          let agent = null
          for (const a of AGENTS_LIST) {
            if (b.description.toLowerCase().includes(a.name.toLowerCase())) { agent = a.name; break }
          }
          return { ...b, agent }
        }).filter(b => b.description.length > 10)

        // Read agent notifications as pipeline feed
        const notifRaw = readLocalFile('context/agent-notifications.md')
        const notifs = parseNotifications(notifRaw)
        const pipelineFeed = notifs.map(n => ({
          time: n.time, agent: n.agentSlug, description: n.message,
          commitHash: null, commitUrl: null, repo: 'local',
        }))

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          agents, throughput, blockers: blockers.slice(0, 10), pipelineFeed,
          lastUpdated: new Date().toISOString(), source: 'local',
        }))
      })

      // Serve raw local files for specific paths
      server.middlewares.use('/api/local/file', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const filePath = url.searchParams.get('path')
        if (!filePath) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing path parameter' }))
          return
        }
        const content = readLocalFile(filePath)
        if (content === null) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'File not found' }))
          return
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ content, path: filePath, timestamp: new Date().toISOString() }))
      })

      // Serve agent AGENT.md files
      server.middlewares.use('/api/local/agent', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const slug = url.searchParams.get('slug')
        if (!slug) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing slug parameter' }))
          return
        }
        const folder = AGENT_FOLDERS[slug]
        if (!folder) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Unknown agent' }))
          return
        }
        const agentMd = readLocalFile(`projects/${folder}/AGENT.md`)
        const latestResult = readLocalFile(`projects/${folder}/latest-result.md`)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ slug, agentMd, latestResult, timestamp: new Date().toISOString() }))
      })

      // Relay inbox (for chat)
      server.middlewares.use('/api/local/relay-inbox', (req, res) => {
        const content = readLocalFile('context/relay-inbox.jsonl')
        const messages = []
        if (content) {
          for (const line of content.split('\n').filter(l => l.trim())) {
            try { messages.push(JSON.parse(line)) } catch {}
          }
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ messages, timestamp: new Date().toISOString() }))
      })

      // Relay send (dashboard -> EA inbox, so the hook picks it up)
      server.middlewares.use('/api/local/relay-send', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'POST only' }))
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            const id = crypto.randomUUID()
            const inboxPath = resolve(AOM_EA_ROOT, 'context/relay-inbox.jsonl')
            const entry = {
              id,
              timestamp: new Date().toISOString(),
              source: data.source || 'corner-dashboard',
              message: data.message,
              status: 'pending',
              chat_id: null,
              agent: data.agent || null,
            }
            fs.appendFileSync(inboxPath, JSON.stringify(entry) + '\n')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, id }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // Relay outbox read (EA responses, for dashboard polling)
      server.middlewares.use('/api/local/relay-outbox', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const since = url.searchParams.get('since')
        const outboxPath = resolve(AOM_EA_ROOT, 'context/relay-outbox.jsonl')
        const messages = []
        try {
          const content = fs.readFileSync(outboxPath, 'utf-8')
          for (const line of content.split('\n').filter(l => l.trim())) {
            try {
              const msg = JSON.parse(line)
              if (since && msg.timestamp && new Date(msg.timestamp) <= new Date(since)) continue
              messages.push(msg)
            } catch {}
          }
        } catch {}
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.end(JSON.stringify({ messages, timestamp: new Date().toISOString() }))
      })

      // Notifications endpoint
      server.middlewares.use('/api/local/notifications', (req, res) => {
        const content = readLocalFile('context/agent-notifications.md')
        const notifications = parseNotifications(content)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ notifications, timestamp: new Date().toISOString() }))
      })
    },
  }
}

// ---- WebSocket Server Plugin (C3) -------------------------------------------
// Runs a WebSocket server on port 3001 during development.
// Watches relay-outbox.jsonl for new messages and broadcasts to connected clients.
// Handles ping/pong heartbeat and multiplexed agent channels.
function webSocketServerPlugin() {
  let wss = null
  let outboxWatcher = null
  let lastOutboxSize = 0

  function broadcast(data) {
    if (!wss) return
    const msg = typeof data === 'string' ? data : JSON.stringify(data)
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(msg)
      }
    })
  }

  return {
    name: 'aom-websocket-server',
    configureServer() {
      // Start WebSocket server on port 3001
      try {
        wss = new WebSocketServer({ port: 3001 })
        console.log('[C3 WebSocket] Server running on ws://localhost:3001')

        wss.on('connection', (ws) => {
          console.log('[C3 WebSocket] Client connected')

          // Send welcome event
          ws.send(JSON.stringify({
            type: 'system_status',
            status: 'connected',
            message: 'Corner C3 WebSocket active',
            timestamp: new Date().toISOString(),
          }))

          ws.on('message', (raw) => {
            try {
              const data = JSON.parse(raw.toString())

              // Handle ping
              if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
                return
              }

              // Handle chat messages (forward to relay system)
              if (data.type === 'chat_message') {
                const outboxPath = resolve(AOM_EA_ROOT, 'context/relay-outbox.jsonl')
                const entry = {
                  agent: data.agent,
                  message: data.content,
                  source: 'corner-websocket',
                  timestamp: new Date().toISOString(),
                }
                fs.appendFileSync(outboxPath, JSON.stringify(entry) + '\n')

                // Broadcast agent state change: thinking
                broadcast({
                  type: 'agent_state_change',
                  agent: data.agent,
                  state: 'thinking',
                  timestamp: new Date().toISOString(),
                })
              }
            } catch {
              // ignore malformed messages
            }
          })

          ws.on('close', () => {
            console.log('[C3 WebSocket] Client disconnected')
          })
        })

        wss.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log('[C3 WebSocket] Port 3001 in use, skipping WebSocket server')
            wss = null
          }
        })

        // Watch relay-outbox.jsonl for new messages
        const outboxPath = resolve(AOM_EA_ROOT, 'context/relay-outbox.jsonl')
        try {
          if (fs.existsSync(outboxPath)) {
            lastOutboxSize = fs.statSync(outboxPath).size
          }
        } catch {}

        outboxWatcher = watch(outboxPath, { persistent: true, ignoreInitial: true })
        outboxWatcher.on('change', () => {
          try {
            const content = fs.readFileSync(outboxPath, 'utf-8')
            const currentSize = Buffer.byteLength(content, 'utf-8')
            if (currentSize > lastOutboxSize) {
              // New content added, parse the new lines
              const newContent = content.slice(lastOutboxSize)
              const newLines = newContent.split('\n').filter(l => l.trim())
              for (const line of newLines) {
                try {
                  const data = JSON.parse(line)
                  // Broadcast as a token_stream or system event
                  if (data.message || data.text) {
                    broadcast({
                      type: 'token_stream',
                      agent: data.agent || 'system',
                      token: data.message || data.text,
                      timestamp: data.timestamp || new Date().toISOString(),
                    })
                  }
                } catch {}
              }
            }
            lastOutboxSize = currentSize
          } catch {}
        })

        // Also watch agent-notifications.md for events
        const notifPath = resolve(AOM_EA_ROOT, 'context/agent-notifications.md')
        const notifWatcher = watch(notifPath, { persistent: true, ignoreInitial: true })
        let lastNotifSize = 0
        try { if (fs.existsSync(notifPath)) lastNotifSize = fs.statSync(notifPath).size } catch {}

        notifWatcher.on('change', () => {
          try {
            const content = fs.readFileSync(notifPath, 'utf-8')
            const currentSize = Buffer.byteLength(content, 'utf-8')
            if (currentSize > lastNotifSize) {
              const newContent = content.slice(lastNotifSize)
              const newLines = newContent.split('\n').filter(l => l.trim().startsWith('['))
              for (const line of newLines) {
                const match = line.match(/^\[([^\]]+)\]\s*(.*)$/)
                if (match) {
                  // Detect event type from content
                  const text = match[2].toLowerCase()
                  let eventType = 'system_status'
                  if (text.includes('complete') || text.includes('shipped') || text.includes('done')) eventType = 'task_complete'
                  else if (text.includes('handoff') || text.includes('handed off')) eventType = 'handoff'
                  else if (text.includes('error') || text.includes('crash') || text.includes('failed')) eventType = 'error_recovery'

                  broadcast({
                    type: eventType,
                    message: match[2],
                    time: match[1],
                    timestamp: new Date().toISOString(),
                  })
                }
              }
            }
            lastNotifSize = currentSize
          } catch {}
        })

      } catch (err) {
        console.log('[C3 WebSocket] Failed to start:', err.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), localDashboardPlugin(), webSocketServerPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'outreach-plan': resolve(__dirname, 'outreach-plan.html'),
        'growth-plan': resolve(__dirname, 'growth-plan.html'),
        'system': resolve(__dirname, 'system.html'),
        'v2': resolve(__dirname, 'v2.html'),
        'proposals-isa': resolve(__dirname, 'proposals-isa.html'),
        'proposals-quentin': resolve(__dirname, 'proposals-quentin.html'),
      },
    },
  },
})
