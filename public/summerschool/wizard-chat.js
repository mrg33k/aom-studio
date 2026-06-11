/* Wizard Chat — minimal test interface for summerschool
 * Replaces form-based UI with direct chat to the Wizard.
 * Sends messages to /api/embed/chat, polls /api/embed/messages for replies.
 */

(function () {
  'use strict';

  const APP_HOST = document.getElementById('app-host');
  const EMBED_ID = 'emb_summerschool'; // Registered embed ID in _embeds.json
  const POLL_INTERVAL_MS = 1500; // Poll for new messages every 1.5s

  // App state
  let appState = {
    messages: [],
    inputValue: '',
    isLoading: false,
    sinceTs: null, // ISO timestamp — poll for messages newer than this
    sessionId: null,
  };

  // Derive today's day name for curriculum context
  function getTodayDay() {
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAY_NAMES[new Date().getDay()];
  }

  // Initialize session ID (simple UUID)
  function initSessionId() {
    let sid = sessionStorage.getItem('wizard-chat-session-id');
    if (!sid) {
      sid = 'ss-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('wizard-chat-session-id', sid);
    }
    appState.sessionId = sid;
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
        // Rollback the optimistic message
        appState.messages.pop();
      } else {
        const data = await response.json();
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
      appState.messages.pop();
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
      .map((msg, idx) => {
        const isWizard = msg.role === 'wizard' || msg.role === 'assistant';
        const classes = isWizard ? 'message wizard-message' : 'message user-message';
        const video = extractVideoUrl(msg.text);
        const videoHtml = video ? createVideoEmbed(video) : '';
        return `<div class="${classes}">${escapeHtml(msg.text)}${videoHtml}</div>`;
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
          <div class="header-ornament">&#10022;</div>
          <h1>Morning, Ethan</h1>
          <p>The Wizard awaits &mdash; today's lessons are ready</p>
          <div class="header-ornament">&#10022;</div>
        </div>

        <div class="wizard-rail">
          <img class="wizard-figure" src="/summerschool/wizard.png?v=20260611a" alt="The Wizard" />
          <div class="wizard-nameplate">The Wizard</div>
        </div>

        <div class="messages-container">
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
          <div class="action-title">&#9876; Today's Quests</div>
          <div class="action-placeholder">
            The Wizard will reveal your quests here when you're ready.
          </div>
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
  };

  // Initialize and start polling
  function init() {
    initSessionId();

    // Start the poll window from now so we don't pick up old messages
    appState.sinceTs = new Date().toISOString();

    // Render initial UI
    appState.messages.push({
      role: 'wizard',
      text: 'Hello! I\'m the Wizard. I\'m excited to work with you today. What subject would you like to start with?',
      timestamp: Date.now(),
    });
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
