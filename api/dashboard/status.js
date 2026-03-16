// GET /api/dashboard/status
// Returns all agent statuses, throughput, blockers, and pipeline feed

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
const REPO = 'mrg33k/AOM-EA';
const BRANCH = 'master';

const AGENTS = [
  { slug: 'bobby', name: 'Bobby', role: 'Web Dev', folder: 'bobby' },
  { slug: 'colton', name: 'Colton', role: 'Backup Builder', folder: 'colton' },
  { slug: 'elmo', name: 'Elmo', role: 'QA Gate', folder: null },
  { slug: 'steffen', name: 'Steffen', role: 'Creative Director', folder: 'steffen' },
  { slug: 'jacob', name: 'Jacob', role: 'Outreach', folder: 'jacob' },
  { slug: 'elon', name: 'Elon', role: 'Systems', folder: 'sys' },
  { slug: 'alex', name: 'Alex', role: 'Strategy', folder: 'aom-strategy' },
  { slug: 'steve', name: 'Steve', role: 'AI Advisory', folder: 'steve' },
  { slug: 'cleo', name: 'Cleo', role: 'Content', folder: 'content-agent' },
  { slug: 'tony', name: 'Tony', role: 'Social Media', folder: 'tony' },
  { slug: 'paige', name: 'Paige', role: 'Client Success', folder: 'paige' },
  { slug: 'pixel', name: 'Pixel', role: 'Extension', folder: 'pixel' },
  { slug: 'mom', name: 'Mom', role: 'Orchestrator', folder: 'mom' },
];

async function fetchFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const raw = Buffer.from(data.content, 'base64').toString('utf-8');
  return raw;
}

