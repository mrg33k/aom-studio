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
    client_id: 'aom', agent: 'rex', mode: 'airpods', session_id: sessionId,
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

const conversation = await openConversation();
const turns = [];
try {
  turns.push(await conversation.turn("What's the latest?"));
  turns.push(await conversation.turn('Why did the outreach task fail?'));
  turns.push(await conversation.turn('So what was the actual failure reason?'));
  turns.push(await conversation.turn('Did we submit Corner to the App Store?'));
  turns.push(await conversation.turn("That's all. End the conversation."));
} finally {
  conversation.close();
}

check('latest uses a fresh workspace read', toolNames(turns[0]).includes('read_workspace_status'), toolNames(turns[0]));
check('failure follow-up inspects the known task', toolNames(turns[1]).includes('read_task_status'), toolNames(turns[1]));
check('failure follow-up does not wander into room discovery', !toolNames(turns[1]).some((name) => ['find_rooms', 'read_room_status'].includes(name)), toolNames(turns[1]));
check('failure explanation states the recorded repo cause', includesAny(`${turns[1].assistant} ${turns[2].assistant}`, ['metadata.repo', 'repo was missing', 'missing repo']), `${turns[1].assistant} ${turns[2].assistant}`);
check('failure discussion does not redirect to unrelated App Store work', !includesAny(`${turns[1].assistant} ${turns[2].assistant}`, ['app store credential', 'outlook credential']), `${turns[1].assistant} ${turns[2].assistant}`);
check('failure answer advances one executable retry proposal', turns[1].tools.some((tool) => tool.name === 'offer_next_action' && tool.args?.action === 'retry_task'), turns[1].tools.map((tool) => ({ name: tool.name, action: tool.args?.action })));
check('App Store answer performs a current evidence search', toolNames(turns[3]).includes('read_recent_activity'), toolNames(turns[3]));
check('App Store answer does not deny the known submission', !includesAny(turns[3].assistant, ["didn't submit", 'not submitted', 'have not submitted', "haven't submitted"]), turns[3].assistant);
check('App Store answer frames room evidence as a dated record', includesAny(turns[3].assistant, ['corner records show', 'corner records say', 'recorded in']) && /(?:2026|august|aug\.?\s+\d|today|yesterday)/i.test(turns[3].assistant), turns[3].assistant);
check('conversation end executes the end route', toolNames(turns[4]).includes('end_voice_session'), toolNames(turns[4]));
check('routine answers stay compact', turns.slice(0, 4).every((turn) => wordCount(turn.assistant) <= 28), turns.slice(0, 4).map((turn) => wordCount(turn.assistant)));
const filler = ['well,', 'looks like', 'my bad', 'anything specific', 'anything else', 'move on to something else', 'want me to try', 'keep an eye on', 'let you know'];
check('conversation contains no filler or unsupported future promises', !turns.some((turn) => includesAny(turn.assistant, filler)), turns.map((turn) => turn.assistant));
check('closing is short and contains no unsolicited recap', wordCount(turns[4].assistant) <= 10 && !includesAny(turns[4].assistant, ['recap', 'failed outreach', 'app store', 'keep an eye', 'let you know']), turns[4].assistant);

const result = {
  session_id: conversation.sessionId,
  passed: checks.every((item) => item.pass),
  checks,
  turns: turns.map((turn) => ({ user: turn.user, assistant: turn.assistant, tools: toolNames(turn) })),
};
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
