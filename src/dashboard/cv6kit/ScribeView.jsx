import React, { useState } from 'react';

/**
 * CV6 kit Scribe — live transcript + auto-extracted action items/quotes/decisions.
 * Exact pixel-faithful rebuild of ui_kits/tools/livescribe.html mobile screens.
 *
 * Desktop: dual-pane (transcript + extracted items).
 * Mobile: transcript with full-width header, floating activity dock during recording,
 *         collapsible bottom control sheet showing live speaker, captured items count.
 *
 * Props contract (for real data integration):
 *   recording     = { isRecording: bool, elapsed: seconds, destination: string, numSpeakers?: number } | null
 *   transcript[]  = { speaker: string, timestamp: string, text: string, tone?: 'accent'|'success', confidence?: number }
 *   extracted = {
 *     actions: [{ text, assignee }]
 *     quotes:  [{ text, speaker, timestamp }]
 *     decisions: [{ text }]
 *   }
 *   onStop()      - called when Stop/Finish button clicked
 *   onChangeDestination() - called when "Change" button clicked
 *   onBack()      - called when back button clicked (mobile)
 *   mode = 'desktop' | 'mobile'
 */

export function ScribeView({
  recording = null,
  transcript = [],
  extracted = { actions: [], quotes: [], decisions: [] },
  onStop,
  onChangeDestination,
  onBack,
  mode = 'desktop',
}) {
  const [mobileControlSheetOpen, setMobileControlSheetOpen] = useState(false);

  const isRecording = recording?.isRecording ?? false;
  const elapsed = recording?.elapsed ?? 0;
  const destination = recording?.destination ?? 'Corner → Dashboard';
  const numSpeakers = recording?.numSpeakers ?? 3;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  // Parse destination for breadcrumb (e.g. "Corner · Dashboard" -> ["Corner", "Dashboard"])
  const destinationParts = destination.split('→').map(s => s.trim());

  const REC_DOT = <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'scribePulse 1.4s infinite' }} />;

  const WAVEFORM = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[50, 90, 65, 100, 45, 80].map((heightPct, i) => (
        <span key={i} style={{ width: 3, borderRadius: 2, background: 'var(--accent)', display: 'inline-block', height: `${heightPct}%`, animation: `scribeWave 1s ease-in-out infinite ${[0, 0.1, 0.2, 0.15, 0.25, 0.05][i]}s` }} />
      ))}
    </span>
  );

  // ─────────── DESKTOP ───────────
  if (mode === 'desktop') {
    return (
      <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <style>{`
          @keyframes scribePulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
          @keyframes scribeWave { 0%,100%{transform:scaleY(.4);} 50%{transform:scaleY(1);} }
          @keyframes scribeCaret { 0%,100%{opacity:1;} 50%{opacity:0;} }
        `}</style>

        {/* topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '14px 24px', borderBottom: '1px solid var(--divider)', flex: 'none' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Live Scribe</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 7 }}>
            {['home', 'chat', 'organize', 'review', 'support', 'tracker', 'command', 'scribe'].map((tool, i) => (
              <div key={tool} style={{
                width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '7px 0 6px', borderRadius: 'var(--radius-control)', background: tool === 'scribe' ? 'var(--accent)' : 'var(--surface)', border: '1px solid ' + (tool === 'scribe' ? 'transparent' : 'var(--hair)'), color: tool === 'scribe' ? '#fff' : 'var(--muted)',
              }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {tool === 'scribe' && <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>}
                  {tool === 'home' && <><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></>}
                  {tool === 'chat' && <path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" />}
                  {tool === 'organize' && <><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></>}
                  {tool === 'review' && <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></>}
                  {tool === 'support' && <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />}
                  {tool === 'tracker' && <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>}
                  {tool === 'command' && <><path d="M7 4H4v16h3M17 4h3v16h-3" /></>}
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{tool[0].toUpperCase() + tool.slice(1)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>P</div>
          </div>
        </div>

        {/* body */}
        <div style={{ display: 'flex', height: 778 }}>
          {/* transcript */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)' }}>{REC_DOT} {mm}:{ss}</span>
              {WAVEFORM}
              <div style={{ flex: 1, fontSize: '12.5px', color: 'var(--muted)' }}>Capturing to <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{destination}</span></div>
              <button onClick={onStop} style={{ height: 36, padding: '0 16px', borderRadius: 10, border: 'none', background: '#F87171', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
                Stop &amp; save
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: 24 }}>
              <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {transcript.map((turn, i) => {
                  const tone = turn.tone || 'accent';
                  const toneColor = tone === 'success' ? 'var(--success)' : tone === 'accent' ? 'var(--accent)' : 'var(--muted)';
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: toneColor }}>{turn.speaker}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{turn.timestamp}</span>
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg)' }}>
                        {turn.text}
                        {i === transcript.length - 1 && turn.text.endsWith('now') && <span style={{ display: 'inline-block', width: 2, height: 17, background: 'var(--accent)', marginLeft: 2, verticalAlign: '-3px', animation: 'scribeCaret 1s infinite' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* extracted */}
          <div style={{ width: 380, flex: 'none', padding: 22, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Live Scribe · extracted</span>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Action items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {(extracted.actions || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 11, padding: '12px 13px', cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(item, 'action')}>
                  <span style={{ width: 18, height: 18, borderRadius: 6, border: '2px solid var(--accent)', flex: 'none', marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.45, color: 'var(--fg)' }}>{item.text}</div>
                    {item.assignee && <div style={{ fontSize: '11.5px', color: 'var(--faint)', marginTop: 3 }}>→ {item.assignee}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Quotes &amp; research</div>
            {(extracted.quotes || []).length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 11, padding: '12px 13px', borderLeft: '2px solid var(--accent)', marginBottom: 22, cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(extracted.quotes[0], 'quote')}>
                <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--fg)', fontStyle: 'italic' }}>"{extracted.quotes[0].text}"</div>
                <div style={{ fontSize: '11.5px', color: 'var(--faint)', marginTop: 5 }}>{extracted.quotes[0].speaker} · {extracted.quotes[0].timestamp}</div>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Decisions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {(extracted.decisions || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 11, padding: '12px 13px', cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(item, 'decision')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}><path d="m5 13 4 4L19 7" /></svg>
                  <div style={{ fontSize: '13.5px', lineHeight: 1.45, color: 'var(--fg)' }}>{item.text}</div>
                </div>
              ))}
            </div>

            <button onClick={onStop} style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              Send to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── MOBILE ───────────
  if (mode === 'mobile') {
    const actionCount = (extracted?.actions || []).length;
    const decisionCount = (extracted?.decisions || []).length;
    const lastTranscript = transcript[transcript.length - 1];
    const lastSpeaker = lastTranscript?.speaker || 'Elon';
    const lastTone = lastTranscript?.tone || 'success';

    return (
      <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <style>{`
          @keyframes scribePulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
          @keyframes scribeWave { 0%,100%{transform:scaleY(.4);} 50%{transform:scaleY(1);} }
          @keyframes scribeCaret { 0%,100%{opacity:1;} 50%{opacity:0;} }
        `}</style>

        {/* mstatus bar */}
        <div style={{ height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 6px', color: 'var(--fg)', flex: 'none' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>9:41</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F87171' }}>REC {mm}:{ss}</span>
        </div>

        {/* mhdr — canonical mobile header with back + context title + change button */}
        <div style={{ flex: 'none', height: 60, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 11, padding: '0 14px', borderBottom: '1px solid var(--divider)' }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Live Scribe</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{destinationParts.join(' · ')}</div>
          </div>
          <button onClick={onChangeDestination} style={{ height: 32, padding: '0 11px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6, flex: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
            Change
          </button>
        </div>

        {/* transcript header bar — timer + waveform + speaker count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', borderBottom: '1px solid var(--divider)', background: 'rgba(248,113,113,.06)', flex: 'none' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--fg)', flex: 'none' }}>
            {REC_DOT} {mm}:{ss}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20, flex: 1 }}>
            {[50, 90, 65, 100, 45, 80, 60, 50, 90].map((heightPct, i) => (
              <span key={i} style={{ width: 3, borderRadius: 2, background: 'var(--accent)', display: 'inline-block', height: `${heightPct}%`, animation: `scribeWave 1s ease-in-out infinite ${[0, 0.1, 0.2, 0.15, 0.25, 0.05, 0.12, 0, 0.1][i]}s` }} />
            ))}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)', flex: 'none' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px rgba(52,211,153,.6)' }} />
            {numSpeakers} speakers
          </span>
        </div>

        {/* transcript content area with floating extracted dock */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 194, bottom: 148, overflow: 'hidden', padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* floating extracted dock — positioned absolutely */}
          {isRecording && (
            <div style={{ position: 'absolute', left: 12, right: 12, top: 0, background: 'rgba(248,113,113,.16)', border: '1px solid rgba(248,113,113,.34)', borderRadius: 13, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
              <span style={{ flex: 1, textAlign: 'left', fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>Extracted so far</span>
              <span style={{ display: 'flex', gap: 6 }}>
                {actionCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', padding: '3px 8px', borderRadius: 9 }}>{actionCount} action{actionCount !== 1 ? 's' : ''}</span>
                )}
                {decisionCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'var(--success-weak)', padding: '3px 8px', borderRadius: 9 }}>{decisionCount} decision{decisionCount !== 1 ? 's' : ''}</span>
                )}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6" /></svg>
            </div>
          )}

          {/* transcript turns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: isRecording ? 80 : 0 }}>
            {transcript.map((turn, i) => {
              const tone = turn.tone || 'accent';
              const toneColor = tone === 'success' ? 'var(--success)' : tone === 'accent' ? 'var(--accent)' : 'var(--muted)';
              const avatarBg = tone === 'success' ? 'rgba(52,211,153,.2)' : 'var(--accent-weak)';
              const avatarColor = tone === 'success' ? 'var(--success)' : 'var(--accent)';
              const confidence = turn.confidence ?? (i === 0 ? 98 : i === 1 ? 96 : 95);

              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: avatarBg, color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
                    {turn.speaker.slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: toneColor }}>{turn.speaker}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--faint)' }}>{turn.timestamp}</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--faint)' }}>{confidence}%</span>
                      </span>
                    </div>
                    <div style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--fg)' }}>
                      {turn.text}
                      {i === transcript.length - 1 && turn.text.endsWith('now') && <span style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--accent)', marginLeft: 2, verticalAlign: '-3px', animation: 'scribeCaret 1s infinite' }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* footer — control buttons + safe-area bottom */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: 'var(--ground)', borderTop: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: `0 18px calc(env(safe-area-inset-bottom, 0px) + 8px)`, flex: 'none' }}>
          <button style={{ width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          </button>
          <button onClick={onStop} style={{ flex: 1, maxWidth: 200, height: 50, borderRadius: 14, border: 'none', background: '#F87171', color: '#fff', fontSize: '14.5px', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            Stop &amp; save
          </button>
          <button style={{ width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>

      </div>
    );
  }

  return null;
}
