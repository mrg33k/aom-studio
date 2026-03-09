// AOM Mission Control -- Chat + Task + Reports + Tool-Use API
// Vercel serverless function

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const STUDIO_REPO = 'mrg33k/aom-studio'
const BRANCH = 'master'

async function fetchGitHubFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

async function writeGitHubFile(path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: BRANCH,
      }),
    }
  )
  return res.ok
}

async function fetchRepoFile(repo, branch, path) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

async function writeRepoFile(repo, branch, path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      }),
    }
  )
  return res.ok
}

async function listGitHubDir(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ── TOOL DEFINITIONS ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'mark_task_done',
    description: 'Marks a task as done in the AOM punch list.',
    input_schema: {
      type: 'object',
      properties: {
        task_description: {
          type: 'string',
          description: 'The text of the task to mark as done.',
        },
      },
      required: ['task_description'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from a GitHub repo. Use repo "aom-ea" for context/agent files, "aom-studio" for dashboard/website code.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', enum: ['aom-ea', 'aom-studio'], description: 'Which repo to read from' },
        path: { type: 'string', description: 'File path relative to repo root, e.g. "src/dashboard/Dashboard.jsx"' },
      },
      required: ['repo', 'path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write/update a file in a GitHub repo. Provide the FULL file content. The file will be committed and pushed automatically. Use repo "aom-studio" for dashboard/website code changes.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', enum: ['aom-ea', 'aom-studio'], description: 'Which repo to write to' },
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'The FULL new file content' },
        commit_message: { type: 'string', description: 'Short commit message describing the change' },
      },
      required: ['repo', 'path', 'content', 'commit_message'],
    },
  },
]

const TOOL_SYSTEM_PROMPT = `
You have tools available to update AOM's system. Use them when:
- A task is confirmed done (mark_task_done)
Do NOT use tools speculatively. Only write when something actually happened.
Do NOT mark tasks done unless Patrik confirms.`

async function executeMarkTaskDone(taskDescription) {
  const file = await fetchGitHubFile('punch-list.md')
  if (!file) return { success: false, error: 'Could not fetch punch list' }

  const lines = file.content.split('\n')
  const today = new Date().toISOString().split('T')[0]
  const searchLower = taskDescription.toLowerCase()

  let bestMatch = -1
  let bestScore = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.match(/^\s*- \[ \]/)) continue
    const lineText = line.replace(/^\s*- \[ \]\s*/, '').toLowerCase()
    // Simple keyword match scoring
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2)
    const matchCount = searchWords.filter(w => lineText.includes(w)).length
    const score = matchCount / searchWords.length
    if (score > bestScore) { bestScore = score; bestMatch = i }
  }

  if (bestMatch === -1 || bestScore < 0.3) {
    return { success: false, error: `No matching unchecked task found for: "${taskDescription}"` }
  }

  const originalLine = lines[bestMatch]
  lines[bestMatch] = originalLine.replace('- [ ]', `- [x]`) + ` -- done ${today}`

  const ok = await writeGitHubFile(
    'punch-list.md',
    lines.join('\n'),
    file.sha,
    `Mark task done from dashboard: ${taskDescription.slice(0, 60)}`
  )

  if (!ok) return { success: false, error: 'GitHub write failed' }

  const completedTask = originalLine.replace(/^\s*- \[ \]\s*/, '').trim()

  // Cascade to other context files
  const syncErrors = await syncContextAfterMutation('done', completedTask)

  return { success: true, task: completedTask, date: today, syncErrors: syncErrors.length > 0 ? syncErrors : undefined }
}

function resolveRepo(repoName) {
  if (repoName === 'aom-studio') return { repo: STUDIO_REPO, branch: 'main' }
  return { repo: REPO, branch: BRANCH }
}

async function executeTool(toolName, toolInput) {
  if (toolName === 'mark_task_done') {
    return await executeMarkTaskDone(toolInput.task_description)
  }
  if (toolName === 'read_file') {
    const { repo: repoName, path } = toolInput
    const { repo, branch } = resolveRepo(repoName)
    const file = await fetchRepoFile(repo, branch, path)
    if (!file) return { success: false, error: `File not found: ${path} in ${repoName}` }
    // Truncate large files to avoid token explosion
    const content = file.content.length > 15000 ? file.content.slice(0, 15000) + '\n\n... [truncated, file is ' + file.content.length + ' chars]' : file.content
    return { success: true, path, content, sha: file.sha }
  }
  if (toolName === 'write_file') {
    const { repo: repoName, path, content, commit_message } = toolInput
    const { repo, branch } = resolveRepo(repoName)
    // Get current SHA (file may or may not exist)
    const existing = await fetchRepoFile(repo, branch, path)
    const sha = existing ? existing.sha : undefined
    const ok = await writeRepoFile(repo, branch, path, content, sha, commit_message)
    if (!ok) return { success: false, error: 'GitHub write failed' }
    return { success: true, path, message: `File written and committed: ${commit_message}` }
  }
  return { success: false, error: `Unknown tool: ${toolName}` }
}

