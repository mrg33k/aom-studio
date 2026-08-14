// POST /api/dashboard/v2-transcribe-audio
// Accepts base64 audio, sends to Gemini Flash for transcription, returns text.
// Used by telephone mode (long-form record -> transcribe -> send as message).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    await verifyTenant('aom', req);
  } catch (e) {
    if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { audio_base64, mime_type = 'audio/webm' } = req.body || {}
  if (!audio_base64) {
    return res.status(400).json({ error: 'audio_base64 required' })
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type,
                  data: audio_base64,
                },
              },
              {
                text: 'Transcribe this audio recording accurately. Return ONLY the transcription text, nothing else. No timestamps, no speaker labels, no formatting. If the audio is unclear or silent, return an empty string.',
              },
            ],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('[v2-transcribe-audio] Gemini error:', geminiRes.status, err)
      return res.status(502).json({ error: 'Transcription failed', detail: err })
    }

    const data = await geminiRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    return res.status(200).json({ text })
  } catch (err) {
    console.error('[v2-transcribe-audio] Error:', err)
    return res.status(500).json({ error: 'Transcription error' })
  }
}
