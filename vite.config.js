import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import os from 'os'
import { execFile, spawn } from 'child_process'
import { WebSocketServer } from 'ws'
import { watch } from 'chokidar'

// AOM-EA local filesystem root for localhost dashboard mode
const AOM_EA_ROOT = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA'

// Relay files: prefer Application Support path (where launchd relay + relay-respond.py write)
// Falls back to repo path if App Support doesn't exist.
// This matches the same logic in relay-hook.sh and relay-respond.py.
const APPDATA_ROOT = resolve(os.homedir(), 'Library/Application Support/aom-ea/data')
const APPDATA_INBOX = resolve(APPDATA_ROOT, 'context/relay-inbox.jsonl')
const APPDATA_OUTBOX = resolve(APPDATA_ROOT, 'context/relay-outbox.jsonl')

const RELAY_INBOX_PATH = fs.existsSync(APPDATA_INBOX) ? APPDATA_INBOX : resolve(AOM_EA_ROOT, 'context/relay-inbox.jsonl')
const RELAY_OUTBOX_PATH = fs.existsSync(APPDATA_OUTBOX) ? APPDATA_OUTBOX : resolve(AOM_EA_ROOT, 'context/relay-outbox.jsonl')

// Also keep repo paths for fallback writes (write to BOTH so hooks pick up from either)
const REPO_INBOX_PATH = resolve(AOM_EA_ROOT, 'context/relay-inbox.jsonl')
const REPO_OUTBOX_PATH = resolve(AOM_EA_ROOT, 'context/relay-outbox.jsonl')

// ---- RELAY BULLETPROOFING ----

// Write lock: prevents concurrent writes from corrupting JSONL files
const LOCK_TIMEOUT = 3000 // 3s max wait
function withFileLock(filePath, fn) {
  const lockPath = filePath + '.lock'
  const start = Date.now()
  while (fs.existsSync(lockPath)) {
    if (Date.now() - start > LOCK_TIMEOUT) {
      // Stale lock, force remove
      try { fs.unlinkSync(lockPath) } catch {}
      break
    }
    // Spin wait 10ms
    const end = Date.now() + 10
    while (Date.now() < end) {}
  }
  try {
    fs.writeFileSync(lockPath, String(process.pid))
    return fn()
  } finally {
    try { fs.unlinkSync(lockPath) } catch {}
  }
}

// Message TTL: prune messages older than 24h from a JSONL file
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000
function pruneOldMessages(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    const cutoff = new Date(Date.now() - MESSAGE_TTL_MS).toISOString()
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim())
    // Only prune if file has 200+ lines (don't thrash small files)
    if (lines.length < 200) return
    const kept = lines.filter(line => {
      try {
        const msg = JSON.parse(line)
        // Keep pending/unread messages regardless of age
        if (msg.status === 'pending' || msg.status === 'deferred') return true
        return msg.timestamp && msg.timestamp >= cutoff
      } catch { return true }
    })
    if (kept.length < lines.length) {
      fs.writeFileSync(filePath, kept.join('\n') + '\n')
    }
  } catch {}
}

// Outbox file size tracking for optimistic reads
let lastOutboxSizes = new Map()

