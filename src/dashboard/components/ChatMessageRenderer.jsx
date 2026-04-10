// ChatMessageRenderer.jsx -- Renders markdown chat message content cleanly
// Handles: bullet lists (* item), bold (**text**), and general markdown via `marked`.
// Used by BaseTierChat, SupportChat, and any future chat surfaces.

import React from 'react'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

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
    text-underline-offset: 2px;
  }
  .cmr-content hr, .message-content hr {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.12);
    margin: 0.75rem 0;
  }
  .cmr-content code, .message-content code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85em;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    padding: 1px 4px;
  }
  .cmr-content pre, .message-content pre {
    background: rgba(0,0,0,0.3);
    border-radius: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    margin: 6px 0;
  }
  .cmr-content pre code, .message-content pre code {
    background: none;
    padding: 0;
    font-size: 12px;
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
    const taskId            = meta?.task_id           || message.task_id           || ''
    const text = `Task '${title}' created, status: ${status}, assigned to: ${assignedAgentName} (ID: ${taskId})`
    return (
      <div className="chat-message-container">
        <div className={`cmr-content message-content ${className}`} style={{ whiteSpace: 'normal', ...style }}>
          {text}
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
