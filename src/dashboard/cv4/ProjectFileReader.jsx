// CV4 ProjectFileReader — article-style markdown renderer for canonical
// project/mission MDs (VISION, RESEARCH, BUILD, CONTEXT), tape, and
// dated research drops.
//
// Mission: corner:files-in-app (R79-f2)
// Scope: ONE primitive — the article body. The file-list panel and the
// data-pipe wiring are R79-f3 / R79-f4.
//
// Design lens (per VISION pillar 2 + AOM "landing in heaven"):
//   - System font stack (Helvetica Neue / -apple-system / SF) for body —
//     deliberately NOT Inter; this surface is an *article*, not a chat UI.
//   - ~70ch column, generous line-height, real margins.
//   - Headings have hierarchy and air. Code blocks quiet (mono, soft tint).
//   - Lists / tables / blockquotes look intentional, not stack-overflow.
//
// Tape branding (pillar 1):
//   - kind="tape" gets a "What the agent remembers" chip + subtle bg tint
//     so the user can tell agent-working-memory from authored canon at a
//     glance. Render rules otherwise identical (read-only, same typography).
//
// Link handling:
//   - Internal links (.md, research/, intra-mission paths) call onLinkClick
//     instead of navigating. R79-f5 will wire the actual routing.
//   - External (http/https) links open in a new tab.

import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
import { C } from '../lib/cv3Colors.js'

// Article font stack — system-first, lands on Helvetica / SF. Intentionally
// distinct from the Inter chat UI so the reader *feels* like reading something
// published.
const FF_ARTICLE_BODY = `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, "Segoe UI", system-ui, sans-serif`
const FF_ARTICLE_HEAD = `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, "Segoe UI", system-ui, sans-serif`
const FF_MONO         = `"JetBrains Mono", "SF Mono", Menlo, Monaco, "Courier New", monospace`

// Configure marked once at module load. GFM + breaks on; html disabled
// to keep the renderer safe against raw HTML in MDs (we trust the source,
// but no reason to evaluate it).
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
})

