// ChatMessageRenderer.jsx -- Renders markdown chat message content cleanly
// Handles: bullet lists (* item), bold (**text**), and general markdown via `marked`.
// Used by BaseTierChat, SupportChat, and any future chat surfaces.

import React from 'react'
import { marked } from 'marked'

const renderer = new marked.Renderer()
// All links open in new tab. marked v16+ passes a single token object and
// expects the renderer to parse child tokens for the link text.
renderer.link = function({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens)
  // Guard: if href is missing or contains fabricated placeholders ('undefined', 'null',
  // '[object Object]') that Gemini occasionally emits, render only the link text.
  if (!href || /\bundefined\b|\bnull\b|\[object Object\]/.test(href)) {
    return text
  }
  const t = title ? ` title="${title}"` : ''
  return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`
}
marked.setOptions({ breaks: true, gfm: true, renderer })

const IMAGE_URL_RE = /\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?$/i

function preprocessBareUrls(text) {
  // Convert bare URLs not already inside markdown link/image syntax into GFM autolinks or images
  // Negative lookbehind: skip if preceded by ( or [ (already in markdown syntax)
  return text.replace(/(?<![(\[!])(https?:\/\/[^\s<>"')\]]+)/g, (url) => {
    if (IMAGE_URL_RE.test(url)) return `![](${url})`
    return `<${url}>`
  })
}

function parseMarkdown(text) {
  if (!text) return ''
  try {
    let html = marked.parse(preprocessBareUrls(text))
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    return html
  } catch {
    return text
  }
}

const listStyles = `
  .cmr-content, .message-content {
    font-family: inherit;
    font-size: 0.95rem;
    color: inherit;
    line-height: 1.6;
    word-break: break-word;
    white-space: normal;
  }
  .cmr-content ul, .cmr-content ol,
  .message-content ul, .message-content ol {
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
    padding-left: 0;
  }
  .cmr-content ul, .message-content ul { list-style-type: disc; }
  .cmr-content ol, .message-content ol { list-style-type: decimal; }
  .cmr-content li, .message-content li {
    line-height: 1.5;
    margin-bottom: 0.25rem;
  }
  .cmr-content li > ul, .cmr-content li > ol,
  .message-content li > ul, .message-content li > ol {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  .cmr-content p, .message-content p {
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
  }
  .cmr-content p:first-child, .message-content p:first-child { margin-top: 0; }
  .cmr-content p:last-child, .message-content p:last-child { margin-bottom: 0; }
  .cmr-content strong, .message-content strong { font-weight: 600; }
  .cmr-content em, .message-content em { font-style: italic; }
  .cmr-content h1, .cmr-content h2, .cmr-content h3,
  .cmr-content h4, .cmr-content h5, .cmr-content h6,
  .message-content h1, .message-content h2, .message-content h3,
  .message-content h4, .message-content h5, .message-content h6 {
    font-weight: 600;
    line-height: 1.3;
    margin: 0.75rem 0 0.4rem 0;
  }
  .cmr-content h1, .message-content h1 { font-size: 1.2em; }
  .cmr-content h2, .message-content h2 { font-size: 1.1em; }
  .cmr-content h3, .message-content h3 { font-size: 1.05em; }
  .cmr-content blockquote, .message-content blockquote {
    border-left: 3px solid rgba(255,255,255,0.2);
    margin: 0.5rem 0;
    padding: 0.25rem 0.75rem;
    opacity: 0.8;
  }
  .cmr-content a, .message-content a {
    color: #60a5fa;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(96,165,250,0.3);
    transition: color 0.15s, text-decoration-color 0.15s;
    word-break: break-all;
  }
  .cmr-content a:hover, .message-content a:hover {
    color: #93bbfc;
    text-decoration-color: rgba(96,165,250,0.6);
  }
  .cmr-content hr, .message-content hr {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.12);
    margin: 0.75rem 0;
  }
  .cmr-content code, .message-content code {
    font-family: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.85em;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 5px;
    padding: 2px 6px;
    color: #e2e8f0;
  }
  .cmr-content pre, .message-content pre {
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 8px 0;
  }
  .cmr-content pre code, .message-content pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #cbd5e1;
  }
  .cmr-content img, .message-content img {
    max-width: 100%;
    border-radius: 8px;
    margin-top: 6px;
    display: block;
    cursor: pointer;
  }
  .chat-message-container {
    display: contents;
  }
`

let stylesInjected = false

function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = listStyles
  document.head.appendChild(style)
  stylesInjected = true
}

export default function ChatMessageRenderer({ content, className = '', style = {}, message = null }) {
  injectStyles()

  if (message?.type === 'task_created_notification') {
    let meta = message.metadata
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta) } catch { meta = {} }
    }
    const title             = meta?.title             || message.title             || ''
    const status            = meta?.status            || message.status            || ''
    const assignedAgentName = meta?.assigned_agent_name || message.assigned_agent_name || ''
    const description       = meta?.description       || message.description       || ''

    const statusLower = (status || '').toLowerCase()
    let pillStyle
    if (statusLower === 'queued' || statusLower === 'pending') {
      pillStyle = { background: 'rgba(234,179,8,0.12)', color: '#EAB308' }
    } else if (statusLower === 'done' || statusLower === 'shipped' || statusLower === 'completed') {
      pillStyle = { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
    } else {
      pillStyle = { background: 'rgba(16,185,129,0.12)', color: '#10B981' }
    }
    const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Queued'

    return (
      <div className="chat-message-container">
        <div style={{
          alignSelf: 'flex-start',
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 14,
          padding: '12px 16px',
          maxWidth: '88%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 6,
              background: 'rgba(16,185,129,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#10B981', fontWeight: 800,
            }}>+</div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#10B981',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: "'JetBrains Mono', monospace",
            }}>Task Created</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{title}</div>
          {description ? (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{description}</div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              ...pillStyle,
            }}>{statusLabel}</span>
            {assignedAgentName ? (
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{assignedAgentName}</span>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-message-container">
      <div
        className={`cmr-content message-content ${className}`}
        style={{ whiteSpace: 'normal', ...style }}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
      />
    </div>
  )
}