async function fetchCommits(repo, since) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?since=${since}&per_page=50`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return [];
  return await res.json();
}

function parseTable(md, sectionHeader) {
  if (!md) return [];
  const lines = md.split('\n');
  let inSection = false;
  const rows = [];
  let headerCols = null;

  for (const line of lines) {
    if (line.includes(sectionHeader)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ') && !line.includes(sectionHeader)) {
      break;
    }
    if (!inSection) continue;

    if (line.startsWith('|') && !line.match(/^\|\s*-/)) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean);
      if (!headerCols) {
        headerCols = cols;
        continue;
      }
      if (cols.length >= 2 && cols[0] !== '(none)') {
        rows.push(cols);
      }
    }
  }
  return rows;
}

function parseMissions(md) {
  const running = [];
  const completed = [];

  const runningRows = parseTable(md, '## Running');
  for (const cols of runningRows) {
    running.push({
      agent: cols[0],
      mission: cols[1] || '',
      launched: cols[2] || '',
      status: cols[3] || 'Running',
    });
  }

  const completedRows = parseTable(md, '## Recently Completed');
  for (const cols of completedRows) {
    completed.push({
      agent: cols[0],
      mission: cols[1] || '',
      launched: cols[2] || '',
      completed: cols[3] || '',
      result: cols[4] || '',
    });
  }

  return { running, completed };
}

function parsePriorities(md) {
  const agentTable = [];
  const rows = parseTable(md, '## AGENTS -- STATUS');
  for (const cols of rows) {
    agentTable.push({
      agent: cols[0],
      status: cols[1] || '',
      whatsNext: cols[2] || '',
    });
  }

  // Scan for blockers
  const blockers = [];
  if (md) {
    const lines = md.split('\n');
    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('## ')) currentSection = line.replace('## ', '').trim();
      if (/BLOCKED|blocking|needs approval|waiting on Patrik/i.test(line) && !line.startsWith('|') && line.trim().length > 10) {
        const clean = line.replace(/^[\s*\-\d.]+/, '').trim();
        if (clean.length > 5) {
          blockers.push({ description: clean, source: currentSection });
        }
      }
    }
  }

  return { agentTable, blockers };
}

function deriveAgentStatus(agentName, missions, priorities) {
  const running = missions.running.find(m =>
    m.agent.toLowerCase() === agentName.toLowerCase()
  );
  if (running) {
    if (running.status.toLowerCase().includes('block')) return { status: 'BLOCKED', task: running.mission, since: running.launched };
    return { status: 'WORKING', task: running.mission, since: running.launched };
  }

  const priorityStatus = priorities.agentTable.find(a =>
    a.agent.toLowerCase() === agentName.toLowerCase()
  );
  if (priorityStatus) {
    const s = priorityStatus.status.toUpperCase();
    let status = 'IDLE';
    if (s.includes('PAUSED')) status = 'PAUSED';
    else if (s.includes('BLOCKED')) status = 'BLOCKED';
    else if (s.includes('WAITING')) status = 'WAITING';
    else if (s.includes('DONE') || s.includes('COMPLETE')) status = 'DONE';
    else if (s.includes('ACTIVE')) status = 'WORKING';
    else if (s.includes('QUEUED')) status = 'WAITING';
    else if (s.includes('IDLE')) status = 'IDLE';
    else if (s.includes('INCOMPLETE')) status = 'WORKING';
    return { status, task: priorityStatus.whatsNext, since: null };
  }

  const today = new Date().toISOString().split('T')[0];
  const completedToday = missions.completed.find(m =>
    m.agent.toLowerCase() === agentName.toLowerCase() &&
    m.completed && m.completed.includes(today)
  );
  if (completedToday) return { status: 'DONE', task: completedToday.mission, since: null };

  return { status: 'IDLE', task: 'Standing by', since: null };
}

function attributeCommitToAgent(message) {
  const agentNames = AGENTS.map(a => a.name.toLowerCase());
  const msgLower = message.toLowerCase();

  // Check if message starts with agent name followed by colon or space
  for (const agent of AGENTS) {
    const name = agent.name.toLowerCase();
    if (msgLower.startsWith(name + ':') || msgLower.startsWith(name + ' ')) {
      return agent.slug;
    }
  }

  // Fallback: search entire message
  for (const agent of AGENTS) {
    if (msgLower.includes(agent.name.toLowerCase())) {
      return agent.slug;
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  try {
    const [missionsRaw, prioritiesRaw, eaCommits, ambitionCommits] = await Promise.all([
      fetchFile('context/active-missions.md'),
      fetchFile('context/current-priorities.md'),
      fetchCommits('mrg33k/AOM-EA', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      fetchCommits('mrg33k/AMBITION', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const missions = parseMissions(missionsRaw);
    const priorities = parsePriorities(prioritiesRaw);

    // Build agent list with statuses
    const agents = AGENTS.map(agent => {
      const derived = deriveAgentStatus(agent.name, missions, priorities);
      const lastCompletion = missions.completed.find(m =>
        m.agent.toLowerCase() === agent.name.toLowerCase()
      );

      return {
        slug: agent.slug,
        name: agent.name,
        role: agent.role,
        status: derived.status,
        currentTask: derived.task,
        timeActive: derived.since || null,
        lastCompletion: lastCompletion ? {
          date: lastCompletion.completed,
          description: lastCompletion.mission,
          result: lastCompletion.result,
        } : null,
      };
    });

    // Throughput
    const throughput = {
      working: agents.filter(a => a.status === 'WORKING').length,
      idle: agents.filter(a => a.status === 'IDLE').length,
      blocked: agents.filter(a => a.status === 'BLOCKED').length,
      doneToday: agents.filter(a => a.status === 'DONE').length,
      paused: agents.filter(a => a.status === 'PAUSED').length,
      waiting: agents.filter(a => a.status === 'WAITING').length,
      commitsToday: (eaCommits || []).length + (ambitionCommits || []).length,
    };

    // Pipeline feed from commits
    const allCommits = [
      ...(eaCommits || []).map(c => ({ ...c, repo: 'AOM-EA' })),
      ...(ambitionCommits || []).map(c => ({ ...c, repo: 'AMBITION' })),
    ].sort((a, b) => new Date(b.commit?.author?.date || 0) - new Date(a.commit?.author?.date || 0)).slice(0, 20);

    const pipelineFeed = allCommits.map(c => ({
      time: c.commit?.author?.date,
      agent: attributeCommitToAgent(c.commit?.message || ''),
      description: (c.commit?.message || '').split('\n')[0].slice(0, 120),
      commitHash: (c.sha || '').slice(0, 7),
      commitUrl: c.html_url,
      repo: c.repo,
    }));

    // Blockers with agent attribution
    const blockers = priorities.blockers.map(b => {
      let agent = null;
      for (const a of AGENTS) {
        if (b.description.toLowerCase().includes(a.name.toLowerCase())) {
          agent = a.name;
          break;
        }
      }
      return { ...b, agent };
    }).filter(b => b.description.length > 10);

    res.status(200).json({
      agents,
      throughput,
      blockers: blockers.slice(0, 10),
      pipelineFeed,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Dashboard status error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data', message: err.message });
  }
}