function looksInternal(href) {
  if (!href) return false
  if (/^https?:\/\//i.test(href)) return false
  if (/^mailto:/i.test(href)) return false
  if (/^#/.test(href)) return false
  return true
}

function deriveTitle(content, fallback) {
  if (!content) return fallback
  const m = content.match(/^\s*#\s+(.+?)\s*$/m)
  return (m && m[1]) || fallback
}

function formatTimestamp(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function ProjectFileReader({
  content = '',
  kind = 'canon',     // 'canon' | 'tape' | 'research-drop'
  name = '',
  lastModified = '',
  onLinkClick = null,
}) {
  const articleRef = useRef(null)

  const html = useMemo(() => {
    if (!content) return ''
    try {
      return marked.parse(content)
    } catch (err) {
      return `<p>Could not render this file: ${(err && err.message) || 'unknown error'}</p>`
    }
  }, [content])

  const title = useMemo(() => deriveTitle(content, name || 'Untitled'), [content, name])
  const stamp = formatTimestamp(lastModified)

  // Intercept link clicks once the article DOM is in place. Internal
  // links (relative paths, .md) call onLinkClick; external open in a new tab.
  useEffect(() => {
    const node = articleRef.current
    if (!node) return

    function handleClick(e) {
      const a = e.target.closest && e.target.closest('a[href]')
      if (!a || !node.contains(a)) return
      const href = a.getAttribute('href') || ''
      if (looksInternal(href)) {
        e.preventDefault()
        if (typeof onLinkClick === 'function') onLinkClick(href)
        return
      }
      // External — make it open in a new tab safely.
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }

    node.addEventListener('click', handleClick)
    return () => node.removeEventListener('click', handleClick)
  }, [html, onLinkClick])

  const isTape = kind === 'tape'
  const isResearch = kind === 'research-drop'

  const kindChip = isTape
    ? { label: 'What the agent remembers', tone: 'tape' }
    : isResearch
      ? { label: 'Research drop', tone: 'research' }
      : null

  return (
    <article
      data-cv4-reader
      data-kind={kind}
      style={{
        // Subtle tint differentiates the tape from authored canon at a glance.
        background: isTape ? 'var(--c-accent-bg, rgba(16,185,129,0.06))' : 'transparent',
        borderRadius: 12,
        padding: '40px clamp(20px, 5vw, 56px)',
        color: C.text,
        fontFamily: FF_ARTICLE_BODY,
        fontSize: 17,
        lineHeight: 1.7,
        letterSpacing: '0.005em',
        maxWidth: 760,        // ~70ch at 17px body
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <ReaderStyles />

      {kindChip && (
        <div
          data-cv4-reader-chip
          data-tone={kindChip.tone}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 999,
            background: isTape ? 'var(--c-accent-bg)' : 'var(--c-chip-bg)',
            border: `1px solid ${C.border2}`,
            fontFamily: FF_MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isTape ? C.accent : C.text2,
            marginBottom: 20,
          }}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isTape ? C.accent : C.text2,
            opacity: 0.85,
          }} />
          {kindChip.label}
        </div>
      )}

      <header style={{ marginBottom: 32 }}>
        <h1
          data-cv4-reader-title
          style={{
            fontFamily: FF_ARTICLE_HEAD,
            fontSize: 'clamp(28px, 4.5vw, 40px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: C.text,
            margin: '0 0 10px',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            fontFamily: FF_MONO,
            fontSize: 12,
            color: C.muted,
            letterSpacing: '0.04em',
          }}
        >
          {name && <span data-cv4-reader-name>{name}</span>}
          {name && stamp && <span aria-hidden style={{ opacity: 0.5 }}>·</span>}
          {stamp && <span data-cv4-reader-stamp>{stamp}</span>}
        </div>
      </header>

      <div
        ref={articleRef}
        data-cv4-reader-body
        // marked.parse returns HTML built from a trusted source (project canon
        // MDs that agents authored). html option is off so embedded HTML in
        // the MD body is escaped.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}

// Scoped article body styles. Live inline so the component is drop-in
// anywhere without an external CSS file. All selectors gated on
// [data-cv4-reader-body] so they never leak.
function ReaderStyles() {
  return (
    <style>{`
      [data-cv4-reader-body] {
        font-family: ${FF_ARTICLE_BODY};
        font-size: 17px;
        line-height: 1.7;
        color: var(--c-text);
      }
      [data-cv4-reader-body] > * + * { margin-top: 1.2em; }
      [data-cv4-reader-body] h1,
      [data-cv4-reader-body] h2,
      [data-cv4-reader-body] h3,
      [data-cv4-reader-body] h4,
      [data-cv4-reader-body] h5,
      [data-cv4-reader-body] h6 {
        font-family: ${FF_ARTICLE_HEAD};
        font-weight: 700;
        color: var(--c-text);
        line-height: 1.25;
        letter-spacing: -0.015em;
        margin-top: 2em;
        margin-bottom: 0.6em;
      }
      [data-cv4-reader-body] h1 { font-size: 1.9em; letter-spacing: -0.02em; }
      [data-cv4-reader-body] h2 { font-size: 1.45em; }
      [data-cv4-reader-body] h3 { font-size: 1.2em;  font-weight: 600; }
      [data-cv4-reader-body] h4 { font-size: 1.05em; font-weight: 600; color: var(--c-text2); text-transform: uppercase; letter-spacing: 0.05em; }
      [data-cv4-reader-body] h5,
      [data-cv4-reader-body] h6 { font-size: 1em; font-weight: 600; color: var(--c-text2); }
      [data-cv4-reader-body] p {
        margin: 0;
        color: var(--c-text);
      }
      [data-cv4-reader-body] a {
        color: var(--c-accent);
        text-decoration: none;
        border-bottom: 1px solid var(--c-accent-bg);
        transition: border-color 0.15s ease, color 0.15s ease;
      }
      [data-cv4-reader-body] a:hover {
        color: var(--c-accent2);
        border-bottom-color: var(--c-accent);
      }
      [data-cv4-reader-body] strong { font-weight: 600; color: var(--c-text); }
      [data-cv4-reader-body] em     { font-style: italic; color: var(--c-text); }
      [data-cv4-reader-body] ul,
      [data-cv4-reader-body] ol {
        padding-left: 1.4em;
        margin: 0;
      }
      [data-cv4-reader-body] li     { margin-bottom: 0.5em; }
      [data-cv4-reader-body] li > p { display: inline; }
      [data-cv4-reader-body] li > ul,
      [data-cv4-reader-body] li > ol { margin-top: 0.5em; }
      [data-cv4-reader-body] blockquote {
        margin: 0;
        padding: 0.2em 0 0.2em 1.1em;
        border-left: 3px solid var(--c-border2);
        background: var(--c-chip-bg);
        border-radius: 0 6px 6px 0;
        color: var(--c-text2);
        font-style: italic;
      }
      [data-cv4-reader-body] code {
        font-family: ${FF_MONO};
        font-size: 0.88em;
        padding: 0.15em 0.4em;
        background: var(--c-chip-bg);
        border-radius: 4px;
        color: var(--c-text);
      }
      [data-cv4-reader-body] pre {
        font-family: ${FF_MONO};
        font-size: 0.85em;
        line-height: 1.55;
        padding: 16px 18px;
        background: var(--c-chip-bg);
        border: 1px solid var(--c-border);
        border-radius: 8px;
        overflow-x: auto;
        color: var(--c-text);
      }
      [data-cv4-reader-body] pre code {
        background: transparent;
        padding: 0;
        font-size: 1em;
      }
      [data-cv4-reader-body] hr {
        border: 0;
        border-top: 1px solid var(--c-border2);
        margin: 2.4em 0;
      }
      [data-cv4-reader-body] table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
      }
      [data-cv4-reader-body] th,
      [data-cv4-reader-body] td {
        text-align: left;
        padding: 10px 14px;
        border-bottom: 1px solid var(--c-border2);
      }
      [data-cv4-reader-body] th {
        font-weight: 600;
        color: var(--c-text2);
        font-family: ${FF_MONO};
        font-size: 0.8em;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border-bottom-color: var(--c-border);
      }
      [data-cv4-reader-body] img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        border: 1px solid var(--c-border);
      }
      @media (max-width: 600px) {
        [data-cv4-reader] {
          padding: 24px 18px !important;
          font-size: 16px;
        }
        [data-cv4-reader-body] { font-size: 16px; }
        [data-cv4-reader-body] h1 { font-size: 1.6em; }
        [data-cv4-reader-body] h2 { font-size: 1.3em; }
      }
    `}</style>
  )
}
