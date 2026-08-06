// ColumnExpandButton — the widen/narrow control that sits next to a workspace
// column's close X (Patrik 2026-08-06: "windows should be able to expand to twice
// their width with an expansion icon next to the close icon").
//
// Shared by all three column shells (chat, email, background work) so the three
// headers cannot drift apart. Width itself is CSS: the toggle only stamps
// data-column-expanded on the column, and .cv6-workspace-column[data-column-expanded]
// doubles the flex basis. Desktop only — on phone a column is already full width, so
// CornerCV6 passes no handler there and nothing renders.
export default function ColumnExpandButton({ expanded, onToggle, label }) {
  if (typeof onToggle !== 'function') return null;
  const title = expanded ? `Shrink ${label}` : `Widen ${label}`;
  return (
    <button type="button" className="cv6-chat-header-button cv6-column-expand" aria-label={title} title={title}
      aria-pressed={expanded ? 'true' : 'false'} onClick={onToggle}>
      {expanded ? (
        // Chevrons pointing IN — this narrows the column back to one width.
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 5 6 7-6 7" /><path d="m21 5-6 7 6 7" /></svg>
      ) : (
        // Chevrons pointing OUT — this widens the column to double.
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5-6 7 6 7" /><path d="m15 5 6 7-6 7" /></svg>
      )}
    </button>
  );
}
