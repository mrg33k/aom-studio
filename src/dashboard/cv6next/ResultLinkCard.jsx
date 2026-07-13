// ResultLinkCard.jsx — the tappable "here's the live link" card for completed web work.
// Composed from the CV6 kit's result-block grammar (.cblk.is-success header row +
// .review-btn accent button); the whole card is the anchor and opens in a new tab.
// Rendered on every chat surface (ChatDesktop, ChatLifecycle mobile, Catch Up modal)
// so a completion link always reads as a button you tap, never a URL to hunt for.
import React from 'react';

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export default function ResultLinkCards({ cards }) {
  const list = Array.isArray(cards) ? cards.filter((c) => c && c.url) : [];
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, width: '100%', maxWidth: 480 }}>
      {list.map((c, i) => (
        <a
          key={i}
          className="cblk is-success"
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}
        >
          <span className="cblk-h" style={{ marginBottom: 0 }}>
            <span className="ci">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="ct" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hostOf(c.url)}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>{c.summary || c.url}</span>
            </span>
            <span className="review-btn" style={{ pointerEvents: 'none' }}>
              Open
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
