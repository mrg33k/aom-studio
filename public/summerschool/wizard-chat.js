/* Wizard Chat — minimal test interface for summerschool
 * Replaces form-based UI with direct chat to the Wizard.
 * Sends messages to /api/embed/chat, polls /api/embed/messages for replies.
 */

(function () {
  'use strict';

  const APP_HOST = document.getElementById('app-host');
  const EMBED_ID = 'emb_summerschool'; // Registered embed ID in _embeds.json
  const POLL_INTERVAL_MS = 1500; // Poll for new messages every 1.5s
  const VIDEO_EMBEDS_ENABLED = false; // Off until the curated-video layer is approved (council decision #2)

  // App state
  let appState = {
    messages: [],
    inputValue: '',
    isLoading: false,
    sinceTs: null, // ISO timestamp — poll for messages newer than this
    sessionId: null,
    dayState: null, // Wizard's day ledger string — drives Today's Quests
    theme: localStorage.getItem('wizard-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  };

  // Parse the Wizard's day ledger ("Reading=done; Specials1(Music)=next; note=...")
  // into quest entries + a note. Unknown fragments are skipped, not crashed on.
  function parseDayState(state) {
    if (!state || typeof state !== 'string') return null;
    const quests = [];
    let note = '';
    // Split on ';' but not inside parens — the checklist detail uses commas
    // and may contain ';'-free prose; parens carry per-subject steps.
    for (const part of state.split(/;(?![^(]*\))/)) {
      const m = part.match(/^\s*([^=]+?)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (/^(note|now)$/i.test(key)) {
        // "now" is the Wizard's save point — more useful on screen than the
        // internal revisit note when both exist.
        if (/^now$/i.test(key) || !note) note = val;
        continue;
      }
      // Specials1(Communication) → Communication; plain keys pass through
      const special = key.match(/^Specials?\d*\s*\(([^)]+)\)$/i);
      const name = special ? special[1].trim() : key;
      // Status is the first token; optional "(convo done, step: ...)" detail follows
      const detailMatch = val.match(/^([^(\s]+)\s*(?:\(([^)]*)\))?/);
      const status = (detailMatch ? detailMatch[1] : val).toLowerCase().replace(/\s+/g, '-');
      const stepMatch = detailMatch && detailMatch[2] ? detailMatch[2].match(/step:\s*([^,)]+)/i) : null;
      quests.push({ name, status, step: stepMatch ? stepMatch[1].trim() : '' });
    }
    return quests.length ? { quests, note } : null;
  }

  function questStatusMeta(status) {
    switch (status) {
      case 'done': return { icon: '&#10004;', label: 'Done', cls: 'quest-done' };
      case 'in-progress': return { icon: '&#9670;', label: 'In progress', cls: 'quest-active' };
      case 'next': return { icon: '&#10148;', label: 'Up next', cls: 'quest-next' };
      default: return { icon: '&#9675;', label: 'Not started', cls: 'quest-todo' };
    }
  }

  function renderQuestsPanel() {
    const parsed = parseDayState(appState.dayState);
    if (!parsed) {
      return `<div class="action-placeholder">
            <span class="action-placeholder-icon">&#10022;</span>
            Your quests for today are being prepared by the Wizard &mdash; they&rsquo;ll appear here when your morning session begins.
          </div>`;
    }
    const rows = parsed.quests
      .map((q) => {
        const meta = questStatusMeta(q.status);
        const stepHtml = q.step && q.status === 'in-progress'
          ? `<div class="quest-step">${escapeHtml(q.step)}</div>`
          : '';
        return `<div class="quest-row ${meta.cls}">
            <span class="quest-icon">${meta.icon}</span>
            <span class="quest-name">${escapeHtml(q.name)}${stepHtml}</span>
            <span class="quest-status">${meta.label}</span>
          </div>`;
      })
      .join('');
    // The ledger's now=/note= fields are the Wizard's internal teacher notes
    // (frank observations, save points) — never rendered on Ethan's screen.
    return `<div class="quest-list">${rows}</div>`;
  }

  // Derive today's day name for curriculum context
  function getTodayDay() {
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAY_NAMES[new Date().getDay()];
  }

  // Initialize visitor ID — localStorage so the conversation survives
  // refreshes and new tabs (was sessionStorage, which wiped on refresh).
  function initSessionId() {
    // Testing reset: /summerschool?reset wipes the saved session and starts
    // a brand-new day (fresh visitor id = fresh history + fresh AI memory).
    // Param is stripped from the URL so a refresh doesn't re-reset.
    if (new URLSearchParams(window.location.search).has('reset')) {
      localStorage.removeItem('wizard-chat-session-id');
      sessionStorage.removeItem('wizard-chat-session-id');
      window.history.replaceState({}, '', window.location.pathname);
    }
    let sid = localStorage.getItem('wizard-chat-session-id');
    if (!sid) {
      // Migrate any old sessionStorage id so today's thread isn't lost
      sid = sessionStorage.getItem('wizard-chat-session-id');
      if (!sid) {
        sid = 'ss-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
      localStorage.setItem('wizard-chat-session-id', sid);
    }
    appState.sessionId = sid;
  }

  // Load this visitor's conversation for TODAY from the server (survives
  // refresh, new tab, device sleep — the server is the source of truth).
  // Scoped to today's Phoenix midnight so we get ALL of today's messages
  // without hitting the 200-row cap on 7-day history.
  async function loadHistory() {
    try {
      // Full-day history: scope to today in Phoenix timezone.
      // Arizona (Phoenix) stays on MST = UTC-7 year-round (no DST).
      const todayPhoenix = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      const sinceTodayMidnight = new Date(todayPhoenix + 'T00:00:00-07:00').toISOString();

      const params = new URLSearchParams({
        embed_id: EMBED_ID,
        history: '1',
        visitor_id: 'ethan-' + appState.sessionId,
        since: sinceTodayMidnight,
      });
      const response = await fetch(`/api/embed/messages?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.day_state) appState.dayState = data.day_state;
      if (!Array.isArray(data.messages) || data.messages.length === 0) return false;
      let hadVisible = false;
      for (const msg of data.messages) {
        // Skip hidden session-start triggers (sent by requestWizardGreeting on
        // a fresh day — they're internal scaffolding, not part of Ethan's convo).
        if (msg.role === 'user' && (msg.text || '').trim() === '<<session-start>>') continue;
        hadVisible = true;
        appState.messages.push({
          role: msg.role || 'wizard',
          text: msg.text || '',
          timestamp: msg.timestamp || Date.now(),
          id: msg.id,
        });
        if (msg.timestamp && (!appState.sinceTs || msg.timestamp > appState.sinceTs)) {
          appState.sinceTs = msg.timestamp;
        }
      }
      return hadVisible;
    } catch (e) {
      console.warn('History load error:', e);
      return false;
    }
  }

  // Request a server-generated opening greeting for a fresh session.
  // Posts a hidden <<session-start>> trigger — the Wizard uses the day
  // ledger + cross-day memory to craft a personalized opener (e.g. "Morning,
  // Ethan! Yesterday you crushed those math problems…"). The trigger message
  // is never added to appState.messages — Ethan only sees the Wizard's reply.
  // The day_state in the reply seeds the Today's Quests panel immediately.
  async function requestWizardGreeting() {
    appState.isLoading = true;
    render();
    try {
      const response = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embed_id: EMBED_ID,
          content: '<<session-start>>',
          visitor_id: 'ethan-' + appState.sessionId,
          host_origin: window.location.origin,
        }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.day_state) appState.dayState = data.day_state;
      // Advance sinceTs so the poll picks up from after the greeting was inserted.
      if (data.since_ts && data.since_ts > appState.sinceTs) {
        appState.sinceTs = data.since_ts;
      }
      // Show the Wizard's greeting reply immediately (no poll wait).
      if (data.reply && data.reply.text) {
        appState.messages.push({
          role: 'assistant',
          text: data.reply.text,
          timestamp: Date.now(),
          id: data.reply.id,
        });
      }
    } catch (e) {
      console.warn('[wizard] Session greeting request failed:', e);
    } finally {
      appState.isLoading = false;
    }
  }

  // Send a message to the Wizard
  async function sendMessage(text) {
    if (!text.trim()) return;

    // Optimistically add user message to UI
    appState.messages.push({
      role: 'user',
      text: text,
      timestamp: Date.now(),
    });

    appState.inputValue = '';
    render();

    // Send to embed API
    try {
      appState.isLoading = true;
      const response = await fetch('/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embed_id: EMBED_ID,
          content: text,
          visitor_id: 'ethan-' + appState.sessionId,
          host_origin: window.location.origin,
        }),
      });

      if (!response.ok) {
        console.error('Send failed:', response.status, response.statusText);
        // Keep the user's message visible — silently vanishing is worse than an error.
        // Show a retry nudge so Ethan knows to send again.
        appState.messages.push({
          role: 'assistant',
          text: "Hmm, something went wrong on my end — can you send that again?",
          timestamp: Date.now(),
        });
      } else {
        const data = await response.json();
        if (data.day_state) appState.dayState = data.day_state;
        // Use the server's since_ts so we poll from after the user message
        if (data.since_ts) {
          appState.sinceTs = appState.sinceTs || data.since_ts;
        }
        // The API now returns the Wizard's reply inline — render it right
        // away instead of waiting on the poll (poll dedupes by id).
        if (data.reply && data.reply.text) {
          appState.messages.push({
            role: 'assistant',
            text: data.reply.text,
            timestamp: Date.now(),
            id: data.reply.id,
          });
        } else if (data.ai_error) {
          console.error('Wizard reply error:', data.ai_error);
          appState.messages.push({
            role: 'assistant',
            text: "Hmm, my crystal ball flickered — try sending that again in a moment!",
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error('Send error:', e);
      // Keep the user's message visible; show a retry nudge.
      appState.messages.push({
        role: 'assistant',
        text: "Hmm, something went wrong on my end — can you send that again?",
        timestamp: Date.now(),
      });
    } finally {
      appState.isLoading = false;
      render();
    }
  }

  // Poll for new messages from the Wizard
  async function pollMessages() {
    if (!appState.sinceTs) return; // sinceTs set at init; just a safety guard
    try {
      const params = new URLSearchParams({
        embed_id: EMBED_ID,
        since: appState.sinceTs,
        visitor_id: 'ethan-' + appState.sessionId,
      });
      const response = await fetch(`/api/embed/messages?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn('Poll failed:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        // Track the newest timestamp so next poll doesn't re-fetch the same rows
        const seenIds = new Set(appState.messages.map((m) => m.id).filter(Boolean));
        let gotNew = false;
        for (const msg of data.messages) {
          if (seenIds.has(msg.id)) continue;
          appState.messages.push({
            role: msg.role || 'wizard',
            text: msg.text || msg.content || '',
            timestamp: msg.timestamp || Date.now(),
            id: msg.id,
          });
          // Advance since_ts to just after the last message we saw
          if (msg.timestamp && msg.timestamp > appState.sinceTs) {
            appState.sinceTs = msg.timestamp;
          }
          gotNew = true;
        }
        if (gotNew) render();
      }
    } catch (e) {
      console.warn('Poll error:', e);
    }
  }

  // Extract YouTube/Vimeo URL from text
  function extractVideoUrl(text) {
    // YouTube patterns: youtu.be/ID or youtube.com/watch?v=ID
    const youtubeMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return { type: 'youtube', id: youtubeMatch[1] };
    }
    // Vimeo pattern: vimeo.com/ID
    const vimeoMatch = text.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return { type: 'vimeo', id: vimeoMatch[1] };
    }
    return null;
  }

  // Create video embed HTML
  function createVideoEmbed(video) {
    if (video.type === 'youtube') {
      return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 8px;"></iframe>`;
    } else if (video.type === 'vimeo') {
      return `<iframe src="https://player.vimeo.com/video/${video.id}" width="100%" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="border-radius: 8px; margin-top: 8px;"></iframe>`;
    }
    return '';
  }

  // Render the chat UI
  function render() {
    // Preserve anything the user has typed across re-renders (polls)
    const liveInput = document.querySelector('.chat-input');
    if (liveInput) appState.inputValue = liveInput.value;

    const messagesHtml = appState.messages
      .filter((msg) => msg.text && msg.text.trim())
      .map((msg, idx) => {
        const isWizard = msg.role === 'wizard' || msg.role === 'assistant';
        const classes = isWizard ? 'message wizard-message' : 'message user-message';
        // Video embeds disabled pending the curated-video decision (canon: no video in chat).
        // Re-enable by flipping VIDEO_EMBEDS_ENABLED once the council approves a curated layer.
        const video = VIDEO_EMBEDS_ENABLED ? extractVideoUrl(msg.text) : null;
        const videoHtml = video ? createVideoEmbed(video) : '';
        return `<div class="${classes}">${formatMessage(msg.text)}${videoHtml}</div>`;
      })
      .join('');

    const loadingIndicator = appState.isLoading
      ? `<div class="message wizard-message typing-indicator">
           <span class="typing-label">The Wizard is conjuring a reply</span>
           <span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
         </div>`
      : '';

    const html = `
      <div class="wizard-chat-container">
        <div class="chat-header">
          <h1><span class="header-ornament-inline">&#10022;</span> Morning, Ethan <span class="header-ornament-inline">&#10022;</span></h1>
          <p>The Wizard awaits &mdash; today's lessons are ready</p>
          <div class="theme-selector" title="Choose Light or Dark Theme">
            <button class="theme-btn light ${appState.theme === 'light' ? 'active' : ''}" onclick="window.__wizardChat.setTheme('light')" title="Light Theme">
              <span class="theme-icon">&#9728;</span>
            </button>
            <button class="theme-btn dark ${appState.theme === 'dark' ? 'active' : ''}" onclick="window.__wizardChat.setTheme('dark')" title="Dark Theme">
              <span class="theme-icon">&#9790;</span>
            </button>
          </div>
        </div>

        <div class="wizard-rail">
          <img class="wizard-figure" src="/summerschool/wizard.png?v=20260611a" alt="The Wizard" />
          <div class="wizard-nameplate">The Wizard</div>
        </div>

        <div class="messages-container${appState.messages.length === 0 && appState.isLoading ? ' messages-container--init' : ''}">
          ${messagesHtml}
          ${loadingIndicator}
        </div>

        <div class="chat-input-area">
          <input
            type="text"
            class="chat-input"
            placeholder="Speak to the Wizard..."
            value="${escapeHtml(appState.inputValue)}"
            ${appState.isLoading ? 'disabled' : ''}
            onkeyup="if (event.key === 'Enter') window.__wizardChat.send(this.value)"
          />
          <button
            class="send-button"
            ${appState.isLoading ? 'disabled' : ''}
            onclick="window.__wizardChat.send(document.querySelector('.chat-input').value)"
          >
            Send &#10038;
          </button>
        </div>

        <div class="action-panel">
          <div class="action-title">&#10022; Today's Quests</div>
          ${renderQuestsPanel()}
        </div>
      </div>
    `;

    APP_HOST.innerHTML = html;

    // Auto-scroll to bottom
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Escape HTML to prevent injection
  // Escape HTML first, then render the tiny markdown subset agents emit
  // (**bold**, *italic*, line breaks) so Ethan never sees raw asterisks.
  function formatMessage(text) {
    return escapeHtml(text.trim())
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API for the UI to call
  window.__wizardChat = {
    send: (text) => {
      if (text && text.trim()) {
        appState.inputValue = '';
        sendMessage(text);
      }
    },
    toggleTheme: () => {
      appState.theme = appState.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('wizard-theme', appState.theme);
      applyTheme();
      render();
    },
    setTheme: (theme) => {
      if (appState.theme !== theme) {
        appState.theme = theme;
        localStorage.setItem('wizard-theme', theme);
        applyTheme();
        render();
      }
    },
  };

  function applyTheme() {
    if (appState.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }

  // Initialize and start polling
  async function init() {
    initSessionId();
    applyTheme();

    // Start the poll window from now; loadHistory or greeting will advance it
    appState.sinceTs = new Date().toISOString();
    render();

    // Pull the existing conversation back — refresh must not lose the thread.
    // loadHistory is scoped to today so it returns all of today's messages.
    // It also fetches today's day_state so the Quests panel renders immediately.
    const hadHistory = await loadHistory();
    if (!hadHistory) {
      // No history for today — ask the server for a personalized greeting.
      // The Wizard uses the day ledger + cross-day memory (yesterday's ledger)
      // to craft the opener. No hardcoded fallback message.
      await requestWizardGreeting();
    }
    render();

    // Start polling for new messages
    setInterval(pollMessages, POLL_INTERVAL_MS);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
