// Constants extracted verbatim from ConversationsView during R2e split.

// Task statuses that mark an agent / project as currently "live" -- drives
// the animated dots in the agents + projects lists and the Elon hero card.
export const ACTIVE_STATUSES = new Set(['building', 'running', 'qa'])

// CSS keyframes for the live-dot pulse rendered inside ConversationsView's
// agent + project cards. Kept as a string so the shell can inject it once
// via a single <style> tag.
export const CONVERSATIONS_KEYFRAMES = `
        @keyframes cv3LiveDot { 0%,100% { opacity:0.3; transform:scale(0.75); } 50% { opacity:1; transform:scale(1.25); } }
        @keyframes cv3LiveText { 0%,100% { opacity:0.65; } 50% { opacity:1; } }
      `
