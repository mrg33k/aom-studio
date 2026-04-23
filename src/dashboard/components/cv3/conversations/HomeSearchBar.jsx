// R4 home search bar: input field + dynamic border color + result count
// caption shown only while a query is active. Extracted verbatim from
// ConversationsView during R2e split.
import { C } from '../../../lib/cv3Colors.js'

export default function HomeSearchBar({
  searchQuery, setSearchQuery,
  searchFocused, setSearchFocused,
  showSearch,
  searching,
  totalResults,
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: C.s1,
        border: '1px solid ' + (searchFocused
          ? 'rgba(16,185,129,0.25)'
          : showSearch ? 'rgba(96,165,250,0.25)' : C.border),
        borderRadius: 14,
        padding: '12px 16px',
        transition: 'border-color 0.2s',
      }}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none"
          stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search messages, tasks, agents, projects…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
              fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
            }}
          >×</button>
        )}
      </div>
      {showSearch && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: C.dim,
          marginTop: 8, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {searching ? 'searching…' : `${totalResults} results`}
        </div>
      )}
    </div>
  )
}
