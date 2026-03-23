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

// Auto-responder queue: prevents race condition where rapid messages spawn multiple claude -p processes.
// Only one auto-responder runs at a time. New messages queue up and the latest one wins.
let autoResponderRunning = false
let autoResponderTimer = null
let autoResponderPending = null // holds the latest message data to auto-respond to
const AUTO_RESPOND_DELAY_MS = 12000 // 12s (was 5s, increased to avoid terminal response overlap)

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

      // Conversation JSONL endpoint -- unified source of truth for all messages
      // Reads from conversations/agents/{slug}.jsonl which contains BOTH user + assistant messages
      // from ALL sources (terminal, dashboard, telegram, auto-responder).
      // ?all=true: aggregate from ALL agent JSONL files (for AOM Team Room)
      server.middlewares.use('/api/local/conversations', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const slug = url.searchParams.get('agent')
        const since = url.searchParams.get('since')
        const limit = parseInt(url.searchParams.get('limit') || '100', 10)
        const all = url.searchParams.get('all') === 'true' || url.searchParams.get('all') === '1'

        // ?all=true -- AOM Team Room: aggregate messages from ALL agent JSONL files
        if (all) {
          // Static agent -> project_path mapping (local dev doesn't have Supabase project_path column)
          const AGENT_PROJECT_PATH = {
            bobby: 'AOM -> Corner', colton: 'AOM -> Corner',
            elon: 'AOM -> Corner', steffen: 'AOM -> Corner',
            steve: 'AOM -> AI Advisory', alex: 'AOM -> AI Advisory',
            cleo: 'AOM -> KOHRS', tony: 'AOM -> KOHRS',
            jacob: 'AOM -> Outreach',
            mom: 'AOM -> Corner', elmo: 'AOM -> Corner', pixel: 'AOM -> Corner',
            paige: 'AOM -> Ambition',
          }
          const agentsDir = resolve(AOM_EA_ROOT, 'conversations', 'agents')
          const allMessages = []
          try {
            const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.jsonl'))
            for (const file of agentFiles) {
              const agentSlug = file.replace('.jsonl', '')
              try {
                const lines = fs.readFileSync(resolve(agentsDir, file), 'utf-8').split('\n').filter(l => l.trim())
                for (const line of lines) {
                  try {
                    const msg = JSON.parse(line)
                    if (since && msg.timestamp && msg.timestamp <= since) continue
                    // Ensure agent field is set; add project_path from static map
                    allMessages.push({
                      ...msg,
                      agent: msg.agent || agentSlug,
                      project_path: msg.project_path || AGENT_PROJECT_PATH[agentSlug] || null,
                    })
                  } catch {}
                }
              } catch {}
            }
          } catch {}
          // Sort by timestamp ascending, take latest N
          allMessages.sort((a, b) => {
            const ta = a.timestamp || ''
            const tb = b.timestamp || ''
            return ta < tb ? -1 : ta > tb ? 1 : 0
          })
          const messages = allMessages.slice(-limit)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ messages, agent: 'aom', timestamp: new Date().toISOString() }))
          return
        }

        if (!slug) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing agent parameter' }))
          return
        }

        const convFile = resolve(AOM_EA_ROOT, 'conversations', 'agents', `${slug}.jsonl`)
        const messages = []
        try {
          if (fs.existsSync(convFile)) {
            const lines = fs.readFileSync(convFile, 'utf-8').split('\n').filter(l => l.trim())
            // Read from the end for efficiency (most recent messages)
            const startIdx = Math.max(0, lines.length - limit)
            for (let i = startIdx; i < lines.length; i++) {
              try {
                const msg = JSON.parse(lines[i])
                if (since && msg.timestamp && msg.timestamp <= since) continue
                messages.push(msg)
              } catch {}
            }
          }
        } catch {}

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ messages, agent: slug, timestamp: new Date().toISOString() }))
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
        let responded = false
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          if (responded) return
          responded = true
          try {
            const data = JSON.parse(body)
            const id = crypto.randomUUID()
            const source = data.source || 'corner-dashboard'
            const entry = {
              id,
              timestamp: new Date().toISOString(),
              source,
              message: data.message,
              // Dashboard messages need 'pending' so the terminal relay hook picks them up.
              // The auto-responder (12s delay) checks if terminal already responded before firing,
              // so there's no double-processing risk when terminal is active.
              status: 'pending',
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
              // @ routing: parse @target from message to route to correct conversation
              // @bobby -> agent conversation, @ambition -> project conversation
              let agentName = data.agent || 'elon'
              const VALID_AGENTS = new Set(['elon','bobby','steffen','steve','alex','jacob','cleo','tony','paige','colton','elmo','mom'])
              const PROJECT_SLUGS = {
                'ambition': 'ambition-mechanical', 'isa': 'isa-energy', 'skylar': 'skylar',
                'brandon': 'brandon-wiley', 'kohrs': 'kohrs', 'nabi': 'nabi',
                'corner': 'corner', 'outreach': 'outreach', 'advisory': 'ai-advisory',
                'ih': 'included-health',
              }
              let projectTarget = data.project || null
              let isAll = false
              const atMatch = data.message.trim().match(/^@(\w+)\b/)
              if (atMatch) {
                const target = atMatch[1].toLowerCase()
                if (target === 'all') {
                  isAll = true
                } else if (VALID_AGENTS.has(target)) {
                  agentName = target
                } else if (PROJECT_SLUGS[target]) {
                  projectTarget = PROJECT_SLUGS[target]
                }
              }

              // Load project teams for @project routing
              let projectTeams = {}
              try {
                const teamsPath = resolve(AOM_EA_ROOT, 'context', 'project-teams.json')
                if (fs.existsSync(teamsPath)) {
                  projectTeams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'))
                }
              } catch {}

              const convEntry = {
                id,
                timestamp: new Date().toISOString(),
                role: 'user',
                agent: agentName,
                source: 'dashboard',
                text: data.message,
                reply_to: '',
                ...(projectTarget ? { project: projectTarget } : {}),
                ...(isAll ? { broadcast: 'all' } : {}),
              }
              const convLine = JSON.stringify(convEntry) + '\n'
              const convDir = resolve(AOM_EA_ROOT, 'conversations')
              const agentsDir = resolve(convDir, 'agents')
              const projectsDir = resolve(convDir, 'projects')
              fs.mkdirSync(agentsDir, { recursive: true })
              fs.mkdirSync(projectsDir, { recursive: true })
              try {
                // Always write to main + aom-internal (once each)
                fs.appendFileSync(resolve(convDir, 'main.jsonl'), convLine)
                fs.appendFileSync(resolve(projectsDir, 'aom-internal.jsonl'), convLine)

                if (isAll) {
                  // @all: write to EVERY agent's conversation file
                  for (const slug of VALID_AGENTS) {
                    fs.appendFileSync(resolve(agentsDir, `${slug}.jsonl`), convLine)
                  }
                } else if (projectTarget) {
                  // @project: write to project file + every team member
                  fs.appendFileSync(resolve(projectsDir, `${projectTarget}.jsonl`), convLine)
                  const team = projectTeams[projectTarget] || []
                  for (const member of team) {
                    if (VALID_AGENTS.has(member)) {
                      fs.appendFileSync(resolve(agentsDir, `${member}.jsonl`), convLine)
                    }
                  }
                } else {
                  // Regular: write to one agent's file
                  fs.appendFileSync(resolve(agentsDir, `${agentName}.jsonl`), convLine)
                }
              } catch (err) {
                console.log(`[Relay] Conv log write failed: ${err.message}`)
              }
            }

            // Auto-respond: spawn claude -p as fallback when no terminal is active.
            // Uses a queue to prevent race conditions: only one auto-responder at a time.
            // Rapid messages reset the timer so only the latest message triggers a response.
            if (source === 'corner-dashboard' && data.message) {
              const pendingData = {
                agent: data.agent || 'elon',
                msg: data.message,
                msgId: id,
                entryTs: entry.timestamp,
                agentFolder: AGENT_FOLDERS[data.agent || 'elon'],
              }

              // If auto-responder is already running (claude -p process active), skip.
              // The running process will handle whatever is in the conversation.
              if (autoResponderRunning) {
                console.log(`[AutoRespond] Already running, skipping queue for: "${pendingData.msg.slice(0, 40)}..."`)
              } else {
                // Store latest pending message (overwrites any previous pending)
                autoResponderPending = pendingData
                // Reset the timer on each new message (debounce)
                if (autoResponderTimer) clearTimeout(autoResponderTimer)
                autoResponderTimer = setTimeout(() => {
                  const p = autoResponderPending
                  autoResponderPending = null
                  autoResponderTimer = null
                  if (!p) return

                  console.log(`[AutoRespond] Checking for ${p.agent} response after ${AUTO_RESPOND_DELAY_MS/1000}s...`)

                  // Check if terminal session is active (relay-session-lock)
                  const sessionLock = resolve(AOM_EA_ROOT, 'context', '.relay-session-lock')
                  try {
                    if (fs.existsSync(sessionLock)) {
                      const lockContent = fs.readFileSync(sessionLock, 'utf-8').trim()
                      const pidMatch = lockContent.match(/pid=(\d+)/)
                      if (pidMatch) {
                        // Check if PID is alive
                        try {
                          process.kill(parseInt(pidMatch[1]), 0) // signal 0 = check existence
                          console.log(`[AutoRespond] Terminal session active (PID ${pidMatch[1]}), skipping auto-respond.`)
                          return
                        } catch {
                          // PID not running, terminal is dead, proceed with auto-respond
                          console.log(`[AutoRespond] Session lock stale (PID ${pidMatch[1]} dead), proceeding.`)
                        }
                      }
                    }
                  } catch {}

                  // Check if terminal already responded
                  const convFile = resolve(AOM_EA_ROOT, 'conversations', 'agents', `${p.agent}.jsonl`)
                  try {
                    if (fs.existsSync(convFile)) {
                      const lines = fs.readFileSync(convFile, 'utf-8').split('\n').filter(l => l.trim())
                      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
                        try {
                          const m = JSON.parse(lines[i])
                          if (m.role === 'assistant' && m.timestamp > p.entryTs) {
                            console.log(`[AutoRespond] Terminal already responded for ${p.agent}, skipping.`)
                            return
                          }
                        } catch {}
                      }
                    }
                  } catch {}

                  // Also check for .auto-responding marker (another process might be handling it)
                  const markerPath = resolve(AOM_EA_ROOT, 'context', '.auto-responding')
                  try {
                    if (fs.existsSync(markerPath)) {
                      console.log(`[AutoRespond] Marker file exists, another responder active. Skipping.`)
                      return
                    }
                  } catch {}

                  // No response yet. Lock and auto-respond.
                  autoResponderRunning = true
                  console.log(`[AutoRespond] No terminal response for ${p.agent}. Spawning claude -p...`)
                  try { fs.writeFileSync(markerPath, p.agent) } catch {}

                  const agentMd = p.agentFolder ? resolve(AOM_EA_ROOT, `projects/${p.agentFolder}/AGENT.md`) : null
                  const lastConvo = p.agentFolder ? resolve(AOM_EA_ROOT, `projects/${p.agentFolder}/last-conversation.md`) : null
                  let ctx = ''
                  try { if (agentMd && fs.existsSync(agentMd)) ctx += '\n\n' + fs.readFileSync(agentMd, 'utf-8').slice(0, 2000) } catch {}
                  try { if (lastConvo && fs.existsSync(lastConvo)) ctx += '\n\n' + fs.readFileSync(lastConvo, 'utf-8').slice(0, 1500) } catch {}

                  const prompt = `You are ${p.agent}. Patrik sent: "${p.msg}"\n\nRespond as ${p.agent}. Prefix with [${p.agent.toUpperCase()}]. Be concise. No em dashes.${ctx}`
                  const cli = ['/opt/homebrew/bin/claude', '/usr/local/bin/claude']
                    .find(cp => { try { return fs.existsSync(cp) } catch { return false } })

                  console.log(`[AutoRespond] Claude CLI: ${cli || 'NOT FOUND'}`)
                  if (cli) {
                    const child = spawn(cli, ['-p', '--model', 'haiku', '--no-session-persistence'], {
                      cwd: AOM_EA_ROOT, timeout: 45000, shell: true,
                      env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'],
                    })
                    let out = ''
                    child.stdout.on('data', c => { out += c.toString() })
                    child.on('close', (code) => {
                      autoResponderRunning = false
                      const resp = out.trim()
                      console.log(`[AutoRespond] claude -p exited (code ${code}), response: ${resp ? resp.slice(0, 60) + '...' : 'EMPTY'}`)
                      if (!resp) {
                        try { fs.unlinkSync(markerPath) } catch {}
                        return
                      }
                      const pm = resp.match(/^\[([A-Z]+)\]/)
                      const slug = pm ? pm[1].toLowerCase() : p.agent
                      const clean = resp.replace(/^\[[A-Z]+\]\s*/, '').trim()
                      const line = JSON.stringify({
                        id: crypto.randomUUID(), timestamp: new Date().toISOString(),
                        role: 'assistant', agent: slug, source: 'dashboard-auto',
                        text: clean, reply_to: p.msgId,
                      }) + '\n'
                      const cd = resolve(AOM_EA_ROOT, 'conversations')
                      try { fs.appendFileSync(resolve(cd, 'agents', `${slug}.jsonl`), line) } catch {}
                      try { fs.appendFileSync(resolve(cd, 'main.jsonl'), line) } catch {}
                      try { fs.appendFileSync(resolve(cd, 'projects', 'aom-internal.jsonl'), line) } catch {}
                      // Write to relay-outbox so dashboard sees the response via outbox polling
                      const outboxEntry = JSON.stringify({
                        id: crypto.randomUUID(),
                        timestamp: new Date().toISOString(),
                        message: resp,
                        status: 'pending',
                        source: 'dashboard-auto',
                        reply_to: p.msgId,
                      }) + '\n'
                      withFileLock(RELAY_OUTBOX_PATH, () => {
                        try { fs.appendFileSync(RELAY_OUTBOX_PATH, outboxEntry) } catch {}
                        if (RELAY_OUTBOX_PATH !== REPO_OUTBOX_PATH) {
                          try { fs.appendFileSync(REPO_OUTBOX_PATH, outboxEntry) } catch {}
                        }
                      })
                      try { fs.unlinkSync(markerPath) } catch {}
                    })
                    child.on('error', () => {
                      autoResponderRunning = false
                      try { fs.unlinkSync(markerPath) } catch {}
                    })
                    child.stdin.write(prompt)
                    child.stdin.end()
                  } else {
                    autoResponderRunning = false
                    try { fs.unlinkSync(markerPath) } catch {}
                  }
                }, AUTO_RESPOND_DELAY_MS)
              }
            }
          } catch (err) {
            if (!res.writableEnded) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
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
            const seenIds = new Set()
            for (const line of recent) {
              try {
                const msg = JSON.parse(line)
                // Dedup by message ID
                if (msg.id && seenIds.has(msg.id)) continue
                if (msg.id) seenIds.add(msg.id)
                messages.push(msg)
              } catch {}
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

      // ---- RELAY DEBUG ENDPOINT ----
      // Returns full relay system health: per-agent conversation file stats,
      // relay inbox/outbox status, hook status, active persona, pipeline trace.
      server.middlewares.use('/api/local/relay-debug', (req, res) => {
        const result = { timestamp: new Date().toISOString(), agents: {}, relay: {}, hooks: {}, pipeline: [] }
        const convDir = resolve(AOM_EA_ROOT, 'conversations')
        const agentSlugs = ['bobby','colton','steffen','jacob','elon','alex','steve','cleo','tony','paige','pixel','mom','elmo']

        // Per-agent conversation file stats
        for (const slug of agentSlugs) {
          const filePath = resolve(convDir, 'agents', `${slug}.jsonl`)
          let lineCount = 0, lastTimestamp = null, userCount = 0, assistantCount = 0, sources = {}
          try {
            if (fs.existsSync(filePath)) {
              const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim())
              lineCount = lines.length
              for (const line of lines) {
                try {
                  const m = JSON.parse(line)
                  if (m.role === 'user') userCount++
                  if (m.role === 'assistant') assistantCount++
                  if (m.source) sources[m.source] = (sources[m.source] || 0) + 1
                  if (m.timestamp) lastTimestamp = m.timestamp
                } catch {}
              }
            }
          } catch {}
          result.agents[slug] = {
            totalMessages: lineCount,
            userMessages: userCount,
            assistantMessages: assistantCount,
            lastTimestamp,
            sources,
            status: lineCount === 0 ? 'EMPTY' : lineCount < 5 ? 'LOW' : 'ACTIVE',
          }
        }

        // Main + aom-internal stats
        for (const [name, path] of [['main', resolve(convDir, 'main.jsonl')], ['aom-internal', resolve(convDir, 'projects', 'aom-internal.jsonl')]]) {
          try {
            const lines = fs.existsSync(path) ? fs.readFileSync(path, 'utf-8').split('\n').filter(l => l.trim()) : []
            result.relay[name] = { totalMessages: lines.length }
          } catch { result.relay[name] = { totalMessages: 0 } }
        }

        // Relay inbox/outbox status
        for (const [label, filePath] of [['inbox', RELAY_INBOX_PATH], ['outbox', RELAY_OUTBOX_PATH]]) {
          try {
            const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()) : []
            let pending = 0, read = 0, sent = 0, echoed = 0
            for (const line of lines.slice(-50)) {
              try {
                const m = JSON.parse(line)
                if (m.status === 'pending') pending++
                else if (m.status === 'read') read++
                else if (m.status === 'sent') sent++
                else if (m.status === 'echoed') echoed++
              } catch {}
            }
            result.relay[label] = { total: lines.length, pending, read, sent, echoed }
          } catch { result.relay[label] = { total: 0 } }
        }

        // Active persona
        try {
          const personaPath = resolve(AOM_EA_ROOT, 'context', '.active-persona')
          result.hooks.activePersona = fs.existsSync(personaPath) ? fs.readFileSync(personaPath, 'utf-8').trim() : 'not set'
        } catch { result.hooks.activePersona = 'error' }

        // Auto-responding marker
        try {
          const markerPath = resolve(AOM_EA_ROOT, 'context', '.auto-responding')
          result.hooks.autoResponding = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf-8').trim() : false
        } catch { result.hooks.autoResponding = 'error' }

        // Session checkpoint
        try {
          const cpPath = resolve(AOM_EA_ROOT, 'context', 'session-checkpoint.json')
          if (fs.existsSync(cpPath)) {
            const cp = JSON.parse(fs.readFileSync(cpPath, 'utf-8'))
            result.hooks.sessionCheckpoint = { persona: cp.active_persona, label: cp.active_persona_label }
          }
        } catch {}

        // Pending user prompt
        try {
          const ppPath = resolve(AOM_EA_ROOT, 'context', '.pending-user-prompt')
          result.hooks.pendingUserPrompt = fs.existsSync(ppPath)
        } catch {}

        // Pipeline health summary
        const issues = []
        const emptyAgents = agentSlugs.filter(s => result.agents[s].totalMessages === 0)
        if (emptyAgents.length > 0) issues.push({ level: 'info', message: `${emptyAgents.length} agents have empty conversation files: ${emptyAgents.join(', ')}` })
        if (result.relay.inbox?.pending > 0) issues.push({ level: 'warn', message: `${result.relay.inbox.pending} pending messages in inbox waiting for processing` })
        if (result.hooks.autoResponding) issues.push({ level: 'warn', message: `Auto-responder active for: ${result.hooks.autoResponding}` })
        if (result.hooks.pendingUserPrompt) issues.push({ level: 'warn', message: 'Pending user prompt not yet consumed by Stop hook' })
        result.pipeline = issues

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        res.end(JSON.stringify(result, null, 2))
      })

      // Notifications endpoint
      server.middlewares.use('/api/local/notifications', (req, res) => {
        const content = readLocalFile('context/agent-notifications.md')
        const notifications = parseNotifications(content)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ notifications, timestamp: new Date().toISOString() }))
      })

      // ---- SET ACTIVE PERSONA --------
      // Dashboard agent selector writes to context/.active-persona so the
      // terminal session responds as the chosen agent.
      server.middlewares.use('/api/local/set-persona', (req, res) => {
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
            const slug = (data.agent || '').toLowerCase().trim()
            const VALID = new Set(['elon','bobby','steffen','steve','alex','jacob','cleo','tony','paige','colton','elmo','mom','pixel'])
            if (!slug || !VALID.has(slug)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: `Invalid agent slug: ${slug}` }))
              return
            }
            const personaPath = resolve(AOM_EA_ROOT, 'context', '.active-persona')
            fs.writeFileSync(personaPath, slug)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, agent: slug }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // ---- TASK ASSIGN (Right Now routing) --------
      // When a task moves to Right Now, auto-assign to an agent and notify them.
      // This makes Right Now ACTIONABLE, not just a display list.
      server.middlewares.use('/api/local/task-assign', (req, res) => {
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
            const { task, agent, project, blocked } = data
            // task = text description, agent = slug (optional, auto-pick if missing),
            // project = project slug (optional), blocked = true if blocked on Patrik

            if (!task) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing task' }))
              return
            }

            const ts = new Date().toISOString()
            const VALID_AGENTS = new Set(['elon','bobby','steffen','steve','alex','jacob','cleo','tony','paige','colton','elmo','mom'])

            // Determine assignee
            let assignee = agent || null
            if (!assignee && project) {
              // Look up project team, pick first member as default
              try {
                const teamsPath = resolve(AOM_EA_ROOT, 'context', 'project-teams.json')
                if (fs.existsSync(teamsPath)) {
                  const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'))
                  const team = teams[project] || []
                  if (team.length > 0) assignee = team[0]
                }
              } catch {}
            }
            if (!assignee) assignee = 'elon' // default: Elon triages

            if (!VALID_AGENTS.has(assignee)) assignee = 'elon'

            const status = blocked ? 'BLOCKED on Patrik' : `ASSIGNED to ${assignee}`

            // Write to agent-notifications.md
            const notifPath = resolve(AOM_EA_ROOT, 'context', 'agent-notifications.md')
            const notifLine = `[${ts.slice(0, 10)}] TASK RIGHT NOW: ${task} -- ${status}\n`
            fs.appendFileSync(notifPath, notifLine)

            // Write to agent's conversation file (so they see it on next session)
            if (!blocked) {
              const convDir = resolve(AOM_EA_ROOT, 'conversations', 'agents')
              const convEntry = JSON.stringify({
                id: crypto.randomUUID(),
                timestamp: ts,
                role: 'system',
                agent: assignee,
                source: 'task-router',
                text: `[TASK ASSIGNED] "${task}" moved to Right Now and assigned to you.${project ? ` Project: ${project}` : ''}`,
                reply_to: '',
              }) + '\n'
              try {
                fs.mkdirSync(convDir, { recursive: true })
                fs.appendFileSync(resolve(convDir, `${assignee}.jsonl`), convEntry)
              } catch {}
            }

            console.log(`[TaskAssign] "${task}" -> ${status}`)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, task, assignee, blocked: !!blocked, timestamp: ts }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
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

      // ---- LOCAL UNSTUCK ENDPOINT ----
      // POST /api/local/unstuck
      // Full system recovery: push unpushed commits, verify deploy,
      // reconcile PIDs (stale-detector-pid), refill queue (auto-promote).
      // Returns a structured report of what was done.
      server.middlewares.use('/api/local/unstuck', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'POST only' }))
          return
        }

        const STUDIO_ROOT = resolve(AOM_EA_ROOT, '..', 'aom-studio')
        const AOM_EA_SCRIPTS = resolve(AOM_EA_ROOT, 'scripts')
        const report = {
          timestamp: new Date().toISOString(),
          push: null,          // { pushed: bool, commit: str, error?: str }
          deploy: null,        // { ok: bool, status: int, error?: str }
          pidReconcile: null,  // { ran: bool, output: str, error?: str }
          queueRefill: null,   // { ran: bool, output: str, error?: str }
          taskStatus: null,    // { count: int, entries: [] }
        }

        // Helper: run a child process and collect stdout/stderr
        function runScript(cmd, args, opts) {
          return new Promise((resolve) => {
            let stdout = ''
            let stderr = ''
            const child = spawn(cmd, args, { ...opts, stdio: 'pipe' })
            child.stdout.on('data', d => { stdout += d.toString() })
            child.stderr.on('data', d => { stderr += d.toString() })
            child.on('close', code => resolve({ code, stdout, stderr }))
            child.on('error', err => resolve({ code: -1, stdout, stderr, error: err.message }))
          })
        }

        // Helper: check HTTP status of a URL
        function httpCheck(url) {
          return new Promise((resolve) => {
            const mod = url.startsWith('https') ? require('https') : require('http')
            const req = mod.get(url, { timeout: 8000 }, (resp) => {
              resolve({ ok: resp.statusCode >= 200 && resp.statusCode < 400, status: resp.statusCode })
            })
            req.on('error', err => resolve({ ok: false, error: err.message }))
            req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }) })
          })
        }

        ;(async () => {
          try {
            // 1. CHECK + PUSH UNPUSHED COMMITS
            // First: which branch does aom-studio use? (main or master)
            const branchResult = await runScript('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: STUDIO_ROOT })
            const branch = branchResult.stdout.trim() || 'master'

            const logResult = await runScript('git', ['log', `origin/${branch}..HEAD`, '--oneline'], { cwd: STUDIO_ROOT })
            const unpushedLines = logResult.stdout.trim().split('\n').filter(Boolean)

            if (unpushedLines.length > 0) {
              const pushResult = await runScript('git', ['push', 'origin', branch], { cwd: STUDIO_ROOT })
              if (pushResult.code === 0) {
                report.push = {
                  pushed: true,
                  count: unpushedLines.length,
                  commits: unpushedLines.slice(0, 5),
                }
              } else {
                report.push = {
                  pushed: false,
                  error: (pushResult.stderr || pushResult.stdout).trim().slice(0, 300),
                }
              }
            } else {
              report.push = { pushed: false, count: 0, message: 'Nothing to push' }
            }

            // 2. VERIFY DEPLOY (smoke test aheadofmarket.com/dashboard)
            try {
              const deployCheck = await httpCheck('https://aheadofmarket.com/dashboard')
              report.deploy = deployCheck
            } catch (e) {
              report.deploy = { ok: false, error: e.message }
            }

            // 3. RECONCILE PIDs (run stale-detector-pid.py)
            const pidResult = await runScript(
              'python3',
              [resolve(AOM_EA_SCRIPTS, 'stale-detector-pid.py')],
              { cwd: AOM_EA_ROOT }
            )
            report.pidReconcile = {
              ran: true,
              output: (pidResult.stdout + pidResult.stderr).trim().slice(0, 500),
              exitCode: pidResult.code,
            }

            // 4. REFILL QUEUE (run auto-promote.py)
            const promoteResult = await runScript(
              'python3',
              [resolve(AOM_EA_SCRIPTS, 'auto-promote.py')],
              { cwd: AOM_EA_ROOT }
            )
            report.queueRefill = {
              ran: true,
              output: (promoteResult.stdout + promoteResult.stderr).trim().slice(0, 500),
              exitCode: promoteResult.code,
            }

            // 5. READ TASK STATUS SNAPSHOT
            try {
              const tsPath = resolve(AOM_EA_ROOT, 'context', 'task-status.jsonl')
              if (fs.existsSync(tsPath)) {
                const lines = fs.readFileSync(tsPath, 'utf-8')
                  .split('\n')
                  .filter(l => l.trim() && !l.startsWith('#'))
                const entries = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
                report.taskStatus = { count: entries.length, entries }
              } else {
                report.taskStatus = { count: 0, entries: [] }
              }
            } catch (e) {
              report.taskStatus = { count: 0, entries: [], error: e.message }
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, report }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: err.message, report }))
          }
        })()
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

              // Handle chat messages (forward to relay inbox + write to conversation files)
              if (data.type === 'chat_message') {
                const wsId = crypto.randomUUID()
                const wsTs = new Date().toISOString()
                const agentName = data.agent || 'elon'
                const entry = {
                  id: wsId,
                  agent: agentName,
                  message: data.content,
                  source: 'corner-websocket',
                  // Use 'pending' so terminal relay hook picks up dashboard messages.
                  // Auto-responder checks session-lock + JSONL to avoid double-processing.
                  status: 'pending',
                  chat_id: null,
                  timestamp: wsTs,
                }
                const line = JSON.stringify(entry) + '\n'
                // Write to both relay inbox paths
                withFileLock(RELAY_INBOX_PATH, () => {
                  fs.appendFileSync(RELAY_INBOX_PATH, line)
                  if (RELAY_INBOX_PATH !== REPO_INBOX_PATH) {
                    fs.appendFileSync(REPO_INBOX_PATH, line)
                  }
                })

                // Write to conversation files (same as HTTP relay-send)
                if (data.content) {
                  const projectSlug = data.project || null
                  const convEntry = {
                    id: wsId,
                    timestamp: wsTs,
                    role: 'user',
                    agent: agentName,
                    source: 'dashboard',
                    text: data.content,
                    reply_to: '',
                    ...(projectSlug ? { project: projectSlug } : {}),
                  }
                  const convLine = JSON.stringify(convEntry) + '\n'
                  const convDir = resolve(AOM_EA_ROOT, 'conversations')
                  try {
                    // Always write to main log
                    fs.appendFileSync(resolve(convDir, 'main.jsonl'), convLine)
                    // Always write to agent-specific log
                    const agentsDir = resolve(convDir, 'agents')
                    fs.mkdirSync(agentsDir, { recursive: true })
                    fs.appendFileSync(resolve(agentsDir, `${agentName}.jsonl`), convLine)
                    // If project slug provided, also write to project conversation file
                    if (projectSlug) {
                      const projectsDir = resolve(convDir, 'projects')
                      fs.mkdirSync(projectsDir, { recursive: true })
                      fs.appendFileSync(resolve(projectsDir, `${projectSlug}.jsonl`), convLine)
                    }
                    // Also write to AOM master chat
                    const aomChat = resolve(convDir, 'projects', 'aom-internal.jsonl')
                    fs.mkdirSync(resolve(convDir, 'projects'), { recursive: true })
                    fs.appendFileSync(aomChat, convLine)
                  } catch (err) {
                    console.log(`[WebSocket] Conv log write failed: ${err.message}`)
                  }
                }

                // Broadcast agent state change: thinking
                broadcast({
                  type: 'agent_state_change',
                  agent: agentName,
                  state: 'thinking',
                  timestamp: wsTs,
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
