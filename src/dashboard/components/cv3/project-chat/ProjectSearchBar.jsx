import { C } from '../../../lib/cv3Colors.js'

// Global chat-search input below the header. Escape clears + closes.
// Shows "Searching..." / "N result(s)" status under the input.
export default function ProjectSearchBar({
  chatSearchRef,
  chatSearchQuery,
  setChatSearchQuery,
  setChatSearchOpen,
  setChatSearchResults,
  chatSearchLoading,
  chatSearchResults,
}) {
  return (
    <div style={{
      padding: '8px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(8,14,28,0.95)',
    }}>
      <input
        ref={chatSearchRef}
        type="text"
        placeholder="Search all messages..."
        value={chatSearchQuery}
        onChange={e => setChatSearchQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setChatSearchOpen(false); setChatSearchQuery(''); setChatSearchResults(null) } }}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: C.text, fontSize: 13,
          outline: 'none',
        }}
      />
      {chatSearchLoading && <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>Searching...</span>}
      {chatSearchResults && !chatSearchLoading && (
        <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>
          {chatSearchResults.length} result{chatSearchResults.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
