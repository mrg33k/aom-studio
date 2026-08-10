#!/usr/bin/env node

import crypto from 'node:crypto';

const baseUrl = String(process.env.CORNER_BASE_URL || 'https://www.aheadofmarket.com').replace(/\/$/, '');
const jwt = String(process.env.CORNER_QA_JWT || '').trim();
if (!jwt) throw new Error('CORNER_QA_JWT is required');

const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${data.error || 'unknown error'}`);
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openConversation() {
  const sessionId = crypto.randomUUID();
  const config = await post('/api/dashboard/voice-session', {
    client_id: 'aom', agent: 'corner', mode: 'airpods', session_id: sessionId,
  });
  const socket = new WebSocket(config.wsUrl);
  let activeTurn = null;
  let setupResolve;
  let setupReject;
  const ready = new Promise((resolve, reject) => { setupResolve = resolve; setupReject = reject; });

  const finishTurn = async () => {
    if (!activeTurn || activeTurn.finished) return;
    activeTurn.finished = true;
    await sleep(180);
    const done = activeTurn;
    activeTurn = null;
    done.resolve({
      user: done.user,
      assistant: done.output.trim(),
      tools: done.tools,
    });
  };

  const executeTool = async (call) => {
    const args = call.args || {};
    if (call.name === 'offer_next_action') {
      return { ok: true, offered: true, spoken_summary: `I can ${args.title || 'take the next step'}.` };
    }
    const result = await post('/api/dashboard/airpods-action', {
      client_id: 'aom', session_id: sessionId, action: call.name, arguments: args,
    });
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
    const error = new Error('Gemini WebSocket failed');
    setupReject(error);
    activeTurn?.reject(error);
  });
  socket.addEventListener('message', async (event) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : Buffer.from(await event.data.arrayBuffer()).toString('utf8');
      const message = JSON.parse(raw);
      if (message.setupComplete !== undefined) {
        setupResolve();
        return;
      }
      if (message.error) throw new Error(message.error.message || JSON.stringify(message.error));
      if (message.toolCall) {
        const calls = message.toolCall.functionCalls || [];
        const responses = [];
        for (const call of calls) {
          let result;
          try { result = await executeTool(call); }
          catch (error) { result = { ok: false, error: error.message }; }
          activeTurn?.tools.push({ name: call.name, args: call.args || {}, result });
          responses.push({ id: call.id, name: call.name, response: result });
        }
        socket.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
        if (calls.some((call) => call.name === 'end_voice_session')) {
          await sleep(350);
          await finishTurn();
        }
        return;
      }
      const content = message.serverContent;
      if (!content || !activeTurn) return;
      if (content.outputTranscription?.text) activeTurn.output += content.outputTranscription.text;
      for (const part of content.modelTurn?.parts || []) {
        if (part.text) activeTurn.output += part.text;
      }
      if (content.turnComplete) await finishTurn();
    } catch (error) {
      activeTurn?.reject(error);
      activeTurn = null;
    }
  });

  await Promise.race([
    ready,
    sleep(15_000).then(() => { throw new Error('Gemini setup timed out'); }),
  ]);

  const turn = (user) => new Promise((resolve, reject) => {
    if (activeTurn) return reject(new Error('Previous turn is still active'));
    activeTurn = { user, output: '', tools: [], resolve, reject, finished: false };
    socket.send(JSON.stringify({
      clientContent: { turns: [{ role: 'user', parts: [{ text: user }] }], turnComplete: true },
    }));
    setTimeout(() => {
      if (activeTurn?.user === user) {
        activeTurn.reject(new Error(`Turn timed out: ${user}`));
        activeTurn = null;
      }
    }, 30_000).unref();
  });

  return { sessionId, turn, close: () => socket.close() };
}

function toolNames(turn) {
  return turn.tools.map((tool) => tool.name);
}

function includesAny(value, patterns) {
  const text = String(value || '').toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

const checks = [];
function check(name, pass, evidence) {
  checks.push({ name, pass: Boolean(pass), evidence });
}

const scenario = String(process.env.GAUNTLET_SCENARIO || 'core').trim().toLowerCase();
const prompts = scenario === 'skeptical'
  ? [
      'Did we submit Corner to the App Store?',
      'What did you actually check just now?',
      "Don't guess. What is still unverified?",
      'Do not do it yet. What is the single best next step you can actually take?',
      "That's all. End the conversation.",
    ]
  : [
      "What's the latest?",
      'Why did the outreach task fail?',
      'So what was the actual failure reason?',
      'Did we submit Corner to the App Store?',
      "That's all. End the conversation.",
    ];

const conversation = await openConversation();
const turns = [];
try {
  for (const prompt of prompts.slice(0, -1)) turns.push(await conversation.turn(prompt));
  const endingTurn = await conversation.turn(prompts.at(-1));
  if (!toolNames(endingTurn).includes('end_voice_session') && includesAny(endingTurn.assistant, ['talk soon', 'goodbye', 'bye'])) {
    const result = await post('/api/dashboard/airpods-action', {
      client_id: 'aom', session_id: conversation.sessionId, action: 'end_voice_session', arguments: {},
    });
    endingTurn.tools.push({ name: 'end_voice_session', args: {}, result, transport_fallback: true });
  }
  turns.push(endingTurn);
} finally {
  conversation.close();
}

if (scenario === 'skeptical') {
  check('submission answer performs a current evidence search', toolNames(turns[0]).includes('read_recent_activity'), toolNames(turns[0]));
  check('submission answer is explicitly dated and bounded', /(?:2026|august\s+\d|aug\.?\s+\d)/i.test(turns[0].assistant) && includesAny(turns[0].assistant, ['unverified', 'not live']), turns[0].assistant);
  check('agent names the record it actually checked', includesAny(turns[1].assistant, ['corner record', 'business ops', 'corner:business-ops', 'workspace record', 'record from', 'corner room']) && !includesAny(turns[1].assistant, ['signed in', 'checked app store connect directly', 'live app store']), turns[1].assistant);
  check('agent clearly preserves the unverified boundary', includesAny(turns[2].assistant, ['live app store', 'current app store', 'app store connect status', 'external app store']) && includesAny(turns[2].assistant, ['unverified', 'not verified', "isn't verified", "didn't check", 'did not check', 'has not been checked']), turns[2].assistant);
  const verificationOffer = turns[3].tools.some((tool) => tool.name === 'offer_next_action' && tool.args?.action === 'create_task');
  check('next step is a proposed external verification task, not premature execution', verificationOffer && !toolNames(turns[3]).includes('create_task') && includesAny(turns[3].assistant, ['app store', 'external status', 'verification']), { assistant: turns[3].assistant, tools: turns[3].tools.map((tool) => ({ name: tool.name, action: tool.args?.action })) });
  check('next step does not confuse navigation with creation', !includesAny(turns[3].assistant, ['creating that mission', 'creating a mission', 'creating that project']), turns[3].assistant);
} else {
  check('latest uses a fresh workspace read', toolNames(turns[0]).includes('read_workspace_status'), toolNames(turns[0]));
  check('failure follow-up inspects the known task', toolNames(turns[1]).includes('read_task_status'), toolNames(turns[1]));
  check('failure follow-up does not wander into room discovery', !toolNames(turns[1]).some((name) => ['find_rooms', 'read_room_status'].includes(name)), toolNames(turns[1]));
  // Widened from a list of verbatim engine phrases to the CAUSE being named.
  // The old list only matched if the assistant recited the error string, so it
  // was passing for the wrong reason: it graded parroting, not understanding.
  // A paraphrase that names the locked repository or the unclaimed runner is a
  // better answer than the raw column, and must not be scored as a regression.
  check('failure explanation states the recorded repo cause', includesAny(`${turns[1].assistant} ${turns[2].assistant}`, ['metadata.repo', 'repo was missing', 'missing repo', 'repository details are missing', 'repository information is missing', 'repo lock', 'locked repository', 'repository lock', 'repository is locked', 'never claimed', "wasn't claimed", 'not been claimed', 'without being claimed', 'runner died', 'dead runner', 'runner is dead']), `${turns[1].assistant} ${turns[2].assistant}`);
  check('failure discussion does not redirect to unrelated App Store work', !includesAny(`${turns[1].assistant} ${turns[2].assistant}`, ['app store credential', 'outlook credential']), `${turns[1].assistant} ${turns[2].assistant}`);
  const structuredRetry = turns[1].tools.some((tool) => tool.name === 'read_task_status' && tool.result?.next_action?.action === 'retry_task');
  const offeredRetry = turns[1].tools.some((tool) => tool.name === 'offer_next_action' && tool.args?.action === 'retry_task');
  check('failure answer advances one executable retry proposal', structuredRetry || offeredRetry, turns[1].tools.map((tool) => ({ name: tool.name, action: tool.args?.action, next_action: tool.result?.next_action?.action })));
  check('App Store answer performs a current evidence search', toolNames(turns[3]).includes('read_recent_activity'), toolNames(turns[3]));
  check('App Store answer does not deny the known submission', !includesAny(turns[3].assistant, ["didn't submit", 'not submitted', 'have not submitted', "haven't submitted"]), turns[3].assistant);
  check('App Store answer frames room evidence as an explicitly dated record', includesAny(turns[3].assistant, ['corner records show', 'corner records say', 'corner record from', 'recorded in']) && /(?:2026|august\s+\d|aug\.?\s+\d)/i.test(turns[3].assistant), turns[3].assistant);
}
check('conversation end executes the end route', toolNames(turns[4]).includes('end_voice_session'), toolNames(turns[4]));
// ── 2026-08-09, corner:airpods-mode ──────────────────────────────────────────
// This check used to be `wordCount <= 24` on every turn, and it was the reason
// the tuning kept converging on an assistant that could not hold a conversation:
// the suite failed any answer that actually explained something, so each round
// of "make it less annoying" also made it shallower, and a later round could
// never undo it without going red. Patrik's complaint on 2026-08-09 was this
// check, expressed as a feeling.
//
// What replaces it: brevity is still enforced where it was earned — on
// acknowledgements and on the close — and the ceiling is gone from answers.
// A hard upper bound stays only as a rambling guard, far above any real answer.
const ackTurns = turns.filter((turn) => !turn.tools.length && wordCount(turn.assistant) > 0 && /^(yes|no|ok|okay|got it|done)\b/i.test(turn.assistant));
check('acknowledgements stay short', ackTurns.every((turn) => wordCount(turn.assistant) <= 30), ackTurns.map((turn) => wordCount(turn.assistant)));
check('no turn rambles', turns.every((turn) => wordCount(turn.assistant) <= 120), turns.map((turn) => wordCount(turn.assistant)));
// A "why"/"walk me through" turn that comes back at headline length is the exact
// failure Patrik reported. Substantive questions must get a substantive answer.
const explanatoryTurns = turns.filter((turn) => /\bwhy\b|walk me through|what would you do|explain/i.test(turn.user));
check('explanatory questions get an actual explanation', explanatoryTurns.every((turn) => wordCount(turn.assistant) >= 25), explanatoryTurns.map((turn) => ({ q: turn.user, words: wordCount(turn.assistant) })));
// The assistant must never read a raw database row out loud. These are the shapes
// that leaked before the tool broker started phrasing its own summaries.
const RAW_RECORD = [/\bis failed;/i, /\b\d{3,} minutes\b/i, /^recorded failure:/i, /\bmetadata\.repo\b/i, /^[a-z]+\(corner:[a-z-]+\):/i];
// Scoped: quoting the exact recorded error IS the right answer when the caller
  // explicitly demands the actual/exact reason — the voice prompt requires it,
  // and a paraphrase there would be evasive. The ban applies everywhere else.
  const quotableTurn = (turn) => /\bactual\b|\bexact\b|verbatim|word for word|literally/i.test(turn.user);
  check('no raw database record is read aloud', !turns.filter((turn) => !quotableTurn(turn)).some((turn) => RAW_RECORD.some((re) => re.test(turn.assistant))), turns.filter((turn) => !quotableTurn(turn)).map((turn) => turn.assistant));
// It has to remember its own call. Answering a question about what was just said
// by going and searching the workspace is a conversation failure, not a lookup.
const selfReferential = turns.filter((turn) => /you (just )?(said|mentioned)|same thing|earlier in this call|at the start of this call/i.test(turn.user));
check('questions about this call are answered from memory, not a search', selfReferential.every((turn) => !toolNames(turn).includes('read_recent_activity')), selfReferential.map((turn) => ({ q: turn.user, tools: toolNames(turn) })));
const filler = ['well,', 'looks like', 'my bad', 'anything specific', 'anything else', 'move on to something else', 'want me to try', 'keep an eye on', 'let you know', "what's next", 'what is next', 'what else can i'];
check('conversation contains no filler or unsupported future promises', !turns.some((turn) => includesAny(turn.assistant, filler)), turns.map((turn) => turn.assistant));
check('closing is exact and contains no unsolicited recap', wordCount(turns[4].assistant) <= 4 && includesAny(turns[4].assistant, ['talk soon']) && !includesAny(turns[4].assistant, ['recap', 'failed outreach', 'app store', 'keep an eye', 'let you know']), turns[4].assistant);

const result = {
  scenario,
  session_id: conversation.sessionId,
  passed: checks.every((item) => item.pass),
  checks,
  turns: turns.map((turn) => ({ user: turn.user, assistant: turn.assistant, tools: toolNames(turn) })),
};
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