// Agent folder mapping (slug -> project folder name)
const AGENT_FOLDERS = {
  bobby: 'bobby', colton: 'colton', steffen: 'steffen', jacob: 'jacob',
  elon: 'sys', alex: 'aom-strategy', steve: 'steve', cleo: 'content-agent',
  tony: 'tony', paige: 'paige', pixel: 'pixel', mom: 'mom',
  patrik: 'corner', elmo: 'corner',
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


function parseClientProjects(md) {
  if (!md) return []
  const clients = []
  const lines = md.split('\n')
  let inActive = false
  let inProposals = false

  for (const line of lines) {
    if (line.includes('Active Clients / Projects')) { inActive = true; inProposals = false; continue }
    if (line.includes('Proposals Out / Promising')) { inActive = false; inProposals = true; continue }
    if (line.includes('Dead / Didn')) { inActive = false; inProposals = false; continue }
    if (line.startsWith('## ') && !line.includes('Active') && !line.includes('Proposals')) { inActive = false; inProposals = false; continue }

    if ((inActive || inProposals) && line.startsWith('- **')) {
      const nameMatch = line.match(/^- \*\*([^*]+)\*\*/)
      if (!nameMatch) continue
      const name = nameMatch[1].trim()

      // Extract value/revenue info
      let value = ''
      const valueMatch = line.match(/\$(\d[\d,k/month]+[^.]*)/i)
      if (valueMatch) value = '$' + valueMatch[1].trim()

      // Determine status
      let status = 'ACTIVE'
      const upper = line.toUpperCase()
      if (upper.includes('RED')) status = 'RED'
      else if (upper.includes('GREEN')) status = 'GREEN'
      else if (upper.includes('ORANGE')) status = 'ORANGE'
      else if (upper.includes('ON HOLD')) status = 'ON_HOLD'
      else if (upper.includes('WRAPPED')) status = 'DONE'
      else if (upper.includes('PROMISING') || inProposals) status = 'PROPOSAL'

      // Extract blocker if present
      let blocker = ''
      const blockerMatch = line.match(/(?:Blocker|blocking|needs|waiting)[:\s]*([^.]+)/i)
      if (blockerMatch) blocker = blockerMatch[1].trim()

      clients.push({ name, value, status, blocker, type: inActive ? 'active' : 'proposal' })
    }
  }
  return clients
}

function parseLatestResults() {
  const results = {}
  for (const agent of AGENTS_LIST) {
    const folder = AGENT_FOLDERS[agent.slug]
    if (!folder) continue
    const resultMd = readLocalFile(`projects/${folder}/latest-result.md`)
    if (!resultMd) continue
    // Get first meaningful line (skip frontmatter, headers, blank lines)
    const lines = resultMd.split('\n')
    let summary = ''
    let inFrontmatter = false
    for (const line of lines) {
      if (line.trim() === '---') { inFrontmatter = !inFrontmatter; continue }
      if (inFrontmatter) continue
      if (line.startsWith('#')) continue
      if (!line.trim()) continue
      summary = line.trim()
      if (summary.length > 150) summary = summary.slice(0, 147) + '...'
      break
    }
    if (summary) results[agent.slug] = summary
  }
  return results
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

        // Parse client projects from work.md
        const workRaw = readLocalFile('context/work.md')
        const clientProjects = parseClientProjects(workRaw)

        // Parse latest results from agent folders
        const latestResults = parseLatestResults()

        // Enrich agents with latest results
        for (const agent of agents) {
          if (latestResults[agent.slug]) {
            agent.latestResult = latestResults[agent.slug]
          }
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          agents, throughput, blockers: blockers.slice(0, 10), pipelineFeed,
          clientProjects, latestResults,
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
      // Reads from BOTH App Support and repo inbox, merges and deduplicates by id.
      // App Support is where Telegram/watchdog writes; repo is where dashboard writes.
      server.middlewares.use('/api/local/relay-inbox', (req, res) => {
        const messagesById = new Map()
        // Read from both paths to capture all sources
        for (const inboxPath of [RELAY_INBOX_PATH, REPO_INBOX_PATH]) {
          try {
            const content = fs.readFileSync(inboxPath, 'utf-8')
            for (const line of content.split('\n').filter(l => l.trim())) {
              try {
                const msg = JSON.parse(line)
                if (msg.id && !messagesById.has(msg.id)) {
                  messagesById.set(msg.id, msg)
                }
              } catch {}
            }
          } catch {}
        }
        const messages = Array.from(messagesById.values())
        messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ messages, timestamp: new Date().toISOString() }))
      })

      // Relay send (dashboard -> EA inbox, so the hook picks it up)
      // Writes to BOTH App Support and repo inbox paths.
      // The EA hook checks App Support first, so we must write there.
      // Repo path is also written for backward compatibility.
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
            const source = data.source || 'corner-dashboard'
            const entry = {
              id,
              timestamp: new Date().toISOString(),
              source,
              message: data.message,
              // Corner-dashboard messages are already displayed in the UI,
              // so mark as 'read' to prevent them piling up as 'pending'.
              // Only Telegram messages (which need async processing) should be 'pending'.
              status: source === 'corner-dashboard' ? 'read' : 'pending',
              chat_id: null,
              agent: data.agent || null,
            }
            const line = JSON.stringify(entry) + '\n'
            // Write with lock to prevent concurrent corruption
            withFileLock(RELAY_INBOX_PATH, () => {
              fs.appendFileSync(RELAY_INBOX_PATH, line)
              if (RELAY_INBOX_PATH !== REPO_INBOX_PATH) {
                fs.appendFileSync(REPO_INBOX_PATH, line)
              }
            })
            // Prune old messages periodically (every ~50 writes)
            if (Math.random() < 0.02) {
              pruneOldMessages(RELAY_INBOX_PATH)
              if (RELAY_INBOX_PATH !== REPO_INBOX_PATH) pruneOldMessages(REPO_INBOX_PATH)
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, id }))

            // Write to conversation log files (file-backed chat history)
            if (source === 'corner-dashboard' && data.message) {
              const agentName = data.agent || 'elon'
              const convEntry = {
                id,
                timestamp: new Date().toISOString(),
                role: 'user',
                agent: agentName,
                source: 'dashboard',
                text: data.message,
              }
              const convLine = JSON.stringify(convEntry) + '\n'
              // Write to main log + agent/project-specific log
              const convDir = resolve(AOM_EA_ROOT, 'conversations')
              const isProjectMsg = agentName === 'aom' || agentName.includes('-')
              const convSubDir = isProjectMsg ? resolve(convDir, 'projects') : resolve(convDir, 'agents')
              const convFileName = agentName === 'aom' ? 'aom-internal' : agentName
              try {
                fs.mkdirSync(convSubDir, { recursive: true })
                fs.appendFileSync(resolve(convDir, 'main.jsonl'), convLine)
                fs.appendFileSync(resolve(convSubDir, `${convFileName}.jsonl`), convLine)
              } catch (err) {
                console.log(`[Relay] Conv log write failed: ${err.message}`)
              }
            }

            // Auto-respond: spawn claude -p as fallback when no terminal is active
            // If a terminal session exists, the relay hook handles it (better context).
            // Auto-responder only fires after a delay, giving the terminal time to pick it up.
            if (source === 'corner-dashboard' && data.message) {
              // Wait 5s. If terminal responds in that time, skip auto-responder.
              const msgId = id
              setTimeout(() => {
                // Check if a response already appeared in the conversation file
                const convFile = resolve(AOM_EA_ROOT, 'conversations', 'agents', `${agentName}.jsonl`)
                try {
                  if (fs.existsSync(convFile)) {
                    const lines = fs.readFileSync(convFile, 'utf-8').split('\n').filter(l => l.trim())
                    const last = lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null
                    if (last && last.role === 'assistant' && last.reply_to === msgId) {
                      return // Terminal already responded, skip auto-responder
                    }
                    // Also check if any assistant message arrived after our user message
                    const lastAssistant = [...lines].reverse().find(l => {
                      try { return JSON.parse(l).role === 'assistant' } catch { return false }
                    })
                    if (lastAssistant) {
                      const assistantTs = JSON.parse(lastAssistant).timestamp || ''
                      if (assistantTs > entry.timestamp) return // Terminal responded
                    }
                  }
                } catch {}
                // No terminal response after 5s. Auto-respond.
              const agentFolder = AGENT_FOLDERS[agentName]
              const agentMd = agentFolder ? resolve(AOM_EA_ROOT, `projects/${agentFolder}/AGENT.md`) : null
              const lastConvo = agentFolder ? resolve(AOM_EA_ROOT, `projects/${agentFolder}/last-conversation.md`) : null

              let agentContext = ''
              try { if (agentMd && fs.existsSync(agentMd)) agentContext += '\n\n' + fs.readFileSync(agentMd, 'utf-8').slice(0, 2000) } catch {}
              try { if (lastConvo && fs.existsSync(lastConvo)) agentContext += '\n\n' + fs.readFileSync(lastConvo, 'utf-8').slice(0, 1500) } catch {}

              const prompt = `You are ${agentName}. Patrik sent: "${data.message}"\n\nRespond as ${agentName}. Prefix with [${agentName.toUpperCase()}]. Be concise. No em dashes.${agentContext}`

              const claudeCli = ['/opt/homebrew/bin/claude', '/usr/local/bin/claude']
                .find(p => { try { return fs.existsSync(p) } catch { return false } })

              if (claudeCli) {
                const child = spawn(claudeCli, ['-p', '--model', 'haiku', '--no-session-persistence'], {
                  cwd: AOM_EA_ROOT, timeout: 45000, shell: true,
                  env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'],
                })
                let stdout = ''
                child.stdout.on('data', c => { stdout += c.toString() })
                child.on('close', (code) => {
                  const response = stdout.trim()
                  if (!response) return

                  // Detect agent from [AGENT] prefix
                  const prefixMatch = response.match(/^\[([A-Z]+)\]/)
                  const respAgent = prefixMatch ? prefixMatch[1].toLowerCase() : agentName
                  const cleanText = response.replace(/^\[[A-Z]+\]\s*/, '').trim()

                  // Write response to conversation file (correct agent)
                  const respEntry = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    role: 'assistant',
                    agent: respAgent,
                    source: 'dashboard-auto',
                    text: cleanText,
                    reply_to: id,
                  }
                  const respLine = JSON.stringify(respEntry) + '\n'
                  const respConvDir = resolve(AOM_EA_ROOT, 'conversations')
                  try {
                    fs.appendFileSync(resolve(respConvDir, 'agents', `${respAgent}.jsonl`), respLine)
                    fs.appendFileSync(resolve(respConvDir, 'main.jsonl'), respLine)
                  } catch {}
                })
                child.on('error', () => {})
                child.stdin.write(prompt)
                child.stdin.end()
              }
              }, 5000) // 5s delay before auto-responding
            }
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // Relay outbox read (EA responses, for dashboard polling)
      // Reads from BOTH App Support and repo outbox, merges and deduplicates by id.
      // App Support is where relay-respond.py writes agent responses.
      server.middlewares.use('/api/local/relay-outbox', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const since = url.searchParams.get('since')
        const replyTo = url.searchParams.get('reply_to') // Correlation ID filter
        const messagesById = new Map()
        // Optimistic read: only parse new bytes if file grew
        for (const outboxPath of [RELAY_OUTBOX_PATH, REPO_OUTBOX_PATH]) {
          try {
            const stat = fs.statSync(outboxPath)
            const lastSize = lastOutboxSizes.get(outboxPath) || 0
            let content
            if (since && lastSize > 0 && stat.size > lastSize) {
              // Only read new bytes (optimistic)
              const fd = fs.openSync(outboxPath, 'r')
              const buf = Buffer.alloc(stat.size - lastSize)
              fs.readSync(fd, buf, 0, buf.length, lastSize)
              fs.closeSync(fd)
              content = buf.toString('utf-8')
            } else {
              content = fs.readFileSync(outboxPath, 'utf-8')
            }
            lastOutboxSizes.set(outboxPath, stat.size)
            for (const line of content.split('\n').filter(l => l.trim())) {
              try {
                const msg = JSON.parse(line)
                if (since && msg.timestamp && new Date(msg.timestamp) <= new Date(since)) continue
                // Correlation filter: only return messages that match reply_to
                if (replyTo && msg.reply_to !== replyTo) continue
                if (msg.id && !messagesById.has(msg.id)) {
                  messagesById.set(msg.id, msg)
                }
              } catch {}
            }
          } catch {}
        }
        const messages = Array.from(messagesById.values())
        messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.end(JSON.stringify({ messages, timestamp: new Date().toISOString() }))
      })

      // Conversation history: load per-agent or per-project chat history
      server.middlewares.use('/api/local/conversations', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const target = url.searchParams.get('target') // agent slug or project name
        const type = url.searchParams.get('type') || 'agent' // 'agent' or 'project'
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const convDir = resolve(AOM_EA_ROOT, 'conversations')
        const filePath = type === 'project'
          ? resolve(convDir, 'projects', `${target}.jsonl`)
          : resolve(convDir, 'agents', `${target}.jsonl`)
        const messages = []
        try {
          if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim())
            // Take last N messages
            const recent = lines.slice(-limit)
            for (const line of recent) {
              try { messages.push(JSON.parse(line)) } catch {}
            }
          }
        } catch {}
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.end(JSON.stringify({ messages, target, type }))
      })

      // Conversation-driven project ranking: parse session-log + relay for project mentions
      // Projects ranked by what you TALK ABOUT, not task count.
      server.middlewares.use('/api/local/project-recency', (req, res) => {
        const sessionLog = readLocalFile('context/session-log.md') || ''
        const relayInbox = readLocalFile('context/relay-inbox.jsonl') || ''

        // Project keywords to detect in conversation text
        const PROJECT_KEYWORDS = {
          'corner':     ['corner', 'dashboard', 'product', 'game ui', 'hud', 'isometric', 'rpg menu'],
          'ambition':   ['ambition', 'ambition mechanical', 'ambitionac'],
          'outreach':   ['outreach', 'cold email', 'jacob', 'cpa', 'prospect'],
          'aom-site':   ['aom site', '/v2', 'aheadofmarket', 'website redesign'],
          'aom-phase2': ['phase 2', 'phase two'],
          'gtm':        ['advisory', 'ai audit', 'go to market', 'steve'],
          'cleo':       ['cleo', 'video edit', 'crown', 'content agent', 'footage'],
          'content':    ['content', 'filming', 'edit'],
          'kohrs':      ['kohrs', 'leigh', 'demolition'],
          'isa':        ['isa', 'isa energy', 'brand video'],
          'skylar':     ['skylar', 'music video'],
          'infra':      ['infrastructure', 'elon', 'relay', 'bfg', 'system'],
          'today':      ['today', 'asap', 'urgent', 'right now'],
        }

        // Weight: more recent lines count more
        const scores = {}
        for (const key of Object.keys(PROJECT_KEYWORDS)) scores[key] = 0

        // Parse session log lines (most recent = highest weight)
        const logLines = sessionLog.split('\n').filter(l => l.trim().startsWith('['))
        const totalLogLines = logLines.length
        logLines.forEach((line, idx) => {
          const weight = 1 + (idx / Math.max(totalLogLines, 1)) * 4 // 1-5 scale, later = heavier
          const lower = line.toLowerCase()
          for (const [project, keywords] of Object.entries(PROJECT_KEYWORDS)) {
            for (const kw of keywords) {
              if (lower.includes(kw)) {
                scores[project] += weight
                break // one match per project per line
              }
            }
          }
        })

        // Parse relay inbox (last 50 messages, recent = heavier)
        const relayLines = relayInbox.split('\n').filter(l => l.trim()).slice(-50)
        const totalRelayLines = relayLines.length
        relayLines.forEach((line, idx) => {
          try {
            const msg = JSON.parse(line)
            const text = (msg.message || '').toLowerCase()
            const weight = 2 + (idx / Math.max(totalRelayLines, 1)) * 6 // relay weighs more (2-8)
            for (const [project, keywords] of Object.entries(PROJECT_KEYWORDS)) {
              for (const kw of keywords) {
                if (text.includes(kw)) {
                  scores[project] += weight
                  break
                }
              }
            }
          } catch {}
        })

        // Normalize: highest score = 100
        const maxScore = Math.max(...Object.values(scores), 1)
        const normalized = {}
        for (const [key, score] of Object.entries(scores)) {
          normalized[key] = Math.round((score / maxScore) * 100)
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ scores: normalized, raw: scores, timestamp: new Date().toISOString() }))
      })

      // Toggle a checkbox in punch-list.md (for HUD checkbox persistence)
      server.middlewares.use('/api/local/punch-toggle', (req, res) => {
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
            const { lineText, markDone } = data
            if (!lineText) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing lineText' }))
              return
            }

            const filePath = resolve(AOM_EA_ROOT, 'punch-list.md')
            const content = fs.readFileSync(filePath, 'utf-8')
            const lines = content.split('\n')
            let found = false

            for (let i = 0; i < lines.length; i++) {
              const trimmed = lines[i].trim()
              // Match the raw line text from the punch list
              if (trimmed === lineText || trimmed === lineText.trim()) {
                if (markDone) {
                  lines[i] = lines[i].replace('- [ ]', '- [x]')
                } else {
                  lines[i] = lines[i].replace('- [x]', '- [ ]').replace('- [X]', '- [ ]')
                }
                found = true
                break
              }
            }

            if (!found) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Line not found in punch-list.md' }))
              return
            }

            fs.writeFileSync(filePath, lines.join('\n'))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, markDone, timestamp: new Date().toISOString() }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // Notifications endpoint
      server.middlewares.use('/api/local/notifications', (req, res) => {
        const content = readLocalFile('context/agent-notifications.md')
        const notifications = parseNotifications(content)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ notifications, timestamp: new Date().toISOString() }))
      })

      // ---- SYSTEM QUEUE ENDPOINT (real-time system state for Checklist) --------
      // Parses: launch-queue.md, active-missions.md, agent-notifications.md,
      //         and projects/[agent]/latest-result.md
      server.middlewares.use('/api/local/system-queue', (req, res) => {
        // 1. Parse launch-queue.md for team tables
        const launchQueueRaw = readLocalFile('context/launch-queue.md') || ''
        const activeMissionsRaw = readLocalFile('context/active-missions.md') || ''
        const notificationsRaw = readLocalFile('context/agent-notifications.md') || ''

        // --- RUNNING NOW: merge active-missions "Running" + launch-queue tables ---
        const runningNow = []

        // From active-missions Running table
        const runningRows = parseTable(activeMissionsRaw, '## Running')
        for (const cols of runningRows) {
          if (cols[0] === '(none' || cols[0].includes('none')) continue
          const agentName = cols[0].replace(/\s*\d+$/, '').trim() // strip trailing numbers like "Bobby 2"
          const agentSlug = AGENTS_LIST.find(a =>
            a.name.toLowerCase() === agentName.toLowerCase() ||
            cols[0].toLowerCase().startsWith(a.name.toLowerCase())
          )?.slug || agentName.toLowerCase()
          runningNow.push({
            agent: cols[0].trim(),
            agentSlug,
            mission: cols[1] || '',
            launched: cols[2] || '',
            status: (cols[3] || 'Running').toUpperCase(),
          })
        }

        // From launch-queue tables (WD-40 Product Team + Content Team)
        const lqLines = launchQueueRaw.split('\n')
        let inTable = false
        let headerCols = null
        for (const line of lqLines) {
          if (line.startsWith('|') && !line.match(/^\|\s*-/)) {
            const cols = line.split('|').map(s => s.trim()).filter(Boolean)
            if (cols[0] === 'Agent') { headerCols = cols; inTable = true; continue }
            if (!inTable || !headerCols) continue
            if (cols.length < 2) continue
            const agentRaw = cols[0].trim()
            if (agentRaw === '(none' || agentRaw.includes('none')) continue
            const agentName = agentRaw.replace(/\s*\d+$/, '').trim()
            const agentSlug = AGENTS_LIST.find(a =>
              a.name.toLowerCase() === agentName.toLowerCase() ||
              agentRaw.toLowerCase().startsWith(a.name.toLowerCase())
            )?.slug || agentName.toLowerCase()
            const currentCol = cols[1] || ''
            const nextCol = cols[2] || ''

            // Derive status from "Current" column
            let phase = 'IDLE'
            const cur = currentCol.toUpperCase()
            if (cur.includes('DONE')) phase = 'DONE'
            else if (cur.includes('BUILDING') || cur.includes('SHIPPING') || cur.includes('ACTIVE')) phase = 'BUILDING'
            else if (cur.includes('RESEARCH') || cur.includes('SCANNING')) phase = 'RESEARCHING'
            else if (cur.includes('TESTING') || cur.includes('QA') || cur.includes('PLAYWRIGHT')) phase = 'TESTING'
            else if (cur.includes('SPEC') || cur.includes('DESIGN')) phase = 'DESIGNING'
            else if (cur.includes('COACH') || cur.includes('REVIEW')) phase = 'COACHING'
            else if (currentCol.trim()) phase = 'WORKING'

            // Only add if not already in runningNow from active-missions
            const alreadyListed = runningNow.some(r =>
              r.agentSlug === agentSlug && r.agent.toLowerCase() === agentRaw.toLowerCase()
            )
            if (!alreadyListed) {
              // Extract a short mission summary from "Current" column
              let missionSummary = currentCol
                .replace(/^DONE[:\s]*/i, '')
                .replace(/\.\s*$/, '')
              // Truncate if too long
              if (missionSummary.length > 120) missionSummary = missionSummary.slice(0, 117) + '...'

              runningNow.push({
                agent: agentRaw,
                agentSlug,
                mission: missionSummary,
                nextWhenDone: nextCol,
                status: phase,
              })
            }
          } else if (!line.startsWith('|')) {
            // Reset table state on non-table lines (new section)
            if (inTable && line.trim() && !line.startsWith('#')) {
              // Still in section text, keep going
            }
            if (line.startsWith('#')) {
              inTable = false
              headerCols = null
            }
          }
        }

        // 2. JUST COMPLETED: parse agent-notifications.md for TASK FINISHED entries (last 10)
        const justCompleted = []
        const notifLines = notificationsRaw.split('\n').filter(l => l.trim().startsWith('['))
        // Reverse to get most recent first
        const recentNotifs = notifLines.slice(-30).reverse()
        for (const line of recentNotifs) {
          if (justCompleted.length >= 10) break
          const match = line.match(/^\[([^\]]+)\]\s*(.*)$/)
          if (!match) continue
          const timestamp = match[1]
          const body = match[2]
          if (!body.toUpperCase().includes('TASK FINISHED') && !body.toUpperCase().includes('MILESTONE')) continue

          // Extract agent name after "TASK FINISHED:"
          const agentMatch = body.match(/TASK FINISHED:\s*(\w+(?:\s*\d)?)\s*[-]?\s*(.*)/i)
            || body.match(/MILESTONE:\s*(\w+(?:\s*\d)?)\s*[-]?\s*(.*)/i)
          if (!agentMatch) continue
          const agentRaw = agentMatch[1].trim()
          const agentName = agentRaw.replace(/\s*\d+$/, '').trim()
          const agentSlug = AGENTS_LIST.find(a =>
            a.name.toLowerCase() === agentName.toLowerCase() ||
            agentRaw.toLowerCase().startsWith(a.name.toLowerCase())
          )?.slug || agentName.toLowerCase()

          let summary = agentMatch[2].trim()
          // Truncate at first period or 100 chars
          const dotIdx = summary.indexOf('.')
          if (dotIdx > 0 && dotIdx < 120) summary = summary.slice(0, dotIdx + 1)
          else if (summary.length > 120) summary = summary.slice(0, 117) + '...'

          justCompleted.push({
            agent: agentRaw,
            agentSlug,
            summary,
            timestamp,
            type: body.toUpperCase().includes('MILESTONE') ? 'MILESTONE' : 'DONE',
          })
        }

        // 3. UP NEXT: parse launch-queue "Next When Done" column
        const upNext = []
        // Re-parse the launch queue tables specifically for "Next When Done"
        let inLQTable = false
        let lqHeaderCols = null
        for (const line of lqLines) {
          if (line.startsWith('|') && !line.match(/^\|\s*-/)) {
            const cols = line.split('|').map(s => s.trim()).filter(Boolean)
            if (cols[0] === 'Agent') { lqHeaderCols = cols; inLQTable = true; continue }
            if (!inLQTable || !lqHeaderCols) continue
            if (cols.length < 3) continue
            const agentRaw = cols[0].trim()
            if (agentRaw === '(none' || agentRaw.includes('none')) continue
            const agentName = agentRaw.replace(/\s*\d+$/, '').trim()
            const agentSlug = AGENTS_LIST.find(a =>
              a.name.toLowerCase() === agentName.toLowerCase() ||
              agentRaw.toLowerCase().startsWith(a.name.toLowerCase())
            )?.slug || agentName.toLowerCase()
            const nextWhenDone = cols[2] || ''
            if (!nextWhenDone.trim()) continue

            // Extract the first actionable item from "Next When Done"
            let nextTask = nextWhenDone
              .replace(/Never stops\.\s*/i, '')
              .replace(/Then:?\s*/i, '|')
              .split('|')[0]
              .trim()
            if (nextTask.length > 100) nextTask = nextTask.slice(0, 97) + '...'
            if (nextTask) {
              upNext.push({
                agent: agentRaw,
                agentSlug,
                task: nextTask,
              })
            }
          } else if (line.startsWith('#')) {
            inLQTable = false
            lqHeaderCols = null
          }
        }

        // 4. Grab latest-result summaries for each agent
        const latestResults = {}
        for (const agent of AGENTS_LIST) {
          const folder = AGENT_FOLDERS[agent.slug]
          if (!folder) continue
          const result = readLocalFile(`projects/${folder}/latest-result.md`)
          if (result) {
            // Extract first line of content (skip frontmatter/header)
            const lines = result.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'))
            const firstLine = lines[0] || ''
            latestResults[agent.slug] = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine
          }
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          runningNow,
          justCompleted,
          upNext,
          latestResults,
          timestamp: new Date().toISOString(),
          source: 'local',
        }))
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

              // Handle chat messages (forward to relay inbox so EA hook picks them up)
              if (data.type === 'chat_message') {
                const entry = {
                  id: crypto.randomUUID(),
                  agent: data.agent,
                  message: data.content,
                  source: 'corner-websocket',
                  status: 'pending',
                  chat_id: null,
                  timestamp: new Date().toISOString(),
                }
                const line = JSON.stringify(entry) + '\n'
                // Write to both paths so the hook picks it up
                fs.appendFileSync(RELAY_INBOX_PATH, line)
                if (RELAY_INBOX_PATH !== REPO_INBOX_PATH) {
                  fs.appendFileSync(REPO_INBOX_PATH, line)
                }

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

        // Watch relay-outbox.jsonl for new messages (use the resolved path)
        const outboxPath = RELAY_OUTBOX_PATH
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
