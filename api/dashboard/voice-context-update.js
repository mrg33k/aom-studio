// POST /api/dashboard/voice-context-update
// Thin proxy: voice chat calls this to update project CONTEXT.md on disk via RAG server.
// Body: { slug, section, content, action }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { slug, section, content, action = 'append' } = req.body || {};
  if (!slug || !section || !content) {
    return res.status(400).json({ error: 'slug, section, and content required' });
  }

  const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';

  try {
    const ragResp = await fetch(`${RAG_URL}/update-project-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, section, content, action }),
      signal: AbortSignal.timeout(5000),
    });

    if (ragResp.ok) {
      const result = await ragResp.json();
      return res.status(200).json(result);
    }

    // Preserve the RAG server's own error text so the client can surface the
    // real reason (permission denied, invalid section, etc.) instead of a
    // generic status code.
    let detail = '';
    try {
      const body = await ragResp.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          detail = parsed.error || parsed.message || body;
        } catch {
          detail = body;
        }
      }
    } catch {}

    return res.status(ragResp.status).json({
      error: `RAG server returned ${ragResp.status}${detail ? `: ${detail}` : ''}`,
    });
  } catch (err) {
    // Classify fetch-level failures (timeout, DNS, refused) so the client
    // toast tells the user what went wrong rather than just "Failed".
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    const reason = isTimeout
      ? `RAG server did not respond within 5s (${err.name})`
      : err.message || String(err);
    return res.status(502).json({ error: reason });
  }
}
