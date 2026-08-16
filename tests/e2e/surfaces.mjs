/**
 * surfaces.mjs — mission: corner:convex-multi-agent
 *
 * The ONLY place a surface's specifics live. capabilities.mjs stays surface-agnostic;
 * this file says how to find things on each one.
 *
 * Selectors are accessible roles, names and placeholders wherever possible — not CSS
 * classes. CV6 already works this way, and it means a replacement UI passes by being
 * accessible rather than by copying markup. If a new surface can't be driven by role and
 * name, that is itself a finding worth fixing rather than working around.
 *
 * A `null` selector means "this surface does not claim that capability" — the check is
 * reported as a gap, not as a crash.
 */

export const SURFACES = {
  // ---------------------------------------------------------------- today's bar
  cv6: {
    label: 'CV6 (live dashboard)',
    url: process.env.CV6_URL || 'https://www.aheadofmarket.com/dashboard',
    // The live dashboard rides an existing signed-in Chrome profile; see run.mjs --cdp.
    auth: { mode: 'existing-session', signedInMarker: { role: 'button', name: /Rooms/i } },

    composer: { placeholder: /^Message |^Reply to/i },
    sendButton: { role: 'button', name: /^Send message$/i },

    roomList: { role: 'button', nameFilter: null, container: '[data-testid="cv6-room-list"], nav, aside' },
    roomLink: (title) => ({ role: 'button', name: new RegExp(escapeRe(title), 'i') }),
    roomsNav: { role: 'button', name: /^Rooms$/i },

    message: { selector: '[data-testid="cv6-message"], [data-message-id], [data-role]' },
    messageRole: (el) => el.getAttribute('data-role') || el.getAttribute('data-message-role'),
    messageAgent: (el) => el.getAttribute('data-agent') || el.getAttribute('data-agent-slug'),

    mentionMenu: { selector: '[data-testid="cv6-mention-menu"], [role="listbox"]' },
    mentionItem: { selector: '[role="option"], [data-mention-slug]' },

    filesPanel: { role: 'button', name: /Files/i },
    checklistAdd: { role: 'button', name: /Checklist/i },
    themeToggle: { role: 'button', name: /theme\. Switch to/i },
    profileEdit: { role: 'button', name: /profile|initials|avatar/i },
    progressCard: { selector: '[data-testid="cv6-step-card"]' },
  },

  // ---------------------------------------------------------------- the challenger
  'convex-web': {
    label: 'corner-convex (Convex web)',
    url: process.env.CONVEX_WEB_URL || 'https://corner-convex.vercel.app',
    // Today this surface signs in with an email and no password. That is itself graded
    // by auth.signin; this block only says how to drive whatever is there.
    auth: {
      mode: 'email',
      email: process.env.E2E_EMAIL || 'patrikmatheson@gmail.com',
      emailField: { selector: 'input[type="email"], input[name="email"]' },
      submit: { role: 'button', name: /sign in|continue|enter/i },
      signedInMarker: { selector: '[data-testid="room-list"], nav a[href^="/room/"]' },
    },

    composer: { placeholder: /message|type|write/i },
    sendButton: { role: 'button', name: /send/i },

    roomList: { container: '[data-testid="room-list"], nav, aside, main' },
    roomLink: (title) => ({ role: 'link', name: new RegExp(escapeRe(title), 'i') }),
    roomsNav: { role: 'link', name: /^home$|rooms/i },

    message: { selector: '[data-testid="message"], [data-message-id], [data-role]' },
    messageRole: (el) => el.getAttribute('data-role'),
    messageAgent: (el) => el.getAttribute('data-agent-slug') || el.getAttribute('data-agent'),

    mentionMenu: { selector: '[data-testid="mention-menu"], [role="listbox"]' },
    mentionItem: { selector: '[role="option"], [data-mention-slug]' },

    filesPanel: { role: 'link', name: /files/i },
    checklistAdd: null,        // not claimed yet — reported as a gap, not a crash
    themeToggle: null,
    profileEdit: { role: 'link', name: /settings|profile/i },
    progressCard: { selector: '[data-testid="turn-status"], [data-thinking]' },
  },
};

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export const surfaceNames = () => Object.keys(SURFACES);
export const getSurface = (name) => {
  const s = SURFACES[name];
  if (!s) throw new Error(`unknown surface "${name}". known: ${surfaceNames().join(', ')}`);
  return s;
};
