// ChatLifecycle -- the plain conversation over its whole life (design item 1).
// The "jumbled pile" fix: a room's real messages are grouped by day. The latest
// day stays open inline; older days collapse into one-line cards you tap to expand,
// so hundreds of past turns stop being a wall of text. Long single messages clamp
// with a "show more". A jump-to-latest pill appears when you scroll up.
//
// This is the plain-conversation path (no live structured goal). When the agent is
// emitting a live Goal Thread, ChatGoalThread renders that instead. Honest with real
// data: we fold by DAY (which we have), not by past "goals" (never stored).
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { GoalThreadBody, SendCtx, ReviewCtx, liveStepsToBlocks } from './ChatGoalThread.jsx';
import { Result } from './BlockRenderer.jsx';
import ResultLinkCards from './ResultLinkCard.jsx';
import { useDictation } from './data/useDictation.js';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import Cv6FullComposer from './Cv6FullComposer.jsx';
import ColumnExpandButton from './ColumnExpandButton.jsx';
import { FilesShelf, useRoomCrossings } from './ChatDesktop.jsx';
import { Cv6MessageThread } from './MessageThread.jsx';
import { supabase } from '../lib/supabase.js';
// The chat file modal renders REAL previews through the same machinery the
// Review/Files viewer uses (R-CHAT-FILE-MODAL): buildDeliverableBody makes the
// stage HTML for any type; the doc hooks hydrate pdf/docx/html shells in place.
import { buildDeliverableBody } from './data/useReview.js';
import { chatFileToReviewTarget } from './data/previewResolve.js';
import { normalizeReviewHandoff } from './data/reviewTargetResolve.js';
import { usePdfDocs } from './data/pdfDocView.js';
import { useDocxDocs } from './data/docxDocView.js';
import { useHtmlDocs } from './data/htmlDocView.js';
import RoomSettingsDialog from './RoomSettingsDialog.jsx';
import RoutedHereBar from './RoutedHereBar.jsx';
import RoomWorkList from './RoomWorkList.jsx';

// Mobile-header avatar tint + live ring keyed to the room's agent status
// (drop-7 redesign: avatar feels present, ring pulses when live/working).
const AV_TINT = {
  live:    { background: 'rgba(52,211,153,.18)', color: 'var(--success)' },
  working: { background: 'rgba(245,176,93,.18)', color: 'var(--accent)' },
  blocked: { background: 'rgba(251,191,36,.18)', color: 'var(--warn)' },
};
const DOT = { live: 'var(--success)', working: 'var(--accent)', blocked: 'var(--warn)' };
const avTint = (s) => AV_TINT[s] || { background: 'var(--surface-2)', color: 'var(--muted)' };
const avRing = (s) => (s === 'live' ? 'live' : s === 'working' ? 'working' : 'ready');
const dotColor = (s) => DOT[s] || 'var(--muted)';

function dayKey(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Group messages (oldest -> newest) into day buckets, preserving order.
function groupByDay(messages) {
  const groups = [];
  let cur = null;
  for (const m of messages) {
    const k = dayKey(m.ts);
    if (!cur || cur.key !== k) { cur = { key: k, label: dayLabel(m.ts), items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

function Avatar({ m }) {
  const tint = m.agentTint === 'accent' ? 'var(--accent)' : `var(--${m.agentTint || 'muted'}, var(--muted))`;
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.isUser ? 'var(--accent-weak)' : 'var(--surface-2)', color: m.isUser ? 'var(--accent)' : tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
      {m.agentInitials}
    </div>
  );
}

// One message. Long bodies clamp until expanded (design .longmsg containment).
function Message({ m, onSend }) {
  const ref = useRef(null);
  const [clamped, setClamped] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > 168 + 4);
  }, [m.text, open]);
  return (
    <div data-userturn={m.isUser ? '' : undefined} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar m={m} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m.time}</span>
        </div>
        <div ref={ref} className={`longmsg${clamped && !open ? ' is-clamped' : ''}`} style={open ? { maxHeight: 'none' } : undefined}>
          {m.isUser
            ? <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
            : <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}><ChatMessageRenderer content={m.text} /></div>}
        </div>
        {clamped && (
          <button className="longmsg-more" onClick={() => setOpen((v) => !v)}>{open ? 'Show less' : 'Show more'}</button>
        )}
        {m.blocks?.length ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.blocks.map((b, i) => (
              <Result key={i} block={b} onAction={onSend} />
            ))}
          </div>
        ) : null}
        {/* Completed web work: the shipped link as a tappable card (Patrik 2026-07-13). */}
        {!m.isUser && m.linkCards?.length ? <ResultLinkCards cards={m.linkCards} /> : null}
      </div>
    </div>
  );
}