// ── CONTEXT SYNC ─────────────────────────────────────────────────────────────
// After any task mutation, cascade the change to other context files
async function syncContextAfterMutation(mutationType, taskText, extra = {}) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' })
  const errors = []

  // 1. Log to actions-log.md (activity feed picks this up)
  try {
    const actionsFile = await fetchGitHubFile('context/actions-log.md')
    if (actionsFile) {
      const logLine = mutationType === 'done'
        ? `- [${today} ${now}] Task completed from dashboard: ${taskText}`
        : mutationType === 'add'
        ? `- [${today} ${now}] Task added from dashboard: ${taskText}`
        : mutationType === 'rename'
        ? `- [${today} ${now}] Task renamed from dashboard: ${extra.oldText} -> ${taskText}`
        : mutationType === 'delete'
        ? `- [${today} ${now}] Task removed from dashboard: ${taskText}`
        : `- [${today} ${now}] Task updated from dashboard: ${taskText}`

      const updated = actionsFile.content.trimEnd() + '\n' + logLine + '\n'
      await writeGitHubFile('context/actions-log.md', updated, actionsFile.sha, `Dashboard sync: ${mutationType} -- ${taskText.slice(0, 40)}`)
    }
  } catch (e) { errors.push('actions-log: ' + e.message) }

  // 2. If task marked done, check current-priorities.md for references
  if (mutationType === 'done') {
    try {
      const priFile = await fetchGitHubFile('context/current-priorities.md')
      if (priFile) {
        // Find lines that reference this task (fuzzy match on key words)
        const keywords = taskText.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        const lines = priFile.content.split('\n')
        let changed = false

        for (let i = 0; i < lines.length; i++) {
          const lineLower = lines[i].toLowerCase()
          // Check if enough keywords match this priority line
          const matchCount = keywords.filter(k => lineLower.includes(k)).length
          if (matchCount >= Math.min(2, keywords.length) && matchCount / keywords.length > 0.4) {
            // Don't overwrite the line, just annotate if not already done
            if (!lines[i].includes('DONE') && !lines[i].includes('done')) {
              lines[i] = lines[i] + ` [DONE ${today}]`
              changed = true
            }
          }
        }

        if (changed) {
          // Update the "Last updated" line
          const updatedContent = lines.join('\n').replace(
            /\*Last updated:.*?\*/,
            `*Last updated: ${today}*`
          )
          await writeGitHubFile('context/current-priorities.md', updatedContent, priFile.sha, `Dashboard sync: mark priority done -- ${taskText.slice(0, 40)}`)
        }
      }
    } catch (e) { errors.push('priorities: ' + e.message) }

    // 3. Update HANDOFF.md "What just happened" section
    try {
      const handoffFile = await fetchGitHubFile('HANDOFF.md')
      if (handoffFile) {
        const content = handoffFile.content
        // Add to "What just happened" section
        const marker = '## What just happened'
        const idx = content.indexOf(marker)
        if (idx !== -1) {
          const afterMarker = idx + marker.length
          const nextNewline = content.indexOf('\n', afterMarker)
          const insertPoint = nextNewline + 1
          const newLine = `- [Dashboard] Completed: ${taskText}\n`
          const updated = content.slice(0, insertPoint) + newLine + content.slice(insertPoint)
          await writeGitHubFile('HANDOFF.md', updated, handoffFile.sha, `Dashboard sync: handoff update -- ${taskText.slice(0, 40)}`)
        }
      }
    } catch (e) { errors.push('handoff: ' + e.message) }
  }

  return errors
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { action, message, agent, task, mode, topic, responses } = req.body

  // ── GET REPORTS ────────────────────────────────────────────────────────────
  if (action === 'get_reports') {
    try {
      // Scan known project directories for report files
      const reportDirs = [
        'projects/ambition-mechanical',
        'projects/aom-strategy',
        'projects/content-agent',
        'projects/sys',
        'projects/mom',
        'projects/paige',
        'projects/tony',
      ]

      const reportPatterns = [
        /^audit-/i, /^brief-/i, /^dashboard-brief/i, /^biz-dev-brief/i,
        /^reference-analysis/i, /^design-brief/i, /^stats-research/i,
        /^bobby-session/i, /^seo-keyword/i, /^super-admin-plan/i,
        /^dashboard-control-panel/i,
      ]

      const allFiles = await Promise.all(reportDirs.map(dir => listGitHubDir(dir)))
      const reportFiles = []

      for (let i = 0; i < reportDirs.length; i++) {
        const dir = reportDirs[i]
        const files = allFiles[i]
        for (const file of files) {
          if (file.type !== 'file' || !file.name.endsWith('.md')) continue
          if (file.name === 'AGENT.md' || file.name === 'README.md' || file.name === 'SKILL.md') continue
          // Match known report patterns or any non-AGENT md file in strategy dirs
          const isReport = reportPatterns.some(p => p.test(file.name)) ||
            dir === 'projects/aom-strategy' ||
            /audit|brief|research|analysis|plan|session/i.test(file.name)
          if (isReport) {
            reportFiles.push({ path: `${dir}/${file.name}`, name: file.name, dir })
          }
        }
      }

      // Fetch content for each report (limit to 20 to avoid rate limits)
      const reports = []
      const toFetch = reportFiles.slice(0, 20)
      const contents = await Promise.all(toFetch.map(f => fetchGitHubFile(f.path)))

      for (let i = 0; i < toFetch.length; i++) {
        const f = toFetch[i]
        const content = contents[i]
        if (!content) continue

        // Extract date from filename or content
        const dateFromName = f.name.match(/(\d{4}-\d{2}-\d{2})/)
        const dateFromContent = content.content.match(/(?:date|updated|created|designed).*?(\d{4}-\d{2}-\d{2})/i)
        const date = dateFromName ? dateFromName[1] : dateFromContent ? dateFromContent[1] : null

        // Infer agent from directory
        const agentMap = {
          'projects/ambition-mechanical': 'Bobby',
          'projects/aom-strategy': 'Alex',
          'projects/content-agent': 'Cleo',
          'projects/sys': 'Elon',
          'projects/mom': 'Mom',
          'projects/paige': 'Paige',
          'projects/tony': 'Tony',
        }
        const inferredAgent = agentMap[f.dir] || 'System'

        // Extract title from first heading or filename
        const titleMatch = content.content.match(/^#\s+(.+)/m)
        const title = titleMatch ? titleMatch[1].trim() : f.name.replace('.md', '').replace(/-/g, ' ')

        // Categorize
        let type = 'report'
        if (/audit/i.test(f.name)) type = 'audit'
        else if (/brief/i.test(f.name)) type = 'brief'
        else if (/research|analysis/i.test(f.name)) type = 'research'
        else if (/plan|arch/i.test(f.name)) type = 'plan'
        else if (/session/i.test(f.name)) type = 'session'

        reports.push({
          path: f.path,
          title,
          type,
          agent: inferredAgent,
          date,
          content: content.content,
        })
      }

      // Sort newest first (reports with dates first, then alphabetical)
      reports.sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date)
        if (a.date) return -1
        if (b.date) return 1
        return a.title.localeCompare(b.title)
      })

      return res.status(200).json({ reports })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch reports: ' + err.message })
    }
  }

  // ── HOME CHAT ────────────────────────────────────────────────────────────
  if (action === 'home_chat') {
    const message = req.body.message
    if (!message) return res.status(400).json({ error: 'message required' })
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    // Detect if this needs full Mac execution power
    const heavyPatterns = /\b(launch|run|start|session|bobby|colton|cleo|steffen|jacob|alex|elon|mom|tony|paige|playwright|screenshot|calendar|email|send|schedule|outreach|build|deploy|audit|loop)\b/i
    const needsMac = heavyPatterns.test(message)

    // Load full context
    const [handoff, priorities, workCtx, punchList, homeQueue] = await Promise.all([
      fetchGitHubFile('HANDOFF.md'),
      fetchGitHubFile('context/current-priorities.md'),
      fetchGitHubFile('context/work.md'),
      fetchGitHubFile('punch-list.md'),
      fetchGitHubFile('context/home-queue.md'),
    ])

    // Build conversation history from the messages sent by the client
    const history = req.body.history || []

    const systemPrompt = `You are Claude Code (CC), Patrik Matheson's executive assistant at AOM. This is a real-time conversation via the dashboard HOME chat on his phone.

PERSONALITY: Direct, warm, concise. Match his energy. No em dashes. No emojis unless he uses them first. Bullet points over paragraphs.

CAPABILITIES:
- You can answer questions from context (priorities, clients, tasks, work status)
- You can read and discuss any file in the AOM-EA repo
- For heavy operations (launching agents, calendar, email, builds, screenshots, MCP tools), you queue them to home-queue.md and the Mac loop executes them with FULL power

CRITICAL RULE: You NEVER say "I can't do that." You have a Mac running Claude Code with full MCP access (calendar, email, bash, agents, Playwright, everything) behind you. If something is beyond your direct capability, you say "Queuing that for the Mac" and it gets done. You are not limited. You are the remote control for the full system.

${needsMac ? 'This message needs Mac execution. Acknowledge what you are queuing and confirm it will run on the Mac. Be specific about what will happen.' : ''}

CONTEXT:
Priorities: ${priorities?.content || 'N/A'}
Handoff: ${handoff?.content || 'N/A'}
Work: ${(workCtx?.content || '').slice(0, 2000)}
Recent tasks: ${(punchList?.content || '').slice(-1500)}
Queue: ${homeQueue?.content || 'Empty'}

Keep responses to 2-5 sentences. Be useful, not verbose.`

    const messages = [
      ...history.map(h => ({ role: h.role === 'assistant' || h.role === 'agent' ? 'assistant' : 'user', content: h.text || h.content || '' })).filter(m => m.content),
      { role: 'user', content: message },
    ]

    let ccReply = "Got it. Will follow up shortly."
    let queuedForMac = false

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: systemPrompt,
          messages,
        }),
      })

      if (anthropicRes.ok) {
        const data = await anthropicRes.json()
        const textBlocks = (data.content || []).filter(b => b.type === 'text')
        ccReply = textBlocks.map(b => b.text).join('\n') || ccReply
      }
    } catch { /* best effort */ }

    // Queue heavy commands for Mac loop
    if (needsMac) {
      const queueFile = await fetchGitHubFile('context/home-queue.md')
      if (queueFile) {
        const queueItem = `[PENDING] ${message} -- ${now}`
        const updatedQueue = queueFile.content.replace('---\n', `---\n${queueItem}\n`)
        await writeGitHubFile('context/home-queue.md', updatedQueue, queueFile.sha, `Queue from HOME: ${message.slice(0, 40)}`)
        queuedForMac = true
      }
    }

    return res.status(200).json({
      ok: true,
      reply: ccReply,
      agent: 'CC',
      queuedForMac,
    })
  }

  // ── ADD TASK ──────────────────────────────────────────────────────────────
  if (action === 'add_task') {
    if (!task) return res.status(400).json({ error: 'task required' })

    // ── HOME: prefix = async message to Claude Code ──
    const homeMatch = task.trim().match(/^HOME:\s*(.+)/i)
    if (homeMatch && ANTHROPIC_API_KEY) {
      const homeMsg = homeMatch[1].trim()
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

      // Detect if this needs full Mac execution power
      const heavyPatterns = /\b(launch|run|start|session|bobby|colton|cleo|steffen|jacob|alex|elon|mom|playwright|screenshot|calendar|email|send|schedule|outreach|build|deploy|audit)\b/i
      const needsMac = heavyPatterns.test(homeMsg)

      // Load context for Claude to respond
      const [handoff, priorities, workCtx] = await Promise.all([
        fetchGitHubFile('HANDOFF.md'),
        fetchGitHubFile('context/current-priorities.md'),
        fetchGitHubFile('context/work.md'),
      ])

      const systemPrompt = `You are Claude Code (CC), Patrik's executive assistant at AOM. Patrik sent you a message from his phone via the dashboard HOME chat. Respond concisely (2-4 sentences max). Be direct, warm, and useful.

${needsMac ? 'This message requires full system power (agents, MCP, bash). You will respond with an acknowledgment AND queue it for the Mac loop to execute. Tell Patrik what you are queuing and that it will run on the Mac.' : 'This is a lightweight request you can handle directly. Answer from context.'}

Current priorities:\n${priorities?.content || 'N/A'}
Handoff:\n${handoff?.content || 'N/A'}
Work context:\n${(workCtx?.content || '').slice(0, 3000)}`

      let ccReply = "Got it. Will follow up when you're back."
      try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 400,
            system: systemPrompt,
            messages: [{ role: 'user', content: homeMsg }],
          }),
        })

        if (anthropicRes.ok) {
          const data = await anthropicRes.json()
          const textBlocks = (data.content || []).filter(b => b.type === 'text')
          ccReply = textBlocks.map(b => b.text).join('\n') || ccReply
        }
      } catch { /* best effort */ }

      // If heavy command, write to home-queue.md for Mac loop to pick up
      if (needsMac) {
        const queueFile = await fetchGitHubFile('context/home-queue.md')
        if (queueFile) {
          const queueItem = `[PENDING] ${homeMsg} -- ${now}`
          const updatedQueue = queueFile.content.replace('---\n', `---\n${queueItem}\n`)
          await writeGitHubFile('context/home-queue.md', updatedQueue, queueFile.sha, `Queue from HOME: ${homeMsg.slice(0, 40)}`)
        }
      }

      // Log the exchange to comms section
      const file = await fetchGitHubFile('punch-list.md')
      if (file) {
        const homeItem = `- [ ] HOME: ${homeMsg} -- ${today}`
        const ccItem = `- [ ] CC: ${ccReply.replace(/\n/g, ' ').slice(0, 300)} -- ${today}`
        const commsBlock = `${homeItem}\n${ccItem}`
        let updated
        if (file.content.includes('## Comms')) {
          updated = file.content.replace('## Comms\n', `## Comms\n${commsBlock}\n`)
        } else {
          updated = file.content + `\n\n## Comms\n${commsBlock}\n`
        }
        await writeGitHubFile('punch-list.md', updated, file.sha, `HOME comms: ${homeMsg.slice(0, 40)}`)
      }

      return res.status(200).json({
        ok: true,
        message: `CC: ${ccReply}`,
        isHomeReply: true,
        queuedForMac: needsMac,
      })
    }

    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })

    const today = new Date().toISOString().split('T')[0]
    const newItem = `- [ ] ${task.trim()} -- added from dashboard ${today}`

    // Build notes lines if provided
    const { notes } = req.body
    const notesLines = notes
      ? notes.split('\n').filter(n => n.trim()).map(n => `  - ${n.trim()}`).join('\n')
      : ''
    const fullItem = notesLines ? `${newItem}\n${notesLines}` : newItem

    // Find or create "## Dashboard Tasks" section
    let updated
    if (file.content.includes('## Dashboard Tasks')) {
      updated = file.content.replace(
        '## Dashboard Tasks\n',
        `## Dashboard Tasks\n${fullItem}\n`
      )
    } else {
      updated = file.content + `\n\n## Dashboard Tasks\n${fullItem}\n`
    }

    const ok = await writeGitHubFile(
      'punch-list.md',
      updated,
      file.sha,
      `Add task from dashboard: ${task.slice(0, 60)}`
    )

    if (!ok) return res.status(500).json({ error: 'GitHub write failed -- token may need write access' })

    // Cascade to context files
    await syncContextAfterMutation('add', task.trim())

    // Auto-assign agent based on task content
    const assignedAgent = autoAssignAgent(task.trim())

    // Auto-launch the assigned agent if we have one and an API key
    let agentReply = null
    let agentActions = []
    if (assignedAgent && ANTHROPIC_API_KEY && getAgentFile(assignedAgent)) {
      try {
        const [agentMd, handoff, priorities] = await Promise.all([
          fetchGitHubFile(getAgentFile(assignedAgent)),
          fetchGitHubFile('HANDOFF.md'),
          fetchGitHubFile('context/current-priorities.md'),
        ])

        if (agentMd) {
          const contextBlock = [
            `# ${assignedAgent.toUpperCase()} AGENT\n${agentMd.content}`,
            handoff ? `# HANDOFF\n${handoff.content}` : '',
            priorities ? `# PRIORITIES\n${priorities.content}` : '',
          ].filter(Boolean).join('\n\n---\n\n')

          const systemPrompt = `You are ${assignedAgent}, an AI agent at AOM. A new task was just added from the dashboard and auto-assigned to you. Analyze it and respond with: what you understand the task to be, your plan to execute it, and any blockers. Be concise (3-5 sentences max). If you can take action with your available tools, do so.\n\n${contextBlock}`

          const apiBody = {
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: 'user', content: `NEW TASK ASSIGNED: ${task.trim()}\n\nAcknowledge and start working.` }],
            tools: TOOLS,
          }

          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify(apiBody),
          })

          if (anthropicRes.ok) {
            const data = await anthropicRes.json()
            const textBlocks = (data.content || []).filter(b => b.type === 'text')
            agentReply = textBlocks.map(b => b.text).join('\n') || null
          }
        }
      } catch { /* agent launch is best-effort, don't block the add */ }
    }

    return res.status(200).json({
      ok: true,
      message: assignedAgent
        ? `Task added and assigned to ${assignedAgent}.`
        : 'Task added to punch list.',
      assignedAgent,
      agentReply,
    })
  }

  // ── RENAME TASK ─────────────────────────────────────────────────────────
  if (action === 'rename_task') {
    const { oldText, newText } = req.body
    if (!oldText || !newText) return res.status(400).json({ error: 'oldText and newText required' })

    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })

    const lines = file.content.split('\n')
    let found = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(oldText.trim())) {
        lines[i] = lines[i].replace(oldText.trim(), newText.trim())
        found = true
        break
      }
    }

    if (!found) return res.status(404).json({ error: 'Task not found in punch list' })

    const ok = await writeGitHubFile(
      'punch-list.md',
      lines.join('\n'),
      file.sha,
      `Rename task from dashboard: ${newText.slice(0, 60)}`
    )

    if (!ok) return res.status(500).json({ error: 'GitHub write failed' })

    // Cascade to context files
    await syncContextAfterMutation('rename', newText.trim(), { oldText: oldText.trim() })

    return res.status(200).json({ ok: true, message: 'Task renamed.' })
  }

  // ── MARK TASK DONE ─────────────────────────────────────────────────────────
  if (action === 'mark_done') {
    const { taskText } = req.body
    if (!taskText) return res.status(400).json({ error: 'taskText required' })

    const result = await executeMarkTaskDone(taskText)
    if (!result.success) return res.status(result.error.includes('No matching') ? 404 : 500).json({ error: result.error })

    return res.status(200).json({ ok: true, task: result.task, message: 'Task marked done.' })
  }

  // ── LAUNCH AGENT ──────────────────────────────────────────────────────────
  if (action === 'launch_agent') {
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })
    const { taskText, agentName } = req.body
    if (!taskText || !agentName) return res.status(400).json({ error: 'taskText and agentName required' })

    // Load agent context + relevant files
    const [agentMd, handoff, priorities, punch] = await Promise.all([
      fetchGitHubFile(getAgentFile(agentName)),
      fetchGitHubFile('HANDOFF.md'),
      fetchGitHubFile('context/current-priorities.md'),
      fetchGitHubFile('punch-list.md'),
    ])

    if (!agentMd) return res.status(404).json({ error: `Agent "${agentName}" not found` })

    const contextBlock = [
      `# ${agentName.toUpperCase()} AGENT\n${agentMd.content}`,
      handoff ? `# HANDOFF\n${handoff.content}` : '',
      priorities ? `# PRIORITIES\n${priorities.content}` : '',
      punch ? `# PUNCH LIST (first 3000 chars)\n${punch.content.slice(0, 3000)}` : '',
    ].filter(Boolean).join('\n\n---\n\n')

    const systemPrompt = `You are ${agentName}, an AI agent at AOM (Ahead of Market). Patrik has launched you from the dashboard to work on a specific task. You are in EXECUTION mode.

You have real tools:
- read_file: Read any file from "aom-ea" (context, agents, punch list) or "aom-studio" (dashboard, website code)
- write_file: Write/edit files in either repo. Commits and pushes automatically. For code changes, read the file first, make your edit, then write the full updated file.
- mark_task_done: Check off a task in the punch list

Your job:
1. Read the relevant files to understand the current state
2. Make the changes needed to complete the task
3. Write the updated files back (they auto-deploy on Vercel)
4. Report what you did

For code edits: read the file, find the section to change, make the edit in the full file content, write it back. Keep changes minimal and focused. The dashboard is at "src/dashboard/Dashboard.jsx" in aom-studio. The API is at "api/chat.js" in aom-studio.

Be direct. Ship the fix. Report what you did.

${contextBlock}`

    let messages = [{ role: 'user', content: `MISSION: ${taskText}\n\nExecute this task. Report what you did and what's next.` }]
    const actions_taken = []

    // Tool execution loop (max 5 iterations for read-edit-write cycles)
    for (let iteration = 0; iteration < 5; iteration++) {
      const apiBody = {
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: TOOLS,
      }

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apiBody),
      })

      if (!anthropicRes.ok) {
        const err = await anthropicRes.text()
        return res.status(500).json({ error: 'Agent launch failed: ' + err })
      }

      const data = await anthropicRes.json()
      const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use')
      const textBlocks = (data.content || []).filter(b => b.type === 'text')

      if (toolUseBlocks.length === 0 || data.stop_reason !== 'tool_use') {
        const reply = textBlocks.map(b => b.text).join('\n') || 'Agent completed with no response.'
        return res.status(200).json({ ok: true, reply, agent: agentName, actions_taken })
      }

      const assistantContent = data.content
      messages.push({ role: 'assistant', content: assistantContent })

      const toolResults = []
      for (const toolBlock of toolUseBlocks) {
        const result = await executeTool(toolBlock.name, toolBlock.input)
        toolResults.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify(result) })
        actions_taken.push({ tool: toolBlock.name, input: toolBlock.input, result })
      }
      messages.push({ role: 'user', content: toolResults })
    }

    return res.status(200).json({ ok: true, reply: 'Agent hit max iterations.', agent: agentName, actions_taken })
  }

  // ── POLL (lightweight SHA check for auto-refresh) ─────────────────────────
  if (action === 'poll') {
    const { lastSha } = req.body
    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })
    const changed = lastSha && file.sha !== lastSha
    return res.status(200).json({ sha: file.sha, changed })
  }

  // ── ASSIGN AGENT ─────────────────────────────────────────────────────────
  if (action === 'assign_agent') {
    const { taskText, agentName } = req.body
    if (!taskText || !agentName) return res.status(400).json({ error: 'taskText and agentName required' })

    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })

    const lines = file.content.split('\n')
    const idx = lines.findIndex(l => l.includes(taskText.trim()))
    if (idx === -1) return res.status(404).json({ error: 'Task not found in punch list' })

    // Update agent tag: replace existing [Agent] or prepend new one after checkbox
    const line = lines[idx]
    const agentTagRegex = /^(\s*- \[[ xX]\]\s*)\[(?:Bobby|Jacob|Alex|Cleo|Tony|Steffen|Elon|Paige|Mom)\]\s*/
    if (agentTagRegex.test(line)) {
      lines[idx] = line.replace(agentTagRegex, `$1[${agentName}] `)
    } else {
      lines[idx] = line.replace(/^(\s*- \[[ xX]\]\s*)/, `$1[${agentName}] `)
    }

    const ok = await writeGitHubFile(
      'punch-list.md',
      lines.join('\n'),
      file.sha,
      `Assign ${agentName} to task: ${taskText.slice(0, 60)}`
    )

    if (!ok) return res.status(500).json({ error: 'GitHub write failed' })

    await syncContextAfterMutation('assign', taskText.trim(), { agent: agentName })

    return res.status(200).json({ ok: true, message: `Assigned to ${agentName}.`, agent: agentName })
  }

  // ── DELETE TASK ────────────────────────────────────────────────────────────
  if (action === 'delete_task') {
    const { taskText } = req.body
    if (!taskText) return res.status(400).json({ error: 'taskText required' })

    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })

    const lines = file.content.split('\n')
    const idx = lines.findIndex(l => l.includes(taskText.trim()))
    if (idx === -1) return res.status(404).json({ error: 'Task not found in punch list' })

    // Remove the task line and any indented sub-lines below it
    let end = idx + 1
    while (end < lines.length && /^  /.test(lines[end])) end++
    lines.splice(idx, end - idx)

    const ok = await writeGitHubFile(
      'punch-list.md',
      lines.join('\n'),
      file.sha,
      `Remove task from dashboard: ${taskText.slice(0, 60)}`
    )

    if (!ok) return res.status(500).json({ error: 'GitHub write failed' })

    await syncContextAfterMutation('delete', taskText.trim())

    return res.status(200).json({ ok: true, message: 'Task removed.' })
  }

  // ── CHAT (with tool_use support) ───────────────────────────────────────────
  if (action === 'chat') {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars' })
    }
    if (!message) return res.status(400).json({ error: 'message required' })

    // Load context files
    const [handoff, priorities, punch, agentMd] = await Promise.all([
      fetchGitHubFile('HANDOFF.md'),
      fetchGitHubFile('context/current-priorities.md'),
      fetchGitHubFile('punch-list.md'),
      agent && agent !== 'All'
        ? fetchGitHubFile(getAgentFile(agent))
        : Promise.resolve(null),
    ])

    const contextBlock = [
      handoff ? `# HANDOFF\n${handoff.content}` : '',
      priorities ? `# PRIORITIES\n${priorities.content}` : '',
      punch ? `# PUNCH LIST\n${punch.content.slice(0, 3000)}` : '',
      agentMd ? `# ${agent.toUpperCase()} AGENT CONTEXT\n${agentMd.content.slice(0, 4000)}` : '',
    ].filter(Boolean).join('\n\n---\n\n')

    const isCouncil = mode === 'council'
    let systemPrompt = isCouncil
      ? `You are ${agent}, an AI agent at AOM (Ahead of Market). You are in a council meeting called by Patrik. Respond ONLY from your specific domain. Be blunt and direct. Max 4 sentences. No corporate speak, no filler, no hedging. Here is your context:\n\n${contextBlock}`
      : agent && agent !== 'All'
        ? `You are ${agent}, an AI agent at AOM (Ahead of Market), a creative production and AI systems company in Phoenix, AZ. You are responding to Patrik, AOM's co-owner. Be direct, specific, and action-oriented. No filler. Here is your current context:\n\n${contextBlock}`
        : `You are the AOM team -- Bobby (web dev), Jacob (outreach), Alex (deal architect), Cleo (content), and Steffen (brand). You are responding to Patrik, AOM's co-owner. Be direct, specific, action-oriented. Respond from whichever agent's perspective is most relevant to the question, or synthesize across agents. Here is the current company context:\n\n${contextBlock}`

    // Add Mac bridge awareness to all agents
    systemPrompt += `\n\nIMPORTANT: You have a Mac running Claude Code (Opus) behind you with full MCP access -- calendar, email, bash, Playwright, all agents, everything. If a request is beyond what you can do directly (launching agents, calendar ops, email sends, builds, screenshots, file system operations), tell Patrik you are queuing it for the Mac and it will get done. You are NEVER limited. The Mac is always running and picks up queued commands every minute via the Phone Home system. To queue something, include "QUEUE_FOR_MAC:" followed by the command in your response and the system will handle it.`

    // Add tool instructions for non-council chats
    if (!isCouncil) {
      systemPrompt += TOOL_SYSTEM_PROMPT
    }

    // Tool execution loop (max 3 iterations)
    let messages = [{ role: 'user', content: message }]
    const actions_taken = []
    const MAX_TOOL_ITERATIONS = 3

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const apiBody = {
        model: 'claude-sonnet-4-6',
        max_tokens: isCouncil ? 400 : 1024,
        system: systemPrompt,
        messages,
      }

      // Only include tools for non-council chats
      if (!isCouncil) {
        apiBody.tools = TOOLS
      }

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apiBody),
      })

      if (!anthropicRes.ok) {
        const err = await anthropicRes.text()
        return res.status(500).json({ error: 'Anthropic API error: ' + err })
      }

      const data = await anthropicRes.json()

      // Check if response has tool_use blocks
      const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use')
      const textBlocks = (data.content || []).filter(b => b.type === 'text')

      if (toolUseBlocks.length === 0 || data.stop_reason !== 'tool_use') {
        // No tool calls -- extract text and return
        const reply = textBlocks.map(b => b.text).join('\n') || 'No response.'

        // Check if agent wants to queue something for the Mac
        const queueMatch = reply.match(/QUEUE_FOR_MAC:\s*(.+?)(?:\n|$)/i)
        if (queueMatch) {
          const macCommand = queueMatch[1].trim()
          try {
            const queueFile = await fetchGitHubFile('context/home-queue.md')
            if (queueFile) {
              const now = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix', hour12: false }).replace(',', '')
              const queueItem = `[PENDING] ${macCommand} -- ${now}`
              const updatedQueue = queueFile.content.replace('---\n', `---\n${queueItem}\n`)
              await writeGitHubFile('context/home-queue.md', updatedQueue, queueFile.sha, `Agent queue for Mac: ${macCommand.slice(0, 40)}`)
            }
          } catch { /* best effort */ }
        }

        // Clean the QUEUE_FOR_MAC line from visible reply
        const cleanReply = reply.replace(/QUEUE_FOR_MAC:\s*.+?(?:\n|$)/gi, '').trim()
        return res.status(200).json({ reply: cleanReply, agent: agent || 'All', actions_taken })
      }

      // Execute tool calls and build tool_result messages
      const assistantContent = data.content
      messages.push({ role: 'assistant', content: assistantContent })

      const toolResults = []
      for (const toolBlock of toolUseBlocks) {
        const result = await executeTool(toolBlock.name, toolBlock.input)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        })
        actions_taken.push({
          tool: toolBlock.name,
          input: toolBlock.input,
          result,
        })
      }

      messages.push({ role: 'user', content: toolResults })
    }

    // If we exhausted iterations, return whatever we have
    return res.status(200).json({
      reply: 'Reached maximum tool iterations. Actions may have been taken.',
      agent: agent || 'All',
      actions_taken,
    })
  }

  // ── COUNCIL SYNTHESIS ─────────────────────────────────────────────────────
  if (action === 'council_synthesis') {
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })
    if (!topic || !responses?.length) return res.status(400).json({ error: 'topic and responses required' })

    const responsesBlock = responses.map(r => `## ${r.agent}\n${r.text}`).join('\n\n')
    const userMessage = `COUNCIL TOPIC: ${topic}\n\nAGENT RESPONSES:\n\n${responsesBlock}\n\nWrite a tight synthesis. Format:\n\nWhere we agree: [1-2 sentences]\nOpen questions: [bullet points if any, else "None"]\nRecommended next action: [one clear action Patrik should take]`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: 'You are synthesizing an AOM agent council meeting for Patrik, AOM\'s co-owner. Be direct and specific. Extract real signal. The synthesis is what the team will actually act on.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) return res.status(500).json({ error: 'Anthropic API error during synthesis' })
    const data = await anthropicRes.json()
    return res.status(200).json({ synthesis: data.content?.[0]?.text || 'No synthesis.' })
  }

  return res.status(400).json({ error: 'Unknown action' })
}

