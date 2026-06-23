// cv6next — Support, desktop (master-detail: inbox list + ask reading pane).
// Structure from ccds6 _archive "Support desktop" (Claude Design's desktop layout),
// built in React with REAL data from useSupportInbox. Honest by omission: the design's
// auto-send countdown + AI suggested-reply buttons are NOT rendered, because there is no
// such mechanism and the reply path (real client email) is held for Patrik's go-ahead
// (see mission BUILD "approve & send"). So the detail is a reading pane; replying routes
// through the Mail flow, which holds. No fake countdown, no dead Send/Resolve controls.

import React, { useState, useMemo } from 'react';
import { useSupportInbox } from './data/useSupportInbox.js';

const NAV = [
  { k: 'home', label: 'Home', d: 'M3 11l9-7 9 7|M5 9.8V20h14V9.8' },
  { k: 'chat', label: 'Chat', d: 'M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z' },
  { k: 'support', label: 'Support', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' },
  { k: 'tracker', label: 'Tracker', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z|M12 2v3M12 19v3M2 12h3M19 12h3' },
  { k: 'command', label: 'Command', d: 'M7 4H4v16h3M17 4h3v16h-3' },
];

function InboxRow({ it, open, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px', borderRadius: 10, background: open ? 'var(--accent-weak)' : 'transparent', cursor: 'pointer', marginBottom: 2 }}>
      <div className={`ava is-${it.avatarTint || 'violet'}`} style={{ width: 38, height: 38, fontSize: 12, flex: 'none' }}>{it.initials || '·'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.snippet}</div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{it.time}</span>
    </div>
  );
}

export default function SupportDesktop({ onNav, onOpenNav }) {
  const { state, data } = useSupportInbox('aom');
  const needsYou = data?.needsYou || [];
  const watching = data?.watching || [];
  const [tab, setTab] = useState('open'); // open | waiting
  const list = tab === 'open' ? needsYou : watching;
  const [picked, setPicked] = useState(null);
  const selected = useMemo(() => picked || list[0] || null, [picked, list]);

  return (
    <div data-cv6 data-theme="dark" className="cv6-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* topbar */}
      <div className="topbar">
        <div className="tgreet"><img src="/cv6/assets/corner-logo-white.svg" alt="Corner" style={{ height: 22, width: 'auto', display: 'block' }} /></div>
        <div className="toolnav">
          {NAV.map((it) => {
            const paths = it.d.split('|');
            return (
              <div key={it.k} className={`ctile${it.k === 'support' ? ' on' : ''}`} onClick={() => onNav?.(it.k)} style={{ cursor: 'pointer' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths.map((p, i) => <path key={i} d={p} />)}</svg>
                <span className="clab">{it.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ib" onClick={() => onOpenNav?.()} style={{ cursor: 'pointer' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></div>
          <div className="av" onClick={() => onOpenNav?.()} style={{ cursor: 'pointer' }}>P</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* inbox list */}
        <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--divider)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>Support</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{needsYou.length} open · {watching.length} watching</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {[['open', 'Open'], ['waiting', 'Watching']].map(([k, label]) => (
                <button key={k} onClick={() => { setTab(k); setPicked(null); }} style={{ height: 32, padding: '0 13px', borderRadius: 16, border: tab === k ? 'none' : '1px solid var(--hair)', background: tab === k ? 'var(--accent-weak)' : 'transparent', color: tab === k ? 'var(--accent)' : 'var(--muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            {state === 'loading' ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: 14 }}>Gathering your inbox…</div>
              : list.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13.5, padding: 14 }}>{tab === 'open' ? "You're all caught up. New asks the agent flags as real land here." : 'Nothing being watched right now.'}</div>
                : list.map((it) => <InboxRow key={it.id} it={it} open={selected?.id === it.id} onClick={() => setPicked(it)} />)}
          </div>
        </div>

        {/* ask reading pane */}
        <div style={{ width: 520, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{selected.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{selected.time}</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div className={`ava is-${selected.avatarTint || 'violet'}`} style={{ width: 34, height: 34, fontSize: 12, flex: 'none' }}>{selected.initials || '·'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{(selected.snippet || '').split(' · ')[0] || 'Sender'}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.time}</div></div>
                  {(selected.tags || []).map((t, i) => <span key={i} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', padding: '4px 9px', borderRadius: 6 }}>{t.label}</span>)}
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg)', margin: 0 }}>{(selected.snippet || '').split(' · ').slice(1).join(' · ') || selected.snippet}</p>
                <div style={{ marginTop: 22, display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--warn-weak)', borderRadius: 10, padding: '11px 13px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg)' }}>Replies go out through your Mail room, which holds for your go-ahead before anything sends. Open this ask in Mail to answer it.</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 24 }}>Pick an ask on the left to read it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
