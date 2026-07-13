// cv6next — the conversation card: the REAL chain of messages behind one support
// ask (corner:support-desk M27 Stage 2). Replaces the single "original email +
// regex quoted-text toggle" card with the actual Gmail thread from
// /api/support/thread: every inbound message AND every reply we sent, in order.
//
// Render rules:
//   - latest message expanded, earlier messages collapsed to one-line rows
//     (sender · first line · time) that expand/collapse on click
//   - our side (direction 'out') carries an accent left rail + "AOM · sent" tag
//     so the back-and-forth reads at a glance
//   - per-message relative times make the reply speed visible in the chain
//   - bounded fetch (20s abort like the suggest lane): loading resolves to the
//     chain, an honest failure line, or the single-message fallback — never a
//     stuck spinner
//   - wishes with no Gmail thread (web form, forwarded mail) fall back to the
//     same single-message card the pane always had; nothing crashes.

import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../lib/authFetch';

function relTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Preview line for a collapsed row: the first line with actual content — skip
// greeting-only openers ("Hi Patrik,") so the row shows the ask, not the hello.
function firstLine(s) {
  const lines = String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const meaty = lines.find((l) => !/^(hi|hey|hello|dear|good (morning|afternoon|evening))\b[^a-z]*[a-z]*[,!.\s]*$/i.test(l));
  return meaty || lines[0] || '';
}

// One message in the chain. Collapsed = a single scannable row; expanded = the
// full body with the sender header. Three outbound flavors, all truthful:
// sent (accent), draft:true = written but NOT sent yet (warn), recorded:true =
// a reply logged on the board whose email lives on another thread (accent, quiet note).
function ThreadMessage({ msg, expanded, onToggle, tint, initials }) {
  const ours = msg.direction === 'out';
  const isDraft = !!msg.draft;
  const railColor = isDraft ? 'var(--warn)' : 'var(--accent)';
  const rail = ours ? `3px solid ${railColor}` : '3px solid transparent';
  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        aria-expanded="false"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
          padding: '10px 16px', border: 'none', borderTop: '1px solid var(--divider)',
          background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          borderLeft: rail,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: ours ? railColor : 'var(--fg)', flex: 'none', width: 108, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ours ? (isDraft ? 'AOM · draft' : 'AOM') : (msg.from || 'Client')}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {firstLine(msg.body) || '(no text)'}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{relTime(msg.date)}</span>
      </button>
    );
  }
  return (
    <div style={{ borderTop: '1px solid var(--divider)', borderLeft: rail }}>
      <button
        onClick={onToggle}
        aria-expanded="true"
        style={{
          display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
          padding: '14px 16px 0', border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span className={`ava is-${ours ? 'green' : tint || 'violet'}`} style={{ width: 34, height: 34, fontSize: 12, flex: 'none' }}>
          {ours ? 'A' : (initials || '·')}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
            {ours ? 'AOM' : (msg.from || 'Client')}
            {ours && (
              <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: railColor }}>
                {isDraft ? 'draft · not sent' : 'sent'}
              </span>
            )}
          </span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>
            {msg.recorded ? 'logged reply' : (msg.fromEmail || '')}
          </span>
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{relTime(msg.date)}</span>
      </button>
      <div style={{ padding: '10px 16px 16px 63px', fontSize: 14, lineHeight: 1.7, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {msg.body || '(no text)'}
      </div>
    </div>
  );
}

export default function SupportThread({ wishId, threadId, account, refreshToken, fallback }) {
  // Two lanes: wish cards fetch by wishId; mailbox-scan rows fetch by threadId+account.
  // fallback = { sender, address, initials, avatarTint, time, body }
  const [thread, setThread] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error
  const [open, setOpen] = useState({}); // index -> expanded (latest is always open by default)
  const [showEarlier, setShowEarlier] = useState(false); // fallback card quoted-text toggle
  const threadFor = useRef(null);

  useEffect(() => {
    setThread(null); setOpen({}); setShowEarlier(false);
    const query = wishId
      ? `wish_id=${encodeURIComponent(wishId)}`
      : (threadId && account ? `thread_id=${encodeURIComponent(threadId)}&account=${encodeURIComponent(account)}` : null);
    if (!query) { setState('idle'); return; }
    let dead = false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    threadFor.current = query + String(refreshToken || '');
    const mine = threadFor.current;
    setState('loading');
    const freshQ = String(refreshToken || '').includes('sent') ? '&fresh=1' : '';
    authFetch(`/api/support/thread?${query}${freshQ}`, { credentials: 'include', signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (dead || threadFor.current !== mine) return;
        if (d.ok && Array.isArray(d.thread)) { setThread(d.thread); setState('ready'); }
        else setState('error');
      })
      .catch(() => { if (!dead && threadFor.current === mine) setState('error'); })
      .finally(() => clearTimeout(timer));
    return () => { dead = true; ctl.abort(); clearTimeout(timer); };
  }, [wishId, threadId, account, refreshToken]);

  const chain = state === 'ready' && thread && thread.length > 0 ? thread : null;

  // ── the chain ──
  if (chain) {
    const lastIdx = chain.length - 1;
    const draftCount = chain.filter((m) => m.draft).length;
    const realCount = chain.length - draftCount;
    return (
      <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--faint)' }}>
            Conversation · {realCount} message{realCount === 1 ? '' : 's'}
          </span>
          {draftCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--warn)' }}>
              · {draftCount} draft{draftCount === 1 ? '' : 's'} waiting
            </span>
          )}
        </div>
        {chain.map((msg, i) => (
          <ThreadMessage
            key={i}
            msg={msg}
            tint={fallback?.avatarTint}
            initials={fallback?.initials}
            expanded={i === lastIdx ? open[i] !== false : open[i] === true}
            onToggle={() => setOpen((o) => ({ ...o, [i]: i === lastIdx ? o[i] === false ? undefined : false : !o[i] }))}
          />
        ))}
      </div>
    );
  }

  // ── fallback: the single-message card (threadless wish, fetch error, loading) ──
  const fb = fallback || {};
  const full = String(fb.body || 'No message body.');
  const cut = full.search(/^\s*>|^-{2,}\s*Forwarded message|^Begin forwarded message:|^On .{5,80} wrote:/m);
  const head = cut >= 0 ? full.slice(0, cut).trim() : full;
  const tail = cut >= 0 ? full.slice(cut).trim() : '';
  return (
    <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
        <span className={`ava is-${fb.avatarTint || 'violet'}`} style={{ width: 44, height: 44, fontSize: 15 }}>{fb.initials || '·'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>
            {fb.sender} {fb.address ? <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 13 }}>&lt;{fb.address}&gt;</span> : null}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            to Patrik (you)
            {state === 'loading' && <span style={{ marginLeft: 8, color: 'var(--faint)' }}>· loading the full conversation…</span>}
            {state === 'error' && <span style={{ marginLeft: 8, color: 'var(--faint)' }}>· couldn't load the rest of the thread</span>}
          </div>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{fb.time}</span>
      </div>
      <div style={{ padding: '22px 26px', fontSize: 14.5, lineHeight: 1.75, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {(tail && head) ? head : full}
        {(tail && head) && (
          <button aria-expanded={showEarlier ? 'true' : 'false'} onClick={() => setShowEarlier((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 14px', marginTop: 16, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>Earlier in this thread</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{showEarlier ? 'Hide' : 'Show'}</span>
          </button>
        )}
        {(tail && head) && showEarlier && <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)', color: 'var(--muted)', fontSize: 13 }}>{tail}</div>}
      </div>
    </div>
  );
}
