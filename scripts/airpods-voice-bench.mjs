#!/usr/bin/env node
// Corner voice bench — corner:airpods-mode
//
// Transport lifted from scripts/airpods-conversation-gauntlet.mjs (Codex, 2026-08-09),
// with three changes that matter:
//   1. agent = 'corner'  — the gauntlet opened sessions as 'rex'. The real AirPods
//      client mounts VoiceChat with agentSlug="corner", so the gauntlet was tuning
//      a different identity, a different tape and a different room history than
//      the product Patrik actually talks to.
//   2. scenarios are data, not a ternary — depth / carry / throughput added.
//   3. it MEASURES instead of asserting brevity. No pass/fail on word count here;
//      the scorer is separate so a baseline can be taken without the old caps
//      deciding the answer in advance.

import crypto from 'node:crypto';
import fs from 'node:fs';

const baseUrl = String(process.env.CORNER_BASE_URL || 'https://www.aheadofmarket.com').replace(/\/$/, '');
const jwt = String(process.env.CORNER_QA_JWT || '').trim();
if (!jwt) throw new Error('CORNER_QA_JWT is required');

const AGENT = process.env.BENCH_AGENT || 'corner';
const MODE = process.env.BENCH_MODE || 'airpods';
const LABEL = process.env.BENCH_LABEL || 'baseline';

