/* Wizard Chat — minimal test interface for summerschool
 * Replaces form-based UI with direct chat to the Wizard.
 * Sends messages to /api/embed/chat, polls /api/embed/messages for replies.
 */

(function () {
  'use strict';

  const APP_HOST = document.getElementById('app-host');
  const ROOM_ID = 'iso-wizard-parent-teacher-council'; // Where Ethan's messages go
  const POLL_INTERVAL_MS = 1000; // Poll for new messages every 1s

  // App state
  let appState = {
    messages: [],
    inputValue: '',
    isLoading: false,
    lastMessageId: null, // Track last message we've seen, avoid duplicates
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
          roomId: ROOM_ID,
          message: text,
          userId: 'ethan', // Kid's identifier
          sessionId: appState.sessionId,
          context: {
            day: getTodayDay(),
            role: 'student',
            source: 'summerschool-chat',
          },
        }),
      });

      if (!response.ok) {
        console.error('Send failed:', response.status, response.statusText);
        // Rollback the optimistic message
        appState.messages.pop();
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
    try {
      const response = await fetch(`/api/embed/messages?roomId=${ROOM_ID}&after=${appState.lastMessageId || 0}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn('Poll failed:', response.status);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          // Avoid duplicates
          if (msg.id && msg.id === appState.lastMessageId) continue;

          appState.messages.push({
            role: msg.role || 'wizard',
            text: msg.text || msg.content || '',
            timestamp: msg.timestamp || Date.now(),
            id: msg.id,
          });

          appState.lastMessageId = msg.id;
        }
        if (data.messages.length > 0) {
          render();
        }
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
      ? '<div class="message wizard-message loading">The Wizard is thinking...</div>'
      : '';

    const html = `
      <div class="wizard-chat-container">
        <div class="chat-header">
          <h1>Morning, Ethan</h1>
          <p>Chat with the Wizard about today's lessons</p>
        </div>

        <div class="messages-container">
          ${messagesHtml}
          ${loadingIndicator}
        </div>

        <div class="chat-input-area">
          <input
            type="text"
            class="chat-input"
            placeholder="Type your message..."
            value="${escapeHtml(appState.inputValue)}"
            ${appState.isLoading ? 'disabled' : ''}
            onkeyup="if (event.key === 'Enter') window.__wizardChat.send(this.value)"
          />
          <button
            class="send-button"
            ${appState.isLoading ? 'disabled' : ''}
            onclick="window.__wizardChat.send(document.querySelector('.chat-input').value)"
          >
            Send
          </button>
        </div>

        <div class="action-panel">
          <div class="action-title">Today's Challenges</div>
          <div class="action-placeholder">
            The Wizard will show challenges here when you're ready.
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

    // Render initial UI
    appState.messages.push({
      role: 'wizard',
      text: 'Hello! I\'m the Wizard. I\'m excited to work with you today. What subject would you like to start with?',
      timestamp: Date.now(),
    });
    render();

    // Start polling for new messages every 1s
    setInterval(pollMessages, POLL_INTERVAL_MS);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