// --- files in a room (design item 3) -----------------------------------------
// An agent's files show as a GALLERY of cards in the thread, not a text list.
// Tapping a card opens a quick preview with a Review option.
function fileKind(name = '', mime = '') {
  const n = String(name).toLowerCase(); const m = String(mime).toLowerCase();
  if (/^https?:\/\//.test(n) || /\.(url|link)$/.test(n)) return 'link';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|heic|bmp)$/.test(n)) return 'image';
  if (m.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi)$/.test(n)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(n)) return 'audio';
  return 'doc';
}
function fmtSize(n) {
  if (!n) return ''; if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
const KIND_TINT = { image: 'var(--violet-400)', video: 'var(--violet-400)', audio: 'var(--accent)', link: 'var(--accent)', doc: 'var(--muted)' };
function FileGlyph({ kind, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: KIND_TINT[kind] || 'var(--muted)', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'image') return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>;
  if (kind === 'video') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg>;
  if (kind === 'audio') return <svg {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
  if (kind === 'link') return <svg {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
}
// File Collection (design drop 7, agent-chat/collection.html): a batch of files an agent
// sends folds to ONE card — a preview grid for images, a compact list for docs — with a
// count and "Review all". Tapping any opens the look-only viewer below. Real files only.
function FileGallery({ files, sender, onOpen, onReview }) {
  // A lone video an agent sends reads as a VIDEO, not a grey "Documents" card:
  // it plays INLINE in the bubble (tap play / scrub / fullscreen) so it visibly
  // opens in place, and a one-tap "Comment on frames" jumps to the Review viewer
  // where the scrub bar + pin a frame + comment live. (Before: a lone video fell
  // into the docs list — allDocs === true — so it looked un-openable and the path
  // to frame-commenting was buried. Patrik 2026-07-23.)
  const onlyFile = files.length === 1 ? files[0] : null;
  const loneVideoUrl = onlyFile && fileKind(onlyFile.fileName, onlyFile.fileMime) === 'video'
    ? (onlyFile.attachmentUrl || onlyFile.url || '') : '';
  if (onlyFile && loneVideoUrl) {
    return (
      <div className="turn" style={{ marginBottom: 14 }}>
        <div className="tav" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sender?.agentInitials || '·'}</div>
        <div className="tbody">
          <div className="tname"><b>{sender?.agentName || 'Files'}</b><span className="tt">sent a video</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
            <video src={loneVideoUrl} controls playsInline preload="metadata"
              style={{ maxWidth: '100%', maxHeight: 440, width: 'auto', height: 'auto', alignSelf: 'flex-start', borderRadius: 12, background: '#000' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="fc-rev" onClick={() => onReview([onlyFile])}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
                Comment on frames
              </button>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{onlyFile.fileName || 'video'}{onlyFile.fileSize ? ` · ${fmtSize(onlyFile.fileSize)}` : ''}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const images = files.filter((f) => fileKind(f.fileName, f.fileMime) === 'image');
  const allDocs = images.length === 0;
  const totalSize = files.reduce((s, f) => s + (f.fileSize || 0), 0);
  const noun = allDocs ? 'document' : (images.length === files.length ? 'image' : 'file');
  const title = allDocs ? 'Documents' : (images.length === files.length ? 'Images' : 'Files');
  const meta = `${files.length} ${noun}${files.length === 1 ? '' : 's'}${totalSize ? ` · ${fmtSize(totalSize)}` : ''}`;
  const gridShown = files.slice(0, 8);
  const gridOverflow = files.length - gridShown.length;
  const listShown = files.slice(0, 3);
  const listOverflow = files.length - listShown.length;
  const overflow = allDocs ? listOverflow : gridOverflow;
  return (
    <div className="turn" style={{ marginBottom: 14 }}>
      <div className="tav" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sender?.agentInitials || '·'}</div>
      <div className="tbody">
        <div className="tname"><b>{sender?.agentName || 'Files'}</b><span className="tt">sent {files.length} file{files.length === 1 ? '' : 's'}</span></div>
        <div className="filecoll">
          <div className="fc-head">
            <span className="fc-ic"><FileGlyph kind={allDocs ? 'doc' : 'image'} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fc-t">{title}</div>
              <div className="fc-s">{meta}</div>
            </div>
          </div>
          {allDocs ? (
            <div className="fc-list">
              {listShown.map((f, i) => (
                <div key={i} className="fc-lrow" onClick={() => onOpen(files, i)} role="button">
                  <span className="lg"><FileGlyph kind={fileKind(f.fileName, f.fileMime)} size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fileName || 'file'}</div></div>
                  {f.fileSize ? <span className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{fmtSize(f.fileSize)}</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="fc-grid">
              {gridShown.map((f, i) => {
                const kind = fileKind(f.fileName, f.fileMime);
                const isImg = kind === 'image' && f.attachmentUrl;
                const showMore = gridOverflow > 0 && i === gridShown.length - 1;
                return (
                  <div key={i} className={`fc-tile${kind !== 'image' ? ' is-doc' : ''}`} onClick={() => onOpen(files, i)} role="button">
                    {isImg ? <img src={f.attachmentUrl} alt={f.fileName} /> : <FileGlyph kind={kind} size={18} />}
                    {showMore && <div className="more">+{gridOverflow}</div>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="fc-foot">
            <span style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)' }}>{overflow > 0 ? `+${overflow} more` : 'Tap any to preview'}</span>
            <button className="fc-rev" onClick={() => onReview(files)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
              Review all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// The chat file viewer: a real reading surface (R-CHAT-FILE-MODAL, Patrik
// 2026-07-18: "brings up a small modal but never loads the preview"). The stage
// HTML comes from buildDeliverableBody — the SAME renderer Review/Files uses —
// so every type actually renders: image/video/audio stream, pdf/docx/html
// hydrate via the doc hooks below, md/txt/code read inline. Flip through the
// collection with the arrows; "Comment in Review" hands off to the Review tool
// where pins + comments live.
function FileCollectionViewer({ files, startIndex = 0, onClose, onReview }) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, files.length - 1)));
  const f = files[idx] || files[0];
  const kind = fileKind(f.fileName, f.fileMime);
  const go = (d) => setIdx((i) => (i + d + files.length) % files.length);
  const stageRef = useRef(null);
  const [body, setBody] = useState(null); // null = loading; { html, type } when built
  // Hydrate any pdf/docx/html shells the injected body carries.
  usePdfDocs(stageRef);
  useDocxDocs(stageRef);
  useHtmlDocs(stageRef);
  const fileSig = `${f?.attachmentUrl || f?.url || ''}|${f?.fileName || f?.name || ''}`;
  useEffect(() => {
    let alive = true;
    setBody(null);
    const target = chatFileToReviewTarget(f);
    if (!target) {
      // Announcement-only file post (no URL anywhere): honest empty state; the
      // Review hand-off below still reaches the queue's copy of the file.
      setBody({ html: '<div style="padding:22px 4px;font-size:13px;line-height:1.5;">This file did not include a readable address. Open it from the Review tab instead.</div>', type: 'copy' });
      return undefined;
    }
    buildDeliverableBody({ id: target.path, title: target.title, type: target.type })
      .then((html) => { if (alive) setBody({ html: html || '', type: target.type }); })
      .catch(() => { if (alive) setBody({ html: '<div style="padding:22px 4px;font-size:13px;">This file could not be loaded right now.</div>', type: 'copy' }); });
    return () => { alive = false; };
  }, [fileSig]); // eslint-disable-line react-hooks/exhaustive-deps
  // The chat modal has no Review pin layer or scrub bar: injected video gets
  // native controls, and the inert pin-shield chrome is dropped.
  useEffect(() => {
    const wrap = stageRef.current;
    if (!wrap || body == null) return;
    wrap.querySelectorAll('video').forEach((v) => { v.controls = true; });
    wrap.querySelectorAll('.pinshield,.pinmode-toggle').forEach((n) => n.remove());
  }, [body]);
  return (
    <div className="fcviewer" onClick={onClose}>
      <div className="fcviewer-card" onClick={(e) => e.stopPropagation()}>
        <div className="fcv-top">
          <div className="mback" style={{ width: 32, height: 32 }} onClick={onClose} role="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fileName || f.name || 'file'}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{kind}{f.fileSize ? ` · ${fmtSize(f.fileSize)}` : ''}</div>
          </div>
        </div>
        {/* The reading stage. The injected body rides the .doc paper (same reading
            surface as Review/Files): light paper + dark ink for documents/text,
            transparent for media so images/video sit directly on the ground.
            Prev/next moved to the footer — floating arrows sat ON the copy. */}
        <div ref={stageRef} className="fcv-stage is-read" data-testid="chat-file-preview" data-preview-state={body == null ? 'loading' : 'ready'}>
          {body == null
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '22px 4px', color: 'var(--muted)', fontSize: 13 }}>Loading preview…</div>
            : <div className={`doc is-${body.type}`} dangerouslySetInnerHTML={{ __html: body.html }} />}
        </div>
        <div className="fcv-foot">
          {files.length > 1 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <button type="button" className="fcv-step" aria-label="Previous file" onClick={() => go(-1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', minWidth: 38, textAlign: 'center' }}>{idx + 1} / {files.length}</span>
              <button type="button" className="fcv-step" aria-label="Next file" onClick={() => go(1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></button>
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>Reading view.</span>
          )}
          <span style={{ flex: 1 }} />
          <button className="fc-rev" onClick={() => onReview([f])}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
            Comment in Review
          </button>
        </div>
      </div>
    </div>
  );
}
// An agent turn that IS a live Goal Thread (the structured step thread), rendered inline
// as that turn so the conversation history stays above it. The header (avatar + title +
// time) matches a normal turn; the body is the real step thread from the agent's blocks.
function GoalTurn({ m, goal, blocks }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar m={m} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m.time}</span>
        </div>
        <GoalThreadBody goal={goal} blocks={blocks || m.blocks} header={false} />
        {/* A completion message renders as a goal-thread note (injectWorkSteps), so its
            shipped-link card must ride HERE too — Message's card never runs for it. */}
        {!m.isUser && m.linkCards?.length ? <ResultLinkCards cards={m.linkCards} /> : null}
      </div>
    </div>
  );
}

// (The old dot-pulse ThinkingTurn was removed 2026-06-27 — every surface now shows the one
// shared progress thread, on iff the agent is working, never a separate typing indicator.)

// Walk a run of messages; collapse consecutive file messages into one gallery, and render
// any structured (Goal Thread) message inline as its step thread.
function renderItems(items, onOpenFile, goal, onReview, onSend) {
  const out = []; let run = [];
  const flush = (key) => { if (run.length) { out.push(<FileGallery key={`g${key}`} files={run} sender={run[0]} onOpen={onOpenFile} onReview={onReview} />); run = []; } };
  items.forEach((m, i) => {
    if (m.isFile) { run.push(m); }
    else if (m.blocks && m.blocks.length) { flush(i); out.push(<GoalTurn key={i} m={m} goal={goal} />); }
    else { flush(i); out.push(<Message key={i} m={m} onSend={onSend} />); }
  });
  flush('end');
  return out;
}

// An older day, folded into a one-line card you tap to open.
function DayCard({ group, onOpenFile, goal, onReview, onSend }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        <Cv6MessageThread
          messages={group.items}
          goal={goal}
          variant="mobile"
          mode="day-folded"
          renderBlocks="goalBody"
          renderAttachments="mobileGallery"
          renderLiveWork="goalBody"
          allowBlocks
          allowAttachments
          allowLinkCards
          allowChips={false}
          onAction={onSend}
          onOpenFile={onOpenFile}
          onReviewFiles={onReview}
          MobileFileGallery={FileGallery}
        />
      </div>
    </div>
  );
}

// ── Files in this room, from chat (Patrik #1, chat-surface WD40 R1) ──────────
// A CV6 bottom sheet over the conversation: the SAME crossings panel the desktop
// Files drawer shows (this chat's files, From agent / You sent — drop 1),
// reachable from the chat header and from the composer's command menu. Mounted
// only while open, so the fetch happens on first open, not on every room visit.
function RoomFilesSheet({ worldId, room, onClose, onReview }) {
  const { fromAgent, youSent, status, windowFull } = useRoomCrossings(worldId, room);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} />
      {/* Files and goals come from the RIGHT (Patrik ruling 2026-07-20); the rooms
          menu comes from the left. A side panel, not a bottom sheet. */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '88%', background: 'var(--ground)', borderTopLeftRadius: 22, borderBottomLeftRadius: 22, borderLeft: '1px solid var(--hair)', boxShadow: '-22px 0 54px -22px rgba(0,0,0,.65)', display: 'flex', flexDirection: 'column', padding: '14px 16px max(22px, env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--divider)', margin: '6px auto 12px', flex: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flex: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Files in this room</span>
          <div className="ib" role="button" aria-label="Close files" title="Close files" tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose?.(); } }}
            style={{ width: 32, height: 32, borderRadius: 9, cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Tapping a file here opens it in the review viewer. FilesShelf.openItem
              only routes to onReview when a file "needs attention" (needsReview),
              which this sheet doesn't pass — so every tap fell through to onLocate.
              onLocate was onClose, so a tap just shut the sheet instead of opening
              the file (Patrik 2026-07-21). Point onLocate at the same open-in-viewer
              handler so any file opens on tap. */}
          <FilesShelf fromAgent={fromAgent} youSent={youSent} status={status} windowFull={windowFull} onReview={onReview} onLocate={onReview} />
        </div>
      </div>
    </div>
  );
}

export default function ChatLifecycle({ room, fullRoom, worldId, projectId, roomOptions = [], messages, archivedMessages, status, onBack, onSearch, onRoomRenamed, onClearRoom, onSend, goal, onOpenReview, liveSteps, awaiting: awaitingProp, columnMode = false, onClose, expanded = false, onToggleWidth }) {
  const [draft, setDraft] = useState('');
  const localReadOnly = !supabase;
  const dictate = useDictation((text) => setDraft((d) => (d ? d.replace(/\s*$/, '') + ' ' : '') + text));
  // Files-from-chat + the rich composer bridge (chat-surface WD40 R1). The rich
  // CV4-functionality/CV6-look composer needs the room's full identity (project /
  // mission / agent scope) + world; without them we keep the plain bar.
  const [filesSheetOpen, setFilesSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setSettingsOpen(false); setMoreOpen(false); }, [fullRoom?.id, fullRoom?.missionSlug]);
  const [mComposerHost, setMComposerHost] = useState(null);
  const richComposer = !!(fullRoom && worldId);
  const roomKeyForSheet = fullRoom?.id || room?.name;
  // Room switch: close the sheet AND drop any plain-bar draft, so text typed in
  // one room never reappears when the fallback composer mounts in another
  // (fresh-eyes review 2026-07-06, finding 4).
  useEffect(() => { setFilesSheetOpen(false); setDraft(''); }, [roomKeyForSheet]);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const groups = useMemo(() => groupByDay(messages || []), [messages]);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;

  // The goal thread's heading is the user's ask. Prefer the live goal title; fall back to
  // the most recent user message so the header reads "Goal: <what you asked>" right away.
  const threadGoal = useMemo(() => {
    if (goal && goal.title) return goal;
    let ask = '';
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser && messages[i].text) { ask = messages[i].text; break; }
    }
    return ask ? { ...(goal || {}), title: ask } : goal;
  }, [goal, messages]);

  const submit = async () => {
    const t = draft.trim();
    if (!t || localReadOnly) return;
    const ok = await onSend?.(t);
    if (ok !== false) setDraft('');
  };

  // Live work owns one place: the tail of the conversation. Older behavior pinned the
  // user's question near the header and reserved 78vh underneath it. That made the real
  // progress turn look attached to an older message and let it leave the visible bottom.
  const lastMsg = messages?.length ? messages[messages.length - 1] : null;
  // Prefer the hook's hardened working signal (settles on the bridge's end-of-turn marker,
  // shows when you open a busy room) so mobile reads identically to the other surfaces; fall
  // back to the local "last message is mine" guess only when no signal was passed (demo).
  const awaiting = awaitingProp != null ? awaitingProp : (!!lastMsg && lastMsg.isUser);
  const liveProgressKey = useMemo(() => (liveSteps || []).map((step) => [
    step?.id,
    step?.step_index,
    step?.text,
    step?.timestamp,
    step?.progress,
    step?.state,
  ].join(':')).join('|'), [liveSteps]);

  const followTail = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);
  const jumpToLatest = useCallback(() => followTail('smooth'), [followTail]);

  // The pill shows when scrolled away from the active exchange.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(!awaiting && fromBottom > 240);
  }, [awaiting]);

  const prevLenRef = useRef(0);
  const roomKey = room?.id || room?.name;
  useEffect(() => { prevLenRef.current = 0; }, [roomKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = messages?.length || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    // The thread polls every 3s and hands back a fresh array each time. When the count didn't
    // change it's an identical re-render, not a new message — bail before any pin/scroll so the
    // view stays exactly where you left it (this is the guard the desktop screen already has;
    // without it a poll could re-snap your latest message to the top while you sat at the bottom).
    if (len === prev) return;
    // First load and every newly-sent active turn land at the tail. Once work settles,
    // preserve history reading unless the user was already following the bottom.
    if (prev === 0 || awaiting) { followTail(prev === 0 ? 'auto' : 'smooth'); return; }
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (fromBottom < 200) followTail('smooth');
  }, [messages, roomKey, awaiting, followTail]);

  // Step polling can change the live thread without adding a message. Follow those
  // real updates too, after React has laid out the newest step, so the singular
  // progress surface remains visibly anchored at the conversation tail.
  useEffect(() => {
    if (!awaiting) return undefined;
    const frame = requestAnimationFrame(() => followTail('auto'));
    return () => cancelAnimationFrame(frame);
  }, [awaiting, liveProgressKey, followTail]);

  const empty = status === 'empty' || !messages?.length;
  const [collection, setCollection] = useState(null); // { files, index } for the look-only viewer
  const openFile = useCallback((files, index) => setCollection({ files, index: index || 0 }), []);
  // Hand the actual files to the Review tool so it shows THESE files (live), not the
  // global queue. The file objects carry attachmentUrl/fileName/fileMime.
  // Accept an array of files, a single file object, or nothing. An earlier
  // caller wired `onClick={onReview}` and handed this a CLICK EVENT, which is
  // neither array nor a file with an address, so Review opened empty and
  // stranded on the projects panel (2026-07-18). normalizeReviewHandoff makes
  // the hand-off shape-proof (see reviewTargetResolve.js).
  const reviewHandoff = useCallback((files) => {
    setCollection(null);
    onOpenReview?.(normalizeReviewHandoff(files));
  }, [onOpenReview]);

  return (
    <div data-cv6 data-theme="dark" data-screen="chat-room" className="cv6-screen" style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--ground, #05080b)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="mhdr">
        {/* .mback removed 2026-08-07: swipe left returns Home, swipe right advances to next chat */}
        <div className={`mh-av is-${avRing(room.status)}`} style={avTint(room.status)}>
          {room.initials || '·'}
          <span className="mh-ring" />
          <span className="mh-dot" style={{ background: dotColor(room.status) }} />
        </div>
        <div className="mhtitle">
          <div className="mhname">
            <span className="mttl">{room.name}</span>
            {room.status && room.status !== 'ready' && (
              <span className={`astat is-${room.status}`}><span className="sd" />{String(room.status).toUpperCase()}</span>
            )}
          </div>
          <div className="msub">{room.statusText || 'conversation'}</div>
        </div>
        <div className="mhactions">
          <button type="button" className="cv6-chat-header-button" aria-label="Files" title="Files" data-testid="chat-files-button" onClick={() => { setMoreOpen(false); setFilesSheetOpen(true); }}>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
          </button>
          <button type="button" className="cv6-chat-header-button" aria-label="More" title="More" aria-expanded={moreOpen ? 'true' : 'false'} onClick={() => setMoreOpen((open) => !open)}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
          </button>
          {columnMode ? <ColumnExpandButton expanded={expanded} onToggle={onToggleWidth} label={room.name} /> : null}
          {columnMode ? (
            <button type="button" className="cv6-chat-header-button cv6-column-close" aria-label={`Close ${room.name}`} title={`Close ${room.name}`} onClick={onClose}>
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          ) : null}
          {moreOpen ? (
            <>
              <button type="button" className="cv6-chat-more-scrim" aria-label="Close More menu" onClick={() => setMoreOpen(false)} />
              <div className="cv6-chat-more-menu" role="menu" aria-label={`More for ${room.name}`}>
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onSearch?.(); }}>Search conversation</button>
                <button type="button" role="menuitem" data-testid="room-settings-trigger" onClick={() => { setMoreOpen(false); setSettingsOpen(true); }}>Room settings</button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Bottom padding clears the absolutely-positioned composer (.mcomposer is
          position:absolute; bottom:0) plus the phone home indicator, so the last
          message can scroll fully into view instead of being cut off behind it. */}
      <div ref={scrollRef} onScroll={onScroll} className="scrbody" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Cap the thread to a readable column so on iPad it stays phone-width and centered,
            instead of stretching messages + cards edge to edge. */}
        <SendCtx.Provider value={onSend || (() => {})}>
        <ReviewCtx.Provider value={(file) => { if (file) reviewHandoff([file]); }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Per-room action items (Patrik 2026-08-06): what is happening in THIS room,
              the room agent's own steps and any dispatched sub-agent work, one short line
              each with a live counter. Renders nothing when the room has no work. */}
          <RoomWorkList room={fullRoom || room} goal={goal} />
          {empty ? (
              <div className="empty" style={{ marginTop: 40 }}>
                <div className="e-t">No messages with {room.name} yet</div>
              <div className="e-s">{localReadOnly ? 'Connect a workspace to send messages.' : 'Start the conversation below.'}</div>
              </div>
          ) : (
            <>
              {/* No divider above folded days — the DayCard header already carries the same
                  date label; the pair read as a duplicate header (loop R16). */}
              {older.map((g, i) => (
                <DayCard key={g.key + i} group={g} onOpenFile={openFile} goal={threadGoal} onReview={reviewHandoff} onSend={onSend} />
              ))}
              {latest && (
                <>
                  <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
                  <Cv6MessageThread
                    messages={latest.items}
                    goal={threadGoal}
                    room={{ name: room?.name, initials: room?.initials || '·' }}
                    variant="mobile"
                    mode="latest-day"
                    liveSteps={liveSteps}
                    awaiting={awaiting}
                    renderBlocks="goalBody"
                    renderAttachments="mobileGallery"
                    renderLiveWork="goalBody"
                    allowBlocks
                    allowAttachments
                    allowLinkCards
                    allowChips={false}
                    onAction={onSend}
                    onOpenFile={openFile}
                    onReviewFiles={reviewHandoff}
                    MobileFileGallery={FileGallery}
                  />
                </>
              )}
            </>
          )}
          {/* In-flight background work left the thread (corner:one-corner M19): it lives
              in the Background work window, reached from the drawer menu. */}
          {/* Only renders when the FRONT DOOR chose this room automatically. No projects /
              missions props here: this parent holds neither, so the bar fetches its own
              once it has something to show (corner:front-door R8). */}
          <RoutedHereBar room={fullRoom} worldId={worldId} />
          {/* A small tail marker only. Composer clearance comes from `.scrbody`; the former
              78vh pending spacer stranded live work above a blank page. */}
          <div style={{ height: 4 }} />
          <div ref={bottomRef} style={{ height: 4 }} />
        </div>
        </ReviewCtx.Provider>
        </SendCtx.Provider>
      </div>

      {showJump && (
        <button className="jumplive" onClick={jumpToLatest}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          Jump to latest
        </button>
      )}

      {richComposer ? (
        <>
          {/* The rich composer (CV4 functionality, CV6 look: attach, command menu,
              slash commands, image gen, voice) portals into this host. */}
          <div className="mcomposer" ref={setMComposerHost}
            style={{ background: 'var(--chat-bar, rgba(5,8,11,.9))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }} />
          <Cv6FullComposer target={mComposerHost} room={fullRoom} worldId={worldId} agents={[]}
            roomOptions={roomOptions} quickSend={onSend} onOpenFiles={() => setFilesSheetOpen(true)}
            onClearRoom={onClearRoom} />
        </>
      ) : (
      <div className="mcomposer" style={{ background: 'var(--chat-bar, rgba(5,8,11,.9))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
        {dictate.supported && (
          <button onClick={dictate.toggle} aria-label={dictate.listening ? 'Stop dictation' : 'Speak your message'}
            title={dictate.listening ? 'Listening… tap to stop' : 'Speak your message'}
            style={{ width: 42, height: 42, borderRadius: 12, border: 'none', flex: 'none', cursor: 'pointer',
              background: dictate.listening ? '#e5484d' : 'var(--surface-2)', color: dictate.listening ? '#fff' : 'var(--faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: dictate.listening ? '0 0 0 4px rgba(229,72,77,.18)' : 'none',
              transition: 'background .15s, box-shadow .15s, color .15s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        <input value={draft} disabled={localReadOnly} readOnly={localReadOnly} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder={localReadOnly ? 'Chat needs a connected workspace.' : (dictate.listening ? 'Listening…' : `Message ${room.name}…`)}
          style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', fontSize: 14, color: localReadOnly ? 'var(--muted)' : 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none', opacity: 1 }} />
        <button onClick={submit} disabled={localReadOnly} title={localReadOnly ? 'Local mode is read-only' : 'Send'} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', opacity: localReadOnly ? .55 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
        </button>
      </div>
      )}

      {filesSheetOpen && (
        <RoomFilesSheet worldId={worldId} room={fullRoom}
          onClose={() => setFilesSheetOpen(false)}
          onReview={(it) => { setFilesSheetOpen(false); onOpenReview?.(it ? [it] : null); }} />
      )}

      {settingsOpen && fullRoom ? <RoomSettingsDialog
        room={fullRoom}
        worldId={worldId}
        projectId={projectId}
        onClose={() => setSettingsOpen(false)}
        onRenamed={onRoomRenamed}
        onOpenFiles={() => setFilesSheetOpen(true)}
        archivedMessages={archivedMessages}
        onClearRoom={onClearRoom}
      /> : null}

      {collection && <FileCollectionViewer files={collection.files} startIndex={collection.index} onClose={() => setCollection(null)} onReview={reviewHandoff} />}
    </div>
  );
}
