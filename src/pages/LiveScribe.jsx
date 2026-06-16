import React, { useCallback, useEffect, useRef, useState } from 'react';

// Live Scribe — call/meeting companion (Mode B of aom:live-scribe).
// Listens to a call on speaker, builds a perfect running transcript (left),
// and a living brief on the right: summary, talking points, live web research
// on things said, and smart questions to ask next.
//
// Transcript: browser SpeechRecognition (Chrome). Brief: /api/dashboard/call-scribe (Gemini + Google Search).

const ANALYZE_EVERY_MS = 15000;
const GOLD = '#EAB308';
const INK = '#1A1714';
const PAPER = '#FAF7F0';
const CARD = '#FFFFFF';
const LINE = '#E7E0D2';

function useFonts() {
  useEffect(() => {
    const id = 'live-scribe-fonts';
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }, []);
}

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export default function LiveScribe() {
  useFonts();
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [context, setContext] = useState('');
  const [brief, setBrief] = useState({ summary: '', talkingPoints: [], quotes: [], research: [], questions: [] });
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');

  const recogRef = useRef(null);
  const recordingRef = useRef(false);
  const finalRef = useRef('');
  const lastAnalyzedLen = useRef(0);
  const transcriptScroll = useRef(null);

  // keep refs in sync
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { finalRef.current = finalText; }, [finalText]);

  // auto-scroll transcript
  useEffect(() => {
    const el = transcriptScroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [finalText, interim]);

  // elapsed timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const analyze = useCallback(async () => {
    const transcript = finalRef.current.trim();
    if (transcript.length < 12 || transcript.length === lastAnalyzedLen.current) return;
    lastAnalyzedLen.current = transcript.length;
    setAnalyzing(true);
    try {
      const r = await fetch('/api/dashboard/call-scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context: context.trim() || undefined }),
      });
      const data = await r.json();
      if (data && (data.summary || data.talkingPoints?.length || data.research?.length)) {
        setBrief({
          summary: data.summary || '',
          talkingPoints: data.talkingPoints || [],
          quotes: data.quotes || [],
          research: data.research || [],
          questions: data.questions || [],
        });
      }
    } catch (e) {
      setErr('Brief update failed, still listening.');
    } finally {
      setAnalyzing(false);
    }
  }, [context]);

  // periodic analysis while recording
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(analyze, ANALYZE_EVERY_MS);
    return () => clearInterval(t);
  }, [recording, analyze]);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setErr('');
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (event) => {
      let interimChunk = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalChunk += res[0].transcript;
        else interimChunk += res[0].transcript;
      }
      if (finalChunk) {
        setFinalText((prev) => {
          const sep = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + sep + finalChunk.trim();
        });
      }
      setInterim(interimChunk);
    };

    recog.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErr('Microphone blocked. Allow mic access and press Start again.');
        setRecording(false);
        recordingRef.current = false;
      }
    };

    // Chrome stops on silence / ~60s; restart while we are still recording.
    recog.onend = () => {
      if (recordingRef.current) {
        try { recog.start(); } catch { /* already starting */ }
      }
    };

    recogRef.current = recog;
    try { recog.start(); } catch { /* noop */ }
    setRecording(true);
    recordingRef.current = true;
  }, []);

  const stop = useCallback(() => {
    setRecording(false);
    recordingRef.current = false;
    setInterim('');
    const recog = recogRef.current;
    if (recog) { try { recog.stop(); } catch { /* noop */ } }
    // final pass
    setTimeout(analyze, 400);
  }, [analyze]);

  const reset = useCallback(() => {
    setFinalText(''); setInterim(''); setElapsed(0);
    setBrief({ summary: '', talkingPoints: [], research: [], questions: [] });
    lastAnalyzedLen.current = 0;
    finalRef.current = '';
  }, []);

  const copyBrief = useCallback(() => {
    const lines = [];
    if (context.trim()) lines.push(`Call: ${context.trim()}`, '');
    if (brief.summary) lines.push('SUMMARY', brief.summary, '');
    if (brief.talkingPoints.length) { lines.push('TALKING POINTS'); brief.talkingPoints.forEach(p => lines.push(`- ${p}`)); lines.push(''); }
    if (brief.quotes.length) { lines.push('QUOTES'); brief.quotes.forEach(q => lines.push(`"${q}"`)); lines.push(''); }
    if (brief.research.length) { lines.push('RESEARCH'); brief.research.forEach(r => lines.push(`- ${r.topic}: ${r.finding}${r.source ? ` (${r.source})` : ''}`)); lines.push(''); }
    if (brief.questions.length) { lines.push('QUESTIONS TO ASK'); brief.questions.forEach(q => lines.push(`- ${q}`)); lines.push(''); }
    lines.push('FULL TRANSCRIPT', finalText);
    navigator.clipboard?.writeText(lines.join('\n'));
  }, [brief, context, finalText]);

  const F = { fontFamily: "'Space Grotesk', system-ui, sans-serif" };
  const DISPLAY = { fontFamily: "'Syne', system-ui, sans-serif" };
  const hasBrief = Boolean(brief.summary || brief.talkingPoints.length || brief.quotes.length || brief.research.length || brief.questions.length);
  const showActions = Boolean(finalText) || hasBrief;
  const transcriptActive = recording || Boolean(finalText);

  return (
    <div style={{ minHeight: '100vh', background: PAPER, color: INK, ...F }}>
      <style>{`
        .ls-card { background:${CARD}; border:1px solid ${LINE}; border-radius:16px; }
        .ls-btn { ${'' /* base */} font-family:'Space Grotesk',sans-serif; font-weight:600; border-radius:999px; cursor:pointer; border:1px solid ${INK}; transition:transform .08s ease, opacity .15s ease; }
        .ls-btn:active { transform:translateY(1px); }
        .ls-rec-dot { width:10px; height:10px; border-radius:50%; background:#E5484D; box-shadow:0 0 0 0 rgba(229,72,77,.6); animation:lspulse 1.4s infinite; }
        @keyframes lspulse { 0%{box-shadow:0 0 0 0 rgba(229,72,77,.55)} 70%{box-shadow:0 0 0 9px rgba(229,72,77,0)} 100%{box-shadow:0 0 0 0 rgba(229,72,77,0)} }
        .ls-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:18px; }
        @media (max-width: 900px){ .ls-grid{ grid-template-columns:1fr; } }
        .ls-fade { animation:lsfade .3s ease; }
        @keyframes lsfade { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none} }
        a.ls-src { color:#A66A00; text-decoration:none; border-bottom:1px solid rgba(166,106,0,.3); }
        .ls-start-pulse { animation:lsbtnpulse 2.2s infinite; }
        @keyframes lsbtnpulse { 0%{box-shadow:0 0 0 0 rgba(234,179,8,.45)} 70%{box-shadow:0 0 0 14px rgba(234,179,8,0)} 100%{box-shadow:0 0 0 0 rgba(234,179,8,0)} }
        .ls-eq { display:flex; gap:5px; align-items:flex-end; height:34px; }
        .ls-eq span { width:5px; border-radius:3px; background:#C9A227; animation:lseq 1.1s ease-in-out infinite; }
        .ls-eq span:nth-child(2){ animation-delay:.18s } .ls-eq span:nth-child(3){ animation-delay:.36s } .ls-eq span:nth-child(4){ animation-delay:.54s } .ls-eq span:nth-child(5){ animation-delay:.72s }
        @keyframes lseq { 0%,100%{height:7px; opacity:.55} 50%{height:30px; opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Live Scribe
            </div>
            <div style={{ opacity: 0.6, fontSize: 15, marginTop: 8, maxWidth: 460 }}>
              Put the call on speaker. I write it down, look things up, and build your notes as you talk.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {(recording || elapsed > 0) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {recording && <span className="ls-rec-dot" />}
                <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', opacity: recording ? 1 : 0.45 }}>
                  {fmtTime(elapsed)}
                </span>
              </span>
            )}
            {!recording ? (
              <button className={`ls-btn${!finalText ? ' ls-start-pulse' : ''}`} onClick={start}
                style={{ background: GOLD, color: INK, borderColor: '#C9A227', padding: '15px 34px', fontSize: 17, fontWeight: 700 }}>
                {finalText ? 'Resume' : 'Start listening'}
              </button>
            ) : (
              <button className="ls-btn" onClick={stop}
                style={{ background: 'transparent', color: INK, padding: '15px 30px', fontSize: 17, fontWeight: 700 }}>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* context + actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional: who's this call with? (e.g. Acme Corp, partnership)"
            style={{ ...F, flex: '0 1 440px', minWidth: 220, padding: '9px 13px', borderRadius: 10, border: `1px solid ${LINE}`, background: 'transparent', color: INK, fontSize: 13.5, outline: 'none' }}
          />
          <span style={{ marginLeft: 'auto' }} />
          {showActions && (
            <>
              <button className="ls-btn" onClick={copyBrief} style={{ background: CARD, color: INK, padding: '9px 16px', fontSize: 13, borderColor: LINE }}>Copy brief</button>
              <button className="ls-btn" onClick={reset} style={{ background: CARD, color: '#9A4A4A', padding: '9px 16px', fontSize: 13, borderColor: LINE }}>Clear</button>
            </>
          )}
        </div>

        {!supported && (
          <div className="ls-card" style={{ marginTop: 16, padding: 16, borderColor: '#E5C07A', background: '#FFF7E6' }}>
            Live transcription needs Chrome (it uses Chrome's built-in speech engine). Open this page in Chrome and press Start.
          </div>
        )}
        {err && <div style={{ marginTop: 12, color: '#9A4A4A', fontSize: 13 }}>{err}</div>}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 24px 48px' }}>
        <div className="ls-grid">
          {/* Transcript */}
          <div className="ls-card" style={{ display: 'flex', flexDirection: 'column', height: transcriptActive ? 'min(70vh, 640px)' : 320 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>Transcript</span>
              <span style={{ fontSize: 12, opacity: 0.45 }}>{finalText ? `${finalText.split(/\s+/).filter(Boolean).length} words` : (recording ? 'listening…' : 'ready')}</span>
            </div>
            <div ref={transcriptScroll} style={{ padding: '18px', overflowY: 'auto', flex: 1, fontSize: 16, lineHeight: 1.7 }}>
              {!finalText && !interim ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div className="ls-eq" aria-hidden="true"><span /><span /><span /><span /><span /></div>
                  <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, opacity: 0.55 }}>
                    {recording ? 'Listening…' : 'Ready to listen'}
                  </div>
                  {!recording && <div style={{ fontSize: 13, opacity: 0.4 }}>Press Start listening and begin the call.</div>}
                </div>
              ) : (
                <><span>{finalText}</span>{' '}<span style={{ opacity: 0.45 }}>{interim}</span></>
              )}
            </div>
          </div>

          {/* Brief */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="ls-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>Brief</span>
                {analyzing && <span style={{ fontSize: 12, color: '#A66A00' }}>updating…</span>}
              </div>
              <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, minHeight: 24 }}>
                {brief.summary
                  ? <span className="ls-fade">{brief.summary}</span>
                  : <span style={{ opacity: 0.4 }}>A running summary builds here after the first ~20 seconds of talking.</span>}
              </div>
            </div>

            {!hasBrief && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Talking points', 'The key points raised, newest first.'],
                  ['Quotes', 'Memorable lines, captured word for word.'],
                  ['Live research', 'Things said get looked up on the web, with sources.'],
                  ['Questions to ask', 'Smart follow-ups, based on where the call is going.'],
                ].map(([title, hint]) => (
                  <div key={title} className="ls-card" style={{ padding: '16px 18px', borderStyle: 'dashed', opacity: 0.7 }}>
                    <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 6 }}>{title}</div>
                    <div style={{ fontSize: 13.5, opacity: 0.4 }}>{hint}</div>
                  </div>
                ))}
              </div>
            )}

            {brief.talkingPoints.length > 0 && (
              <div className="ls-card ls-fade" style={{ padding: '16px 18px' }}>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>Talking points</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.6 }}>
                  {brief.talkingPoints.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
                </ul>
              </div>
            )}

            {brief.quotes.length > 0 && (
              <div className="ls-card ls-fade" style={{ padding: '16px 18px' }}>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 10 }}>Quotes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {brief.quotes.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ ...DISPLAY, color: '#C7BBA2', fontSize: 30, lineHeight: 0.9, fontWeight: 800 }}>&ldquo;</span>
                      <span style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 500 }}>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief.research.length > 0 && (
              <div className="ls-card ls-fade" style={{ padding: '16px 18px' }}>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 10 }}>Live research</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {brief.research.map((r, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${GOLD}`, paddingLeft: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.topic}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.85, marginTop: 2 }}>{r.finding}</div>
                      {r.source && <a className="ls-src" href={r.source} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>{(() => { try { const h = new URL(r.source).hostname.replace('www.', ''); return /vertexaisearch|grounding-api-redirect|googleusercontent/.test(h) ? 'source ↗' : `${h} ↗`; } catch { return 'source ↗'; } })()}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief.questions.length > 0 && (
              <div className="ls-card ls-fade" style={{ padding: '16px 18px' }}>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>Questions to ask</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.6 }}>
                  {brief.questions.map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
