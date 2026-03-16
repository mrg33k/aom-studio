// GET /api/dashboard/commits
// Returns recent commits from both AOM-EA and AMBITION repos

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;

const AGENTS = [
  'bobby', 'colton', 'elmo', 'steffen', 'jacob', 'elon',
  'alex', 'steve', 'cleo', 'tony', 'paige', 'pixel', 'mom',
];

function attributeAgent(message) {
  const msgLower = (message || '').toLowerCase();
  for (const name of AGENTS) {
    if (msgLower.startsWith(name + ':') || msgLower.startsWith(name + ' ')) return name;
  }
  for (const name of AGENTS) {
    if (msgLower.includes(name)) return name;
  }
  return null;
}

async function fetchCommits(repo, since) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?since=${since}&per_page=50`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return [];
  return await res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const [eaCommits, ambitionCommits] = await Promise.all([
      fetchCommits('mrg33k/AOM-EA', since),
      fetchCommits('mrg33k/AMBITION', since),
    ]);

    const commits = [
      ...(eaCommits || []).map(c => ({
        sha: (c.sha || '').slice(0, 7),
        message: (c.commit?.message || '').split('\n')[0],
        repo: 'AOM-EA',
        date: c.commit?.author?.date,
        url: c.html_url,
        agent: attributeAgent(c.commit?.message),
        author: c.commit?.author?.name,
      })),
      ...(ambitionCommits || []).map(c => ({
        sha: (c.sha || '').slice(0, 7),
        message: (c.commit?.message || '').split('\n')[0],
        repo: 'AMBITION',
        date: c.commit?.author?.date,
        url: c.html_url,
        agent: attributeAgent(c.commit?.message),
        author: c.commit?.author?.name,
      })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.status(200).json({ commits: commits.slice(0, 50) });
  } catch (err) {
    console.error('Commits error:', err);
    res.status(500).json({ error: 'Failed to fetch commits', message: err.message });
  }
}
