// POST /api/dashboard/image-gen
//
// Routes a prompt to one of three image-gen providers and returns the result
// as a URL or base64 payload. Called from the composer when ImageGenPicker has
// pinned a tool (see src/dashboard/components/cv3/shared/ImageGenPicker.jsx
// and src/dashboard/components/cv3/chat/useChatSend.js → runImageGen).
//
// Body: { tool: 'gemini'|'ideogram'|'openai', prompt, agent?, project?, client_id?, user_id?, user_name? }
// Returns: { url?, b64?, tool, prompt }  on success
//          { error: string } on failure (HTTP 4xx/5xx)
//
// Env vars (set in Vercel or local .env):
//   OPENAI_API_KEY    — gpt-image-1.5
//   GEMINI_API_KEY    — Imagen via Google Generative Language API
//   IDEOGRAM_API_KEY  — Ideogram 3.0

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;

async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) return { error: 'OPENAI_API_KEY not set' };
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1.5',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { error: data?.error?.message || `OpenAI HTTP ${resp.status}` };
  const item = data?.data?.[0];
  if (!item) return { error: 'OpenAI returned no image' };
  return item.b64_json ? { b64: item.b64_json } : item.url ? { url: item.url } : { error: 'No b64 or url in OpenAI response' };
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return { error: 'GEMINI_API_KEY not set' };
  const model = 'imagen-4.0-fast-generate-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { error: data?.error?.message || `Gemini HTTP ${resp.status}` };
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return { error: 'Gemini returned no image bytes' };
  return { b64 };
}

async function callIdeogram(prompt) {
  if (!IDEOGRAM_API_KEY) return { error: 'IDEOGRAM_API_KEY not set' };
  // Ideogram 3.0 expects multipart/form-data on /v1/ideogram-v3/generate.
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('rendering_speed', 'DEFAULT');
  form.append('aspect_ratio', '1x1');
  const resp = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
    method: 'POST',
    headers: { 'Api-Key': IDEOGRAM_API_KEY },
    body: form,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { error: data?.error || `Ideogram HTTP ${resp.status}` };
  const item = data?.data?.[0];
  if (!item?.url) return { error: 'Ideogram returned no image URL' };
  return { url: item.url };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Image generation spends provider credits. CORS and an outbound provider
  // bearer token are not caller authorization; require the same verified tenant
  // session as every other dashboard action before validating or executing a job.
  const _imageGenClient = req.body?.client_id ? String(req.body.client_id).trim() : '';
  if (!_imageGenClient) return res.status(401).json({ error: 'Missing client' });
  try {
    await verifyTenant(_imageGenClient, req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(401).json({ error: 'authentication required' });
  }

  const { tool, prompt } = req.body || {};
  if (!tool || !prompt) {
    return res.status(400).json({ error: 'tool and prompt are required' });
  }
  if (typeof prompt !== 'string' || prompt.length > 4000) {
    return res.status(400).json({ error: 'prompt must be a string under 4000 chars' });
  }

  try {
    let result;
    if (tool === 'openai') result = await callOpenAI(prompt);
    else if (tool === 'gemini') result = await callGemini(prompt);
    else if (tool === 'ideogram') result = await callIdeogram(prompt);
    else return res.status(400).json({ error: `Unknown tool: ${tool}` });

    if (result?.error) {
      return res.status(502).json({ error: result.error, tool });
    }
    return res.status(200).json({ ...result, tool, prompt });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error', tool });
  }
}