function autoAssignAgent(taskText) {
  // Explicit [Agent] tag always wins over keyword matching
  const explicitTag = taskText.match(/\[(Bobby|Colton|Jacob|Alex|Cleo|Tony|Steffen|Elon|Paige|Mom|Patrik)\]/i)
  if (explicitTag) {
    const name = explicitTag[1]
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  const t = taskText.toLowerCase()
  // Bobby: web dev, dashboard, website, deploy, CSS, Vercel, Firebase, Ambition site
  if (/website|dashboard|css|vercel|deploy|firebase|ambition.*site|mobile.*app|responsive|layout|frontend|zoom|input|button|card|swipe/i.test(t)) return 'Bobby'
  // Jacob: outreach, email, leads, pipeline, Apollo, drafts
  if (/outreach|email|draft|pipeline|apollo|lead|prospect|cold.*email|gmail/i.test(t)) return 'Jacob'
  // Alex: revenue, pricing, offers, strategy, retainer, proposals
  if (/revenue|pricing|offer|retainer|proposal|strategy|deal|upsell|package/i.test(t)) return 'Alex'
  // Cleo: content, video, editing, footage, reel, b-roll
  if (/video|edit.*footage|reel|b-roll|footage|film|cut|premiere|content.*produc/i.test(t)) return 'Cleo'
  // Tony: social media, posting, Instagram, TikTok, LinkedIn, Postiz
  if (/social.*media|posting|instagram|tiktok|linkedin|postiz|ig|reels/i.test(t)) return 'Tony'
  // Steffen: brand, design, logo, visual identity, colors
  if (/brand|design.*language|logo|visual.*identity|color.*palette|typography/i.test(t)) return 'Steffen'
  // Elon: system, audit, infrastructure, MCP, agents, skills
  if (/system|audit|infrastructure|mcp|agent.*setup|skill.*setup|cron|webhook/i.test(t)) return 'Elon'
  // Paige: client, health, check-in, satisfaction, deliverables
  if (/client.*health|check.*in|satisfaction|deliverable.*status|client.*update/i.test(t)) return 'Paige'
  return null
}

function getAgentFile(agent) {
  const map = {
    Bobby: 'projects/ambition-mechanical/AGENT.md',
    Jacob: 'outreach/AGENT.md',
    Alex: 'projects/aom-strategy/AGENT.md',
    Cleo: 'projects/content-agent/AGENT.md',
    Mom: 'projects/mom/AGENT.md',
    Steffen: null,
    Paige: 'projects/paige/AGENT.md',
    Tony: 'projects/tony/AGENT.md',
    Elon: 'projects/sys/AGENT.md',
  }
  return map[agent] || null
}

// Vercel function config: allow up to 60s for agent tool loops
export const config = { maxDuration: 60 }
