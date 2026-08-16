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
    // The house room renders as "AOM" here, as "Ahead of Market" elsewhere.
    canonicalRoomPattern: /^aom$|ahead of market/i,
    url: process.env.CV6_URL || 'https://www.aheadofmarket.com/dashboard',
    // The live dashboard rides an existing signed-in Chrome profile; see run.mjs --cdp.
    auth: { mode: 'existing-session', signedInMarker: { role: 'button', name: /Rooms/i } },

    // Two different composers: the intake box on Home, the chat box inside a room.
    // Both are needed — capabilities open a room and then type, so prefer the chat one.
    composer: { selector: '[data-testid="cv6-chat-input"], [data-testid="cv6-intake-input"]' },
    // "Am I in a room" must key on the CHAT composer only. The Home intake box matches
    // the composer selector too, so without this every Home screen reads as a room.
    inRoomMarker: { selector: '[data-testid="cv6-chat-input"]' },
    sendButton: { selector: '[data-testid="cv6-intake-send"]', role: 'button', name: /^Send( message)?$/i },

    // CV6's screens are template-engine driven: every actionable row carries
    // data-cv6-arg ("m:bridge", "p:kraken-corps", "a:corner"). The row class differs by
    // viewport (mresumecard on phone, projrow/missrow/recentrow on desktop), so match on
    // the data attribute and let the class list vary.
    roomRow: { selector: '.mresumecard[data-cv6-arg], .projrow[data-cv6-arg], .missrow[data-cv6-arg], .recentrow[data-cv6-arg], .restrow[data-cv6-arg]' },
    roomList: { container: null },
    roomLink: (title) => ({ role: 'button', name: new RegExp(escapeRe(title), 'i') }),
    roomsNav: { role: 'button', name: /^Rooms$/i },

    // Verified against the live thread: rows are [data-cv6-message-turn][data-message-id].
    // There is NO role attribute — the viewer's own turns carry a bare data-userturn and
    // agent turns carry nothing, so absence of data-userturn is the agent turn.
    message: {
      selector: '[data-cv6-message-turn][data-message-id]',
      idAttr: 'data-message-id',
      userTurnAttr: 'data-userturn',
      agentAttr: null,   // CV6 does not expose the agent slug on the row yet
      timeAttr: null,    // nor a timestamp
    },

    mentionMenu: { selector: '[data-testid="cv6-mention-menu"], [role="listbox"]' },
    mentionItem: { selector: '[role="option"], [data-mention-slug]' },

    filesPanel: { selector: '[data-testid="chat-files-button"]' },
    checklistAdd: { selector: '[data-testid="room-checklist-toggle"]' },
    themeToggle: { role: 'button', name: /theme\. Switch to/i },
    profileEdit: { role: 'button', name: /profile|initials|avatar/i },
    progressCard: { selector: '[data-testid="cv6-step-card"]' },
  },

  // ---------------------------------------------------------------- the challenger
  'convex-web': {
    label: 'corner-convex (Convex web)',
    canonicalRoomPattern: /^aom$|ahead of market/i,
    url: process.env.CONVEX_WEB_URL || 'https://corner-convex.vercel.app',
    // Today this surface signs in with an email and no password. That is itself graded
    // by auth.signin; this block only says how to drive whatever is there.
    auth: {
      mode: 'email',
      email: process.env.E2E_EMAIL || 'patrikmatheson@gmail.com',
      // The email box is already on the landing screen, so there is no chooser step:
      // fill it, THEN press "Continue with email". Pressing it empty just renders
      // "Enter a valid email".
      // NOTE: that input is type="text" with no name attribute, which is why the usual
      // input[type=email] selector finds nothing. Worth fixing in the product too — it
      // costs mobile users the email keyboard and browser autofill.
      preSteps: [],
      emailField: { selector: 'input[type="email"], input[name="email"], input[placeholder*="@"]' },
      submit: { role: 'button', name: /^continue with email$/i },
      signedInMarker: { selector: '[data-testid="room-list"], [data-room-id], a[href^="/room/"]' },
    },

    composer: { placeholder: /message|type|write/i },
    inRoomMarker: { placeholder: /message|type|write/i },
    sendButton: { role: 'button', name: /send/i },

    roomRow: { selector: '[data-room-id], a[href^="/room/"]' },
    roomList: { container: '[data-testid="room-list"], nav, aside, main' },
    roomLink: (title) => ({ role: 'link', name: new RegExp(escapeRe(title), 'i') }),
    roomsNav: { role: 'link', name: /^home$|rooms/i },

    message: {
      selector: '[data-testid="message"], [data-message-id]',
      idAttr: 'data-message-id',
      roleAttr: 'data-role',
      agentAttr: 'data-agent-slug',
      timeAttr: 'data-created-at',
    },

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
