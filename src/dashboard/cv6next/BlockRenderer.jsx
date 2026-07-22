/**
 * BlockRenderer — shared result/block rendering for both ChatGoalThread and ChatLifecycle.
 * Extracted from ChatGoalThread.jsx so both chat surfaces can render the same blocks.
 *
 * The Result component dispatches to specialized renderers for each block type:
 * success, snag, question, choice, data, summary, email, artifact, audio, video, code,
 * thinking, replies, confirm, gallery.
 *
 * ActionChips (tappable choice chips) and specialized block renderers all live here.
 */

import React, { useMemo, useState } from 'react';
import { ReviewCtx } from './ChatGoalThread.jsx';
import ChatMessageRenderer, { ChatInlineRenderer } from '../components/ChatMessageRenderer.jsx';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Tappable action chips shared by email/summary/media blocks.
export function ActionChips({ actions, primaryFirst = true, onAction, actionVerb }) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  if (!list.length) return null;
  return (
    <div className="chips">
      {list.map((a, i) => {
        const label = typeof a === 'string' ? a : (a.label || '');
        return (
          <button
            key={i}
            className={`chip-btn ${primaryFirst && i === 0 ? 'is-primary' : ''}`}
            // When the chip performs a real action (e.g. sending a reply) the
            // accessible name names that action, so it reads as the mutating
            // control it is rather than a bare label.
            aria-label={actionVerb ? `${actionVerb}: ${label}` : undefined}
            onClick={() => onAction?.(label)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Normalize data block (columns + rows + computed chart percentages).
function normalizeData(b) {
  const columns = Array.isArray(b.columns) ? b.columns : [];
  const rawRows = Array.isArray(b.rows) ? b.rows : [];
  const rows = rawRows.map((r) => (Array.isArray(r) ? { cells: r } : { cells: r?.cells || [] }));
  const metricOf = (cells) => num(cells[1]);
  const max = rows.reduce((m, r) => Math.max(m, metricOf(r.cells)), 0);
  rows.forEach((r) => { r.pct = max > 0 ? Math.round((metricOf(r.cells) / max) * 100) : 0; });
  const totals = b.totals ? (Array.isArray(b.totals) ? { cells: b.totals } : { cells: b.totals.cells || [] }) : null;
  return { title: b.title || 'Data', columns, rows, totals };
}

// Email block renderer.
function EmailBlock({ block, onAction }) {
  const atts = Array.isArray(block.attachments) ? block.attachments : [];
  const openReview = React.useContext(ReviewCtx);
  return (
    <div className="cmail" style={{ marginTop: 4 }}>
      <div className="cmail-h">
        <span className="ma" style={{ background: 'rgba(244,114,182,.18)', color: '#F8A8D0' }}>
          {block.initials || (block.from || '·').slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mfrom">{block.from || 'Sender'}{block.org ? ` · ${block.org}` : ''}</div>
          <div className="msub">{block.subject || ''}</div>
        </div>
        <span className="cmail-tag">Email</span>
      </div>
      {block.quote ? <div className="cmail-q"><ChatMessageRenderer content={block.quote} className="cv6-agent-prose" /></div> : null}
      {atts.length ? (
        <div style={{ padding: '0 14px 12px' }}>
          {atts.map((f, i) => (
            <div key={i} className="frowm" style={{ marginTop: i ? 8 : 0 }}>
              <span className="fg">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--pink-400)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{f.name || 'file'}</div>
                {f.size ? <div className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{f.size}</div> : null}
              </div>
              {f.url ? <button className="pillbtn" onClick={() => openReview?.({ url: f.url, name: f.name || f.url })}>Review</button> : null}
            </div>
          ))}
        </div>
      ) : null}
      {block.flagged ? (
        <div className="cmail-f">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flex: 'none' }}
          >
            <path d="M4 22V4h13l-2 4 2 4H4" />
          </svg>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--faint)' }}>{block.flagged}</span>
        </div>
      ) : null}
      {block.actions ? (
        <div style={{ padding: '0 14px 13px' }}>
          <ActionChips actions={block.actions} onAction={onAction} />
        </div>
      ) : null}
    </div>
  );
}

// Summary block renderer.
function SummaryBlock({ block, onAction }) {
  const bullets = Array.isArray(block.bullets) ? block.bullets : [];
  const actions = Array.isArray(block.actions) ? block.actions : [];
  return (
    <div style={{ marginTop: 4 }}>
      <div className="csum">
        <div className="csum-h">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)">
            <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
          </svg>
          <span className="se">Summary</span>
          {block.meta ? <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>{block.meta}</span> : null}
        </div>
        <div className="csum-body">
          {bullets.map((b, i) => {
            const text = typeof b === 'string' ? b : (b.text || '');
            const warn = typeof b === 'object' && b.warn;
            return (
              <div key={i} className={`sbullet${warn ? ' is-warn' : ''}`}>
                <span className="sd" />
                <ChatMessageRenderer content={text} className="cv6-agent-prose" />
              </div>
            );
          })}
        </div>
        {actions.length ? (
          <div className="cact">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Action items</div>
            {actions.map((a, i) => {
              const text = typeof a === 'string' ? a : (a.text || '');
              const done = typeof a === 'object' && a.done;
              return (
                <div key={i} className={`aitem${done ? ' is-done' : ''}`}>
                  <span className="ck">
                    {done ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'block', margin: 1 }}
                      >
                        <path d="m5 12 4 4L19 7" />
                      </svg>
                    ) : null}
                  </span>
                  <span style={done ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}><ChatInlineRenderer content={text} /></span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {block.chips ? <ActionChips actions={block.chips} onAction={onAction} /> : null}
    </div>
  );
}

// Artifact block renderer. Review opens the deliverable in the Review tool (pin-comment
// canvas) when the surface provides ReviewCtx; without it, a real URL opens directly and
// a bare name falls back to asking the agent.
function ArtifactBlock({ block, onAction }) {
  const openReview = React.useContext(ReviewCtx);
  const isShot = block.kind !== 'live';
  const onReview = () => {
    if (openReview && block.url) {
      openReview({ url: block.url, name: block.name || block.url, type: isShot ? '' : 'sitelive' });
      return;
    }
    onAction?.(`Open ${block.name || 'this'} in Review`);
  };
  return (
    <div className="cartifact" style={{ marginTop: 4 }}>
      {!isShot ? (
        <div className="cart-omni">
          <span className="lights">
            <i />
            <i />
            <i />
          </span>
          <span className="url">{block.url || block.name || 'preview'}</span>
        </div>
      ) : null}
      <div
        className={`cart-canvas${isShot ? ' is-shot' : ''}`}
        style={!isShot ? { aspectRatio: '16/9', background: 'linear-gradient(160deg,#101822,#0a0e14)' } : undefined}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isShot ? '#c9ccd1' : 'rgba(255,255,255,.4)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <div className="cart-bar">
        <span className="cart-kind">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {isShot ? 'Screenshot' : 'Live site'}
        </span>
        <span style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {block.name || ''}
        </span>
        <button className="review-btn" onClick={onReview}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
          Review
        </button>
      </div>
    </div>
  );
}

// Audio block renderer.
function AudioBlock({ block }) {
  const heights = Array.isArray(block.wave) && block.wave.length ? block.wave : [30, 60, 85, 50, 100, 70, 40, 80, 55, 95, 45, 65, 35, 75, 50, 90, 40, 60];
  const lit = Math.round(heights.length * 0.38);
  return (
    <div style={{ marginTop: 4 }}>
      <div className="caudio">
        <button className="play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
            <path d="M7 5l12 7-12 7Z" />
          </svg>
        </button>
        <div className="wave">{heights.map((h, i) => <i key={i} className={i < lit ? 'on' : ''} style={{ height: `${h}%` }} />)}</div>
        {block.duration ? <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', flex: 'none' }}>{block.duration}</span> : null}
      </div>
      {block.transcript ? <div className="bubble" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}><ChatMessageRenderer content={block.transcript} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// Video block renderer.
function VideoBlock({ block }) {
  return (
    <div className="cvideo" style={{ marginTop: 4 }}>
      <div className="vplay">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
          <path d="M8 5l11 7-11 7Z" />
        </svg>
      </div>
      <div className="vmeta">
        {block.duration ? <span className="vchip">▶ {block.duration}</span> : <span />}
        <span style={{ flex: 1 }} />
        {block.title ? <span className="vchip">{block.title}</span> : null}
      </div>
    </div>
  );
}

// Data/table block renderer.
function DataBlock({ block }) {
  const d = useMemo(() => normalizeData(block), [block]);
  const [view, setView] = useState('table');
  const cols = d.columns.length || (d.rows[0]?.cells.length || 1);
  const grid = `1.1fr ${Array(Math.max(0, cols - 1)).fill('1fr').join(' ')}`.trim();
  return (
    <div className="cdata" style={{ marginTop: 4 }}>
      <div className="cdata-h">
        <span className="dt">{d.title}</span>
        <div className="toggle">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
            Table
          </button>
          <button className={view === 'chart' ? 'on' : ''} onClick={() => setView('chart')}>
            Chart
          </button>
        </div>
      </div>
      {view === 'table' ? (
        <div className="tbl">
          {d.columns.length ? (
            <div className="tr th" style={{ gridTemplateColumns: grid }}>
              {d.columns.map((c, i) => (
                <div key={i} className={i === 0 ? '' : 'num'}>
                  {c}
                </div>
              ))}
            </div>
          ) : null}
          {d.rows.map((r, ri) => (
            <div key={ri} className="tr" style={{ gridTemplateColumns: grid }}>
              {r.cells.map((cell, ci) => (
                <div key={ci} className={ci === 0 ? '' : 'num'} data-label={d.columns[ci] || ''}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
          {d.totals ? (
            <div className="tr tf" style={{ gridTemplateColumns: grid }}>
              {d.totals.cells.map((cell, ci) => (
                <div key={ci} className={ci === 0 ? '' : 'num pos'} data-label={d.columns[ci] || ''}>
                  {cell}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bars">
          {d.rows.map((r, ri) => (
            <div key={ri} className="bar">
              <i style={{ height: `${Math.max(4, r.pct)}%` }} />
              <span>{r.cells[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Choice block renderer.
function ChoiceBlock({ block, onAction }) {
  const choices = Array.isArray(block.choices) ? block.choices : [];
  return (
    <div style={{ marginTop: 4 }}>
      {block.prompt ? <div className="gssub" style={{ marginBottom: 6 }}><ChatMessageRenderer content={block.prompt} className="cv6-agent-prose" /></div> : null}
      <div className="chips is-choice">
        {choices.map((c) => {
          const isAlt = c.style === 'alt';
          const text = c.title || c.label || '';
          const isRec = !isAlt;
          const badge = isRec && c.label && c.label !== text ? c.label : null;
          return (
            <button
              key={c.id}
              className={`chip-btn ${isRec ? 'is-recommended' : 'is-alt'}`}
              onClick={() => onAction?.(c.title || c.label)}
            >
              <span className="chip-dot" aria-hidden="true">
                {isRec ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </span>
              <span className="chip-main">
                {badge ? <span className="chip-badge">{badge}</span> : null}
                <span className="chip-txt">{text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Question block renderer.
function QuestionBlock({ block, onAction }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  return (
    <div className="cblk is-question" style={{ marginTop: 4 }}>
      <div className="cblk-h">
        <span className="ci">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <span className="ct">Quick question</span>
      </div>
      <div className="cblk-b"><ChatMessageRenderer content={block.text} className="cv6-agent-prose" /></div>
      {opts.length ? (
        <div className="chips">
          {opts.map((o) => (
            <button key={o.id} className="chip-btn" onClick={() => onAction?.(o.label)}>
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Code block renderer.
function CodeBlock({ block }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const diff = [block.added != null ? `+${block.added}` : '', block.removed != null ? `−${block.removed}` : ''].filter(Boolean).join(' ');
  const meta = [block.lang, diff].filter(Boolean).join(' · ');
  const copy = () => {
    try {
      navigator.clipboard?.writeText(block.code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  const glyph = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#79c0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
    </svg>
  );
  if (!open) {
    return (
      <div className="codechip" style={{ marginTop: 4 }} onClick={() => setOpen(true)}>
        <span className="cg">{glyph}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{block.file || 'code'}</div>
          {meta ? <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{meta}</div> : null}
        </div>
        <button className="pillbtn" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
          Show code
        </button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 4 }}>
      <div className="ccode">
        <div className="ccode-h">
          {glyph}
          <span className="fn">{block.file || 'code'}</span>
          {block.lang ? <span className="lang">{block.lang}</span> : null}
          <button className="cbtn" onClick={copy} title="Copy">
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
        </div>
        <pre>{block.code || ''}</pre>
      </div>
      {block.explain ? <div className="bubble" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}><ChatMessageRenderer content={block.explain} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// Thinking block renderer (agent working state).
function ThinkingBlock({ block }) {
  return (
    <div className="thinking" style={{ marginTop: 4 }}>
      <span className="dot3">
        <i />
        <i />
        <i />
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{block.label || 'Working…'}</span>
    </div>
  );
}

// Replies block renderer (quick-reply chips).
function RepliesBlock({ block, onAction }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  return (
    <div style={{ marginTop: 4 }}>
      {block.prompt ? <div className="bubble"><ChatMessageRenderer content={block.prompt} className="cv6-agent-prose" /></div> : null}
      <div className="chips">
        {opts.map((o, i) => {
          const label = typeof o === 'string' ? o : (o.label || '');
          const primary = typeof o === 'object' && o.primary;
          return (
            <button key={i} className={`chip-btn ${primary ? 'is-primary' : ''}`} onClick={() => onAction?.(label)}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Confirm block renderer.
function ConfirmBlock({ block, onAction }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div className="cblk" style={{ borderColor: 'var(--accent-weak)' }}>
        {block.text ? <div className="cblk-b" style={{ marginBottom: 11 }}><ChatMessageRenderer content={block.text} className="cv6-agent-prose" /></div> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="chip-btn is-primary"
            style={{ flex: 1, justifyContent: 'center', height: 40 }}
            onClick={() => onAction?.(block.confirmLabel || 'Confirm and send')}
          >
            {block.confirmLabel || 'Confirm & send'}
          </button>
          <button
            className="chip-btn"
            style={{ flex: 'none', height: 40 }}
            onClick={() => onAction?.(block.cancelLabel || 'Cancel')}
          >
            {block.cancelLabel || 'Cancel'}
          </button>
        </div>
      </div>
      {block.note ? <div style={{ fontSize: 11, color: 'var(--faint)', paddingLeft: 2, marginTop: 4 }}><ChatMessageRenderer content={block.note} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// Gallery block renderer.
function GalleryBlock({ block }) {
  const imgs = Array.isArray(block.images) ? block.images : [];
  const shown = imgs.slice(0, 5);
  const overflow = imgs.length - shown.length;
  const openReview = React.useContext(ReviewCtx);
  const open = (im) => {
    if (im?.url) openReview?.({ url: im.url, name: im.label || 'Image' });
  };
  return (
    <div style={{ marginTop: 4 }}>
      <div className="cgal">
        {shown.map((im, i) => (
          <div
            key={i}
            className={`ph${i === 0 && shown.length >= 3 ? ' span2' : ''}`}
            onClick={() => open(im)}
            style={{ cursor: im?.url ? 'pointer' : 'default' }}
          >
            {im?.url ? (
              <img src={im.url} alt={im.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.6" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
            {i === shown.length - 1 && overflow > 0 ? <span className="more">+{overflow}</span> : null}
          </div>
        ))}
      </div>
      {block.caption ? (
        <div className="gal-cap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span><ChatInlineRenderer content={block.caption} /></span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Result — main dispatcher for all block types.
 * Renders the appropriate component based on block.type.
 * onAction is called when user taps a choice, replies, confirms, etc.
 */
export function Result({ block, onAction }) {
  if (!block || typeof block !== 'object') return null;

  if (block.type === 'success') {
    return (
      <div className="cblk is-success" style={{ marginTop: 4 }}>
        <div className="cblk-h">
          <span className="ci">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          <span className="ct"><ChatInlineRenderer content={block.title || 'Done'} /></span>
        </div>
        {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}><ChatMessageRenderer content={block.detail} className="cv6-agent-prose" /></div> : null}
      </div>
    );
  }
  if (block.type === 'snag') {
    return (
      <div className="cblk is-snag" style={{ marginTop: 4 }}>
        <div className="cblk-h">
          <span className="ci">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17v.01" />
              <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <span className="ct"><ChatInlineRenderer content={block.title || 'Snag'} /></span>
        </div>
        {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}><ChatMessageRenderer content={block.detail} className="cv6-agent-prose" /></div> : null}
      </div>
    );
  }

  if (block.type === 'data') return <DataBlock block={block} />;
  if (block.type === 'choice') return <ChoiceBlock block={block} onAction={onAction} />;
  if (block.type === 'question') return <QuestionBlock block={block} onAction={onAction} />;
  if (block.type === 'email') return <EmailBlock block={block} onAction={onAction} />;
  if (block.type === 'summary') return <SummaryBlock block={block} onAction={onAction} />;
  if (block.type === 'artifact') return <ArtifactBlock block={block} onAction={onAction} />;
  if (block.type === 'audio') return <AudioBlock block={block} />;
  if (block.type === 'video') return <VideoBlock block={block} />;
  if (block.type === 'code') return <CodeBlock block={block} />;
  if (block.type === 'thinking') return <ThinkingBlock block={block} />;
  if (block.type === 'replies') return <RepliesBlock block={block} onAction={onAction} />;
  if (block.type === 'confirm') return <ConfirmBlock block={block} onAction={onAction} />;
  if (block.type === 'gallery') return <GalleryBlock block={block} />;

  return null;
}
