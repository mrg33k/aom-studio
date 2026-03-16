// GET /api/dashboard/agent?slug=bobby
// Returns detailed data for one agent

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
  return Buffer.from(data.content, 'base64').toString('utf-8');
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
    if (line.includes(sectionHeader)) { inSection = true; continue; }
    if (inSection && line.startsWith('## ') && !line.includes(sectionHeader)) break;
    if (!inSection) continue;
    if (line.startsWith('|') && !line.match(/^\|\s*-/)) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean);
      if (!headerCols) { headerCols = cols; continue; }
      if (cols.length >= 2 && cols[0] !== '(none)') rows.push(cols);
    }
  }
  return rows;
}

function parseSessionLog(agentMd) {
  if (!agentMd) return [];
  const entries = [];
  const lines = agentMd.split('\n');
  let inLog = false;
  let headerFound = false;

  for (const line of lines) {
    if (line.includes('Session Log') || line.includes('session log')) {
      inLog = true;
      continue;
    }
    if (inLog && line.startsWith('## ') && !line.toLowerCase().includes('session')) {
      break;
    }
    if (!inLog) continue;

    if (line.startsWith('|') && !line.match(/^\|\s*-/) && !line.match(/^\|\s*Date/i)) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean);
      if (cols.length >= 2) {
        entries.push({ date: cols[0], description: cols[1] });
      }
    }
  }
  return entries.slice(0, 15);
}

function parseLatestResult(md) {
  if (!md) return null;
  // Get first 500 chars as summary
  const lines = md.split('\n').filter(l => l.trim()).slice(0, 10);
  return lines.join('\n').slice(0, 500);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  const { slug } = req.query;
  const agent = AGENTS.find(a => a.slug === slug);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const fetchList = [
      fetchFile('context/active-missions.md'),
      fetchFile('context/current-priorities.md'),
    ];

    if (agent.folder) {
      fetchList.push(fetchFile(`projects/${agent.folder}/latest-result.md`));
      fetchList.push(fetchFile(`projects/${agent.folder}/AGENT.md`));
    } else {
      fetchList.push(Promise.resolve(null));
      fetchList.push(Promise.resolve(null));
    }

    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    fetchList.push(fetchCommits('mrg33k/AOM-EA', since));
    fetchList.push(fetchCommits('mrg33k/AMBITION', since));

    const [missionsRaw, prioritiesRaw, latestResult, agentMd, eaCommits, ambitionCommits] = await Promise.all(fetchList);

    // Parse missions
    const runningRows = parseTable(missionsRaw, '## Running');
    const completedRows = parseTable(missionsRaw, '## Recently Completed');

    const currentMission = runningRows.find(r =>
      r[0].toLowerCase() === agent.name.toLowerCase()
    );

    // Parse priority status
    const priorityRows = parseTable(prioritiesRaw, '## AGENTS -- STATUS');
    const priorityEntry = priorityRows.find(r =>
      r[0].toLowerCase() === agent.name.toLowerCase()
    );

    // Derive status
    let status = 'IDLE';
    let task = 'Standing by';
    let since_time = null;

    if (currentMission) {
      status = currentMission[3]?.toLowerCase().includes('block') ? 'BLOCKED' : 'WORKING';
      task = currentMission[1] || '';
      since_time = currentMission[2] || null;
    } else if (priorityEntry) {
      const s = (priorityEntry[1] || '').toUpperCase();
      if (s.includes('PAUSED')) status = 'PAUSED';
      else if (s.includes('BLOCKED')) status = 'BLOCKED';
      else if (s.includes('WAITING') || s.includes('QUEUED')) status = 'WAITING';
      else if (s.includes('DONE') || s.includes('COMPLETE')) status = 'DONE';
      else if (s.includes('ACTIVE') || s.includes('INCOMPLETE')) status = 'WORKING';
      task = priorityEntry[2] || '';
    }

    // Get agent-related commits
    const allCommits = [
      ...(eaCommits || []).map(c => ({ ...c, repo: 'AOM-EA' })),
      ...(ambitionCommits || []).map(c => ({ ...c, repo: 'AMBITION' })),
    ];

    const agentCommits = allCommits.filter(c => {
      const msg = (c.commit?.message || '').toLowerCase();
      return msg.includes(agent.name.toLowerCase());
    });

    const todayISO = new Date().toISOString().split('T')[0];
    const commitsToday = agentCommits.filter(c =>
      (c.commit?.author?.date || '').startsWith(todayISO)
    );

    // Build activity log
    const activityLog = [];

    // Add commits
    for (const c of agentCommits.slice(0, 10)) {
      activityLog.push({
        time: c.commit?.author?.date,
        description: `Committed: ${(c.commit?.message || '').split('\n')[0].slice(0, 100)} (${(c.sha || '').slice(0, 7)})`,
        type: 'commit',
        url: c.html_url,
      });
    }

    // Add session log entries from AGENT.md
    const sessionLog = parseSessionLog(agentMd);
    for (const entry of sessionLog) {
      activityLog.push({
        time: entry.date,
        description: entry.description,
        type: 'session',
      });
    }

    // Sort by time (newest first)
    activityLog.sort((a, b) => {
      const da = new Date(a.time || '1970-01-01');
      const db = new Date(b.time || '1970-01-01');
      return db - da;
    });

    // Recent completions
    const recentCompletions = completedRows
      .filter(r => r[0].toLowerCase() === agent.name.toLowerCase())
      .map(r => ({
        date: r[3] || '',
        description: r[1] || '',
        result: r[4] || '',
      }))
      .slice(0, 5);

    // Files touched (from latest commit)
    const activeFiles = [];
    if (agentCommits.length > 0 && agentCommits[0].sha) {
      try {
        const commitRes = await fetch(
          `https://api.github.com/repos/mrg33k/AOM-EA/commits/${agentCommits[0].sha}`,
          { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
        );
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          for (const file of (commitData.files || []).slice(0, 10)) {
            activeFiles.push({
              path: file.filename,
              status: file.status,
            });
          }
        }
      } catch (e) { /* ignore */ }
    }

    res.status(200).json({
      agent: {
        slug: agent.slug,
        name: agent.name,
        role: agent.role,
        status,
        currentMission: currentMission ? {
          description: currentMission[1],
          launched: currentMission[2],
          status: currentMission[3],
        } : null,
        vitals: {
          status,
          since: since_time,
          filesTouchedToday: commitsToday.reduce((acc, c) => acc + ((c.stats?.total) || 1), 0),
          commitsToday: commitsToday.length,
        },
        currentTask: task,
        activityLog: activityLog.slice(0, 20),
        recentCompletions,
        activeFiles,
        latestResult: parseLatestResult(latestResult),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Agent detail error:', err);
    res.status(500).json({ error: 'Failed to fetch agent data', message: err.message });
  }
}