const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${data.error || 'unknown error'}`);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENARIOS = {
  // --- regression: the two Codex already tuned against -----------------------
  core: [
    "What's the latest?",
    'Why did the outreach task fail?',
    'So what was the actual failure reason?',
    'Did we submit Corner to the App Store?',
    "That's all. End the conversation.",
  ],
  skeptical: [
    'Did we submit Corner to the App Store?',
    'What did you actually check just now?',
    "Don't guess. What is still unverified?",
    'Do not do it yet. What is the single best next step you can actually take?',
    "That's all. End the conversation.",
  ],
  // --- new: the criteria Patrik asked for ------------------------------------
  // DEPTH — does it reason when reasoning is what was asked for?
  depth: [
    "What's the latest?",
    'Why is that the top one?',
    'Walk me through what actually has to happen to clear it.',
    'If you were me, what would you do first, and why not the other one?',
    "That's all. End the conversation.",
  ],
  // CARRY — can it hold a referent across turns without being re-told?
  carry: [
    'Which rooms have something waiting on me?',
    'Tell me more about the first one.',
    "Who's working that one?",
    'What is actually blocking it right now?',
    'Is that the same thing you mentioned at the start of this call?',
    "That's all. End the conversation.",
  ],
  // THROUGHPUT — can one spoken arc move a room forward and come back with a receipt?
  throughput: [
    'Open the outreach room.',
    "What's the state of it?",
    'Queue a task in there titled "Voice bench test - ignore" to re-check the outreach feedback step.',
    'Did that land? Give me the task id.',
    'Close that room.',
    "That's all. End the conversation.",
  ],
};

const scenarioName = String(process.env.BENCH_SCENARIO || 'depth').trim().toLowerCase();
const prompts = SCENARIOS[scenarioName];
if (!prompts) throw new Error(`unknown scenario: ${scenarioName}. have: ${Object.keys(SCENARIOS).join(', ')}`);


// Invoke any API handler from the local checkout with production env.
let __env = null;
async function localApi(api, body) {
  const root = process.env.BENCH_LOCAL_ROOT;
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  if (!__env) {
    __env = { ...process.env };
    for (const line of fs.readFileSync(`${root}/.env.prod`, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)="?([\s\S]*?)"?$/);
      if (m) __env[m[1]] = m[2];
    }
  }
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [new URL('./airpods-local-invoke.mjs', import.meta.url).pathname, root, api, JSON.stringify(body)],
    { env: __env, maxBuffer: 20 * 1024 * 1024 }
  );
  return JSON.parse(stdout);
}

// BENCH_LOCAL_ROOT points at a checkout whose voice-session.js should be used
// instead of the deployed one. Tools still execute against production, so the
// tuned prompt is measured against real workspace state and real receipts.
async function mintConfig(sessionId) {
  const body = { client_id: 'aom', agent: AGENT, mode: MODE, session_id: sessionId };
  const root = process.env.BENCH_LOCAL_ROOT;
  if (!root) return post('/api/dashboard/voice-session', body);

  const { statusCode, payload } = await localApi('api/dashboard/voice-session.js', body);
  if (statusCode !== 200) throw new Error(`local voice-session returned ${statusCode}: ${payload?.error}`);
  // Real credential from production, tuned setup from the local checkout.
  const live = await post('/api/dashboard/voice-session', body);
  return { ...payload, wsUrl: live.wsUrl };
}

async function openConversation() {
  const sessionId = crypto.randomUUID();
  const config = await mintConfig(sessionId);
  const socket = new WebSocket(config.wsUrl);
  let activeTurn = null;
  let setupResolve, setupReject;
  const ready = new Promise((res, rej) => { setupResolve = res; setupReject = rej; });

  const finishTurn = async () => {
    if (!activeTurn || activeTurn.finished) return;
    activeTurn.finished = true;
    await sleep(180);
    const done = activeTurn;
    activeTurn = null;
    // The session emits BOTH an audio transcript and (sometimes) text parts for
    // the same utterance. Summing them double-counts and inflates every word
    // measurement, which is exactly the number this bench exists to trust.
    // The audio transcript is what Patrik actually hears, so it wins.
    done.resolve({
      user: done.user,
      assistant: (done.transcript || done.text).trim(),
      spoken_and_text_differ: Boolean(done.transcript && done.text && done.transcript.trim() !== done.text.trim()),
      tools: done.tools,
      ms: Date.now() - done.startedAt,
      firstMs: done.firstMs || null,
    });
  };

  const executeTool = async (call) => {
    const args = call.args || {};
    if (call.name === 'offer_next_action') {
      return { ok: true, offered: true, spoken_summary: `I can ${args.title || 'take the next step'}.` };
    }
    const actionBody = { client_id: 'aom', session_id: sessionId, action: call.name, arguments: args };
    let result;
    if (process.env.BENCH_LOCAL_ROOT) {
      const r = await localApi('api/dashboard/airpods-action.js', actionBody);
      if (r.statusCode !== 200) throw new Error(`local airpods-action ${r.statusCode}: ${r.payload?.error}`);
      result = r.payload;
    } else {
      result = await post('/api/dashboard/airpods-action', actionBody);
    }
    if (result.ui_effect) {
      return {
        ...result,
        navigation_acknowledged: true,
        navigation_receipt: { ok: true, target: result.ui_effect.type, request_id: result.ui_effect.request_id },
      };
    }
    return result;
  };

  socket.addEventListener('open', () => socket.send(JSON.stringify(config.setupMessage)));
  socket.addEventListener('error', () => {
    const e = new Error('Gemini WebSocket failed');
    setupReject(e); activeTurn?.reject(e);
  });
  socket.addEventListener('close', (ev) => {
    const e = new Error(`socket closed ${ev.code} ${ev.reason || ''}`.trim());
    setupReject(e);
    if (activeTurn && !activeTurn.finished) { activeTurn.reject(e); activeTurn = null; }
  });
  socket.addEventListener('message', async (event) => {
    try {
      const raw = typeof event.data === 'string'
        ? event.data
        : Buffer.from(await event.data.arrayBuffer()).toString('utf8');
      const message = JSON.parse(raw);
      if (message.setupComplete !== undefined) return setupResolve();
      if (message.error) throw new Error(message.error.message || JSON.stringify(message.error));
      if (message.goAway) { activeTurn && (activeTurn.goAway = true); return; }
      if (message.toolCall) {
        const calls = message.toolCall.functionCalls || [];
        const responses = [];
        for (const call of calls) {
          let result;
          try { result = await executeTool(call); }
          catch (error) { result = { ok: false, error: error.message }; }
          activeTurn?.tools.push({ name: call.name, args: call.args || {}, ok: result?.ok !== false });
          responses.push({ id: call.id, name: call.name, response: result });
        }
        socket.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
        if (calls.some((c) => c.name === 'end_voice_session')) { await sleep(350); await finishTurn(); }
        return;
      }
      const content = message.serverContent;
      if (!content || !activeTurn) return;
      if (content.outputTranscription?.text) { if (!activeTurn.firstMs) activeTurn.firstMs = Date.now() - activeTurn.startedAt; activeTurn.transcript += content.outputTranscription.text; }
      for (const part of content.modelTurn?.parts || []) if (part.text) activeTurn.text += part.text;
      if (content.turnComplete) await finishTurn();
    } catch (error) {
      activeTurn?.reject(error);
      activeTurn = null;
    }
  });

  await Promise.race([ready, sleep(20_000).then(() => { throw new Error('Gemini setup timed out'); })]);

  const turn = (user) => new Promise((resolve, reject) => {
    if (activeTurn) return reject(new Error('Previous turn is still active'));
    activeTurn = { user, transcript: '', text: '', tools: [], resolve, reject, finished: false, startedAt: Date.now() };
    socket.send(JSON.stringify({
      clientContent: { turns: [{ role: 'user', parts: [{ text: user }] }], turnComplete: true },
    }));
    setTimeout(() => {
      if (activeTurn?.user === user) { activeTurn.reject(new Error(`Turn timed out: ${user}`)); activeTurn = null; }
    }, 45_000).unref();
  });

  return { sessionId, turn, close: () => socket.close(), config };
}

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const questions = (s) => (String(s || '').match(/\?/g) || []).length;

const conversation = await openConversation();
const turns = [];
let fatal = null;
try {
  for (const p of prompts) {
    try { turns.push(await conversation.turn(p)); }
    catch (e) { turns.push({ user: p, assistant: '', tools: [], ms: 0, error: e.message }); fatal = e.message; break; }
  }
} finally {
  conversation.close();
}

const out = {
  label: LABEL,
  scenario: scenarioName,
  agent: AGENT,
  mode: MODE,
  model: conversation.config?.model,
  session_id: conversation.sessionId,
  fatal,
  measurements: {
    turn_words: turns.map((t) => words(t.assistant)),
    mean_words: Math.round(turns.reduce((a, t) => a + words(t.assistant), 0) / Math.max(1, turns.length)),
    max_words: Math.max(0, ...turns.map((t) => words(t.assistant))),
    questions_asked: turns.reduce((a, t) => a + questions(t.assistant), 0),
    tool_calls: turns.reduce((a, t) => a + t.tools.length, 0),
    turn_latency_ms: turns.map((t) => t.ms),
    first_word_ms: turns.map((t) => t.firstMs),
  },
  turns: turns.map((t) => ({
    user: t.user,
    assistant: t.assistant,
    words: words(t.assistant),
    tools: t.tools.map((x) => x.name),
    ms: t.ms,
    firstMs: t.firstMs,
    ...(t.error ? { error: t.error } : {}),
  })),
};

const file = `bench-${LABEL}-${scenarioName}.json`;
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, turns: undefined }, null, 2));
console.log(`\n--- transcript (${file}) ---`);
for (const t of out.turns) {
  console.log(`\nYOU: ${t.user}`);
  console.log(`CORNER (${t.words}w, ${t.firstMs||'?'}ms→${t.ms}ms${t.tools.length ? ', tools: ' + t.tools.join(',') : ''}): ${t.assistant || '(nothing)'}`);
  if (t.error) console.log(`  !! ${t.error}`);
}
