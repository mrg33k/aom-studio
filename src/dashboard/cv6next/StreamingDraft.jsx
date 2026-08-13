// StreamingDraft — its own module ON PURPOSE (R-SMOOTHNESS Round D):
// the CornerCV6 chunk filename hash tracks the module GRAPH, not file
// contents, so edits inside existing files can ship without busting the
// CDN's immutable asset cache. A new module changes the graph and forces
// a fresh chunk URL. (Found live 2026-08-12: Ready deploy, stale chunk.)
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';

// Live draft bubble (R-SMOOTHNESS Round D): the agent's partial reply as it is
// being written, streamed from the bridge mirror via the engine's draft state.
// Ephemeral by contract — useRoomThread clears the draft in the same pass that
// renders the real persisted row, so the swap is one paint with no duplicate.
// Renders through the same markdown path as a real agent bubble.
export default function StreamingDraft({ room, draft }) {
  if (!draft || !draft.text) return null;
  return (
    <div data-cv6-draft="" className="cv6-live-work" style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-start' }}>
      <span className="ava is-green" style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{room?.initials || '·'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {room?.name ? <div className="gname" style={{ marginBottom: 6 }}>{room.name}</div> : null}
        <div className="gsnote" style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}>
          <ChatMessageRenderer content={draft.text} className="cv6-agent-prose" />
          <span className="cv6-draft-cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

