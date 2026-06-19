import React, { useCallback, useEffect, useRef, useState } from 'react';

// Live Scribe — call/meeting companion (Mode B of aom:live-scribe).
// Listens to a call on speaker, builds a perfect running transcript (left,
// color-coded by speaker with live tap-to-name), and a living brief on the
// right: summary, talking points, verbatim quotes, live web research, questions.
//
// Transcript: browser SpeechRecognition (Chrome) feeds one live speaker; the
// self-hosted diarization engine (later) feeds real per-voice segments.
// The UI renders from a {speakerId,text} segment model + a speakers map, so
// renaming a voice relabels every line of theirs at once.
// Brief: /api/dashboard/call-scribe (Gemini + Google Search).
//
// `embedded` (R41 CV6): when true the page chrome is dropped and the warm-paper
// palette is swapped for CV6 theme variables so Scribe renders inside the
// dashboard tool shell. The standalone /scribe route renders with embedded=false
// and is byte-for-byte the original look.

const ANALYZE_EVERY_MS = 15000;
const GOLD = '#EAB308';
const INK = '#1A1714';
const PAPER = '#FAF7F0';
const CARD = '#FFFFFF';
const LINE = '#E7E0D2';
// Speaker palette — maximally separated on warm paper (green/orange/blue/purple first,
// since 4 voices is the common case), deliberately NOT gold (accent) or red (REC).
const SPEAKER_COLORS = ['#2F8E84', '#B5654A', '#3F7CAC', '#8E4B6E', '#6F7D3A', '#46588A'];
const LIVE_SPEAKER = 'S1'; // browser mic has no diarization; everything lands on one live voice

const SAMPLE = [
  ['S1', 'Thanks everyone for joining. Today we are deciding whether to move the launch to September.'],
  ['S2', 'I think September is tight. Engineering still has two integration bugs open.'],
  ['S3', 'From the marketing side, September actually lines up better with the trade show in Phoenix.'],
  ['S4', 'Budget wise we can support either, but slipping past September starts eating into Q4.'],
  ['S1', 'Okay. Can the brand assets be ready either way?'],
  ['S3', 'Yes, the brand kit is basically done. We just need the final logos signed off.'],
  ['S2', 'If we get one more week of QA, I am comfortable committing to September.'],
];

function useFonts(active) {
  useEffect(() => {
    if (!active) return;
    const id = 'live-scribe-fonts';
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }, [active]);
}

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export default function LiveScribe({ embedded = false }) {
  useFonts(!embedded);
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [segments, setSegments] = useState([]); // [{ speakerId, text }]
  const [speakers, setSpeakers] = useState({}); // id -> { name, color }
  const [editingSpeaker, setEditingSpeaker] = useState(null);
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
  const fileInputRef = useRef(null);

  const transcriptText = segments.map((s) => s.text).join(' ');

  useEffect(() => { recordingRef.current = recording; }, [recording]);
  useEffect(() => { finalRef.current = transcriptText; }, [transcriptText]);

  // auto-scroll transcript
  useEffect(() => {
    const el = transcriptScroll.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [segments, interim]);

  // elapsed timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const ensureSpeaker = useCallback((id, index) => {
    setSpeakers((prev) => {
      if (prev[id]) return prev;
      const n = Object.keys(prev).length;
      const idx = index != null ? index : n;
      return { ...prev, [id]: { name: `Speaker ${idx + 1}`, color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length] } };
    });
  }, []);

  const appendSegment = useCallback((speakerId, text) => {
    const clean = text.trim();
    if (!clean) return;
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speakerId === speakerId) {
        const merged = [...prev];
        merged[merged.length - 1] = { ...last, text: `${last.text} ${clean}`.trim() };
        return merged;
      }
      return [...prev, { speakerId, text: clean }];
    });
  }, []);

  const renameSpeaker = useCallback((id, name) => {
    const n = name.trim();
    setSpeakers((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], name: n || prev[id].name } } : prev));
    setEditingSpeaker(null);
  }, []);

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
      if (data && (data.summary || data.talkingPoints?.length || data.quotes?.length || data.research?.length)) {
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
    ensureSpeaker(LIVE_SPEAKER, 0);
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
      if (finalChunk) appendSegment(LIVE_SPEAKER, finalChunk);
      setInterim(interimChunk);
    };

    recog.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setErr('Microphone blocked. Allow mic access and press Start again.');
        setRecording(false);
        recordingRef.current = false;
      }
    };

    recog.onend = () => {
      if (recordingRef.current) {
        try { recog.start(); } catch { /* already starting */ }
      }
    };

    recogRef.current = recog;
    try { recog.start(); } catch { /* noop */ }
    setRecording(true);
    recordingRef.current = true;
  }, [appendSegment, ensureSpeaker]);

  const stop = useCallback(() => {
    setRecording(false);
    recordingRef.current = false;
    setInterim('');
    const recog = recogRef.current;
    if (recog) { try { recog.stop(); } catch { /* noop */ } }
    setTimeout(analyze, 400);
  }, [analyze]);

  const reset = useCallback(() => {
    setSegments([]); setSpeakers({}); setInterim(''); setElapsed(0); setEditingSpeaker(null);
    setBrief({ summary: '', talkingPoints: [], quotes: [], research: [], questions: [] });
    lastAnalyzedLen.current = 0;
    finalRef.current = '';
  }, []);

  // Load a finished, multi-voice transcript (sample, or a processed recording).
  // rows: [{ speakerId, text }] in spoken order. Assigns each new voice the next
  // color, so the transcript comes in already color-coded and ready to name.
  const loadResult = useCallback((rows, names) => {
    const clean = rows.filter((r) => r && r.text && r.text.trim()).map((r) => ({ speakerId: r.speakerId || 'S1', text: r.text.trim() }));
    const ids = [...new Set(clean.map((r) => r.speakerId))];
    const sp = {};
    ids.forEach((id, i) => { sp[id] = { name: (names && names[id]) || `Speaker ${i + 1}`, color: SPEAKER_COLORS[i % SPEAKER_COLORS.length] }; });
    setSpeakers(sp);
    setSegments(clean);
    setBrief({ summary: '', talkingPoints: [], quotes: [], research: [], questions: [] });
    setInterim(''); setElapsed(0); setEditingSpeaker(null); setErr('');
    finalRef.current = clean.map((s) => s.text).join(' ');
    lastAnalyzedLen.current = 0;
    setTimeout(analyze, 50);
  }, [analyze]);

  const loadSample = useCallback(() => {
    loadResult(SAMPLE.map(([speakerId, text]) => ({ speakerId, text })));
  }, [loadResult]);

  // Import a recording that was processed on our own machine. The processor
  // (engine/scribe-process.py) emits { segments:[{speakerId,text}], speakerNames }.
  const onImportFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const rows = Array.isArray(data) ? data : (data.segments || []);
      const names = Array.isArray(data) ? null : (data.speakerNames || null);
      if (!rows.length) { setErr('That file had no transcript lines in it.'); return; }
      loadResult(rows, names);
    } catch {
      setErr('Could not read that file. Pick a processed transcript saved as .json.');
    }
  }, [loadResult]);

  // Optional /scribe?demo=1 — auto-load the sample so the color/name view is
  // visible without interaction (shareable demo link; also used for verification).
  const demoLoaded = useRef(false);
  useEffect(() => {
    if (demoLoaded.current) return;
    if (typeof window !== 'undefined' && /[?&]demo=1\b/.test(window.location.search)) {
      demoLoaded.current = true;
      loadSample();
    }
  }, [loadSample]);

  const copyBrief = useCallback(() => {
    const lines = [];
    if (context.trim()) lines.push(`Call: ${context.trim()}`, '');
    if (brief.summary) lines.push('SUMMARY', brief.summary, '');
    if (brief.talkingPoints.length) { lines.push('TALKING POINTS'); brief.talkingPoints.forEach((p) => lines.push(`- ${p}`)); lines.push(''); }
    if (brief.quotes.length) { lines.push('QUOTES'); brief.quotes.forEach((q) => lines.push(`"${q}"`)); lines.push(''); }
    if (brief.research.length) { lines.push('RESEARCH'); brief.research.forEach((r) => lines.push(`- ${r.topic}: ${r.finding}${r.source ? ` (${r.source})` : ''}`)); lines.push(''); }
    if (brief.questions.length) { lines.push('QUESTIONS TO ASK'); brief.questions.forEach((q) => lines.push(`- ${q}`)); lines.push(''); }
    lines.push('FULL TRANSCRIPT');
    segments.forEach((s) => lines.push(`${speakers[s.speakerId]?.name || s.speakerId}: ${s.text}`));
    navigator.clipboard?.writeText(lines.join('\n'));
  }, [brief, context, segments, speakers]);

  // Theme — standalone (warm paper) vs embedded (CV6 vars). Same component, two skins.
  const C = embedded
    ? { paper: 'transparent', ink: 'var(--cv6-text-primary)', soft: 'var(--cv6-text-secondary)', card: 'var(--cv6-surface)', line: 'var(--cv6-divider)', gold: 'var(--cv6-accent-primary)', goldBorder: 'var(--cv6-accent-primary)', btnInk: '#ffffff', btnBorder: 'var(--cv6-divider)', src: 'var(--cv6-accent-primary)', rec: 'var(--cv6-accent-error)', accentSuccess: 'var(--cv6-accent-success)', accentWarn: 'var(--cv6-accent-warn)' }
    : { paper: PAPER, ink: INK, soft: INK, card: CARD, line: LINE, gold: GOLD, goldBorder: '#C9A227', btnInk: INK, btnBorder: INK, src: '#A66A00', rec: '#F87171', accentSuccess: '#34D399', accentWarn: '#FBBF24' };

  const F = embedded ? { fontFamily: 'inherit' } : { fontFamily: "'Space Grotesk', system-ui, sans-serif" };
  const DISPLAY = embedded ? { fontFamily: 'inherit' } : { fontFamily: "'Syne', system-ui, sans-serif" };
  const hasBrief = Boolean(brief.summary || brief.talkingPoints.length || brief.quotes.length || brief.research.length || brief.questions.length);
  const hasTranscript = segments.length > 0;
  const showActions = hasTranscript || hasBrief;
  const transcriptActive = recording || hasTranscript;
  const speakerIds = Object.keys(speakers);
  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
  const maxW = embedded ? '100%' : 1180;
  // Speaker accent colors for CV6 embedded mode (use CV6 accents for different speakers)
  const CV6_SPEAKER_ACCENTS = ['var(--cv6-accent-primary)', 'var(--cv6-accent-success)', 'var(--cv6-accent-warn)'];
  const getSpeakerAccent = (index) => CV6_SPEAKER_ACCENTS[index % CV6_SPEAKER_ACCENTS.length];

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', width: '100%', background: C.paper, color: C.ink, ...F }}>
      <style>{`
        .ls-card { background:${C.card}; border:1px solid ${C.line}; border-radius:16px; }
        .ls-btn { font-family:${embedded ? 'inherit' : "'Space Grotesk',sans-serif"}; font-weight:600; border-radius:999px; cursor:pointer; border:1px solid ${C.btnBorder}; transition:transform .08s ease, opacity .15s ease; }
        .ls-btn:active { transform:translateY(1px); }
        .ls-rec-dot { width:10px; height:10px; border-radius:50%; background:${embedded ? C.rec : '#E5484D'}; box-shadow:0 0 0 0 ${embedded ? 'rgba(248, 113, 113, 0.6)' : 'rgba(229,72,77,.6)'}; animation:lspulse 1.4s infinite; }
        @keyframes lspulse { 0%{box-shadow:0 0 0 0 ${embedded ? 'rgba(248, 113, 113, 0.55)' : 'rgba(229,72,77,.55)'}} 70%{box-shadow:0 0 0 9px ${embedded ? 'rgba(248, 113, 113, 0)' : 'rgba(229,72,77,0)'}} 100%{box-shadow:0 0 0 0 ${embedded ? 'rgba(248, 113, 113, 0)' : 'rgba(229,72,77,0)'}} }
        .ls-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:18px; }
        @media (max-width: 900px){ .ls-grid{ grid-template-columns:1fr; } }
        .ls-fade { animation:lsfade .3s ease; }
        @keyframes lsfade { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none} }
        a.ls-src { color:${C.src}; text-decoration:none; border-bottom:1px solid rgba(166,106,0,.3); }
        .ls-start-pulse { animation:lsbtnpulse 2.2s infinite; }
        @keyframes lsbtnpulse { 0%{box-shadow:0 0 0 0 rgba(234,179,8,.45)} 70%{box-shadow:0 0 0 14px rgba(234,179,8,0)} 100%{box-shadow:0 0 0 0 rgba(234,179,8,0)} }
        .ls-eq { display:flex; gap:5px; align-items:flex-end; height:34px; }
        .ls-eq span { width:5px; border-radius:3px; background:#C9A227; animation:lseq 1.1s ease-in-out infinite; }
        .ls-eq span:nth-child(2){ animation-delay:.18s } .ls-eq span:nth-child(3){ animation-delay:.36s } .ls-eq span:nth-child(4){ animation-delay:.54s } .ls-eq span:nth-child(5){ animation-delay:.72s }
        @keyframes lseq { 0%,100%{height:7px; opacity:.55} 50%{height:30px; opacity:1} }
        .ls-chip { display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; background:${embedded ? 'var(--cv6-surface)' : '#FBF9F4'}; border:1px solid ${C.line}; color:${C.ink}; }
        .ls-chip:hover { border-color:#C9BFA9; }
        .ls-chip-hint { animation:lschiphint 1.7s ease 3; }
        @keyframes lschiphint { 0%{box-shadow:0 0 0 0 rgba(26,23,20,.22)} 70%{box-shadow:0 0 0 7px rgba(26,23,20,0)} 100%{box-shadow:0 0 0 0 rgba(26,23,20,0)} }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onImportFile} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ maxWidth: maxW, margin: '0 auto', padding: embedded ? '14px 24px 12px' : '28px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {!embedded && (
              <div style={{ ...DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Live Scribe
              </div>
            )}
            {embedded && (
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.soft, marginBottom: 8 }}>
                Live Scribe
              </div>
            )}
            <div style={{ opacity: 0.6, fontSize: embedded ? 13.5 : 15, marginTop: embedded ? 0 : 8, maxWidth: 460 }}>
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
              <button className={`ls-btn${!hasTranscript ? ' ls-start-pulse' : ''}`} onClick={start}
                style={{ background: C.gold, color: C.btnInk, borderColor: C.goldBorder, padding: embedded ? '11px 24px' : '15px 34px', fontSize: embedded ? 15 : 17, fontWeight: 700 }}>
                {hasTranscript ? 'Resume' : 'Start listening'}
              </button>
            ) : (
              <button className="ls-btn" onClick={stop}
                style={{ background: C.rec, color: '#fff', padding: embedded ? '11px 22px' : '15px 30px', fontSize: embedded ? 15 : 17, fontWeight: 700, border: 'none', borderColor: C.rec }}>
                Stop {embedded ? '& save' : ''}
              </button>
            )}
          </div>
        </div>

        {/* context + actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: embedded ? 12 : 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional: who's this call with? (e.g. Acme Corp, partnership)"
            style={{ ...F, flex: '0 1 440px', minWidth: 220, padding: '9px 13px', borderRadius: 10, border: `1px solid ${C.line}`, background: 'transparent', color: C.ink, fontSize: 13.5, outline: 'none' }}
          />
          <span style={{ marginLeft: 'auto' }} />
          {showActions && (
            <>
              <button className="ls-btn" onClick={copyBrief} style={{ background: C.card, color: C.ink, padding: '9px 16px', fontSize: 13, borderColor: C.line }}>Copy brief</button>
              <button className="ls-btn" onClick={reset} style={{ background: C.card, color: '#9A4A4A', padding: '9px 16px', fontSize: 13, borderColor: C.line }}>Clear</button>
            </>
          )}
        </div>

        {!supported && (
          <div className="ls-card" style={{ marginTop: 16, padding: 16, borderColor: '#E5C07A', background: '#FFF7E6', color: INK }}>
            Live transcription needs Chrome (it uses Chrome's built-in speech engine). Open this page in Chrome and press Start.
          </div>
        )}
        {err && <div style={{ marginTop: 12, color: '#9A4A4A', fontSize: 13 }}>{err}</div>}
      </div>

      {/* Body */}
      <div style={{ maxWidth: maxW, margin: '0 auto', padding: embedded ? '12px 0 8px' : '16px 24px 48px' }}>
        <div className="ls-grid">
          {/* Transcript */}
          <div className="ls-card" style={{ display: 'flex', flexDirection: 'column', height: transcriptActive ? 'min(70vh, 640px)' : 320 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>Transcript</span>
              <span style={{ fontSize: 12, opacity: 0.45 }}>{hasTranscript ? `${wordCount} words` : (recording ? 'listening…' : 'ready')}</span>
            </div>

            {/* Speaker chips — tap to name */}
            {speakerIds.length > 0 && (
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.line}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {speakerIds.map((id, idx) => {
                  const speakerColor = embedded ? getSpeakerAccent(idx) : speakers[id].color;
                  return editingSpeaker === id ? (
                    <input
                      key={id}
                      autoFocus
                      defaultValue={speakers[id].name}
                      onBlur={(e) => renameSpeaker(id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameSpeaker(id, e.target.value); if (e.key === 'Escape') setEditingSpeaker(null); }}
                      style={{ ...F, fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: `1px solid ${speakerColor}`, outline: 'none', width: 130, color: C.ink, background: 'transparent' }}
                    />
                  ) : (
                    <button key={id} className={`ls-chip${idx === 0 ? ' ls-chip-hint' : ''}`} onClick={() => setEditingSpeaker(id)} title="Tap to name this voice">
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: speakerColor }} />
                      <span>{speakers[id].name}</span>
                    </button>
                  );
                })}
                <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 4 }}>tap a voice to name it</span>
              </div>
            )}

            <div ref={transcriptScroll} style={{ padding: '18px', overflowY: 'auto', flex: 1, fontSize: 16, lineHeight: 1.7 }}>
              {!hasTranscript && !interim ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div className="ls-eq" aria-hidden="true"><span /><span /><span /><span /><span /></div>
                  <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, opacity: 0.55 }}>
                    {recording ? 'Listening…' : 'Ready to listen'}
                  </div>
                  {!recording && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 13, opacity: 0.4 }}>Press Start listening, or bring in a recording.</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="ls-btn" onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', color: C.ink, padding: '7px 14px', fontSize: 12.5, borderColor: C.line }}>
                          Import a recording
                        </button>
                        <button className="ls-btn" onClick={loadSample} style={{ background: 'transparent', color: C.ink, padding: '7px 14px', fontSize: 12.5, borderColor: C.line }}>
                          Load sample conversation
                        </button>
                      </div>
                      <div style={{ fontSize: 11.5, opacity: 0.35, maxWidth: 320, textAlign: 'center' }}>
                        Recordings get their voices separated on our own machine, then come in here color-coded and ready to name.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {segments.map((s, i) => {
                    const sp = speakers[s.speakerId];
                    const prev = segments[i - 1];
                    const showLabel = !prev || prev.speakerId !== s.speakerId;
                    const speakerAccent = embedded ? getSpeakerAccent(speakerIds.indexOf(s.speakerId)) : sp.color;
                    return (
                      <div key={i} className="ls-fade">
                        {showLabel && sp && (
                          <div
                            onClick={() => setEditingSpeaker(s.speakerId)}
                            style={{ ...DISPLAY, color: speakerAccent, fontWeight: 600, fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 3, cursor: 'pointer', opacity: 0.92 }}
                            title="Tap to name this voice"
                          >
                            {sp.name}
                          </div>
                        )}
                        <div style={{ borderLeft: sp ? `3px solid ${speakerAccent}99` : 'none', paddingLeft: sp ? 13 : 0 }}>{s.text}</div>
                      </div>
                    );
                  })}
                  {interim && <div style={{ opacity: 0.45, paddingLeft: 12 }}>{interim}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Brief / Extracted (desktop CV6 shows this as right panel with "extracted" label + export button) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="ls-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>
                  {embedded ? 'Brief' : 'Brief'}
                </span>
                {analyzing && <span style={{ fontSize: 12, color: C.src }}>updating…</span>}
                {/* TODO(cv6): Export button (session export via brief.json) not yet implemented */}
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

            {/* TODO(cv6): "Action items" section with checkboxes (from brief.actionItems) not yet backed by API */}

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
                    <div key={i} style={{ display: 'flex', gap: 10, borderLeft: `2px solid ${C.gold}`, paddingLeft: 10, paddingTop: 0, paddingBottom: 0 }}>
                      <span style={{ ...DISPLAY, color: embedded ? C.gold : '#C7BBA2', fontSize: 30, lineHeight: 0.9, fontWeight: 800, marginLeft: -10 }}>&ldquo;</span>
                      <span style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 500, fontStyle: 'italic' }}>{q}</span>
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
                    <div key={i} style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.topic}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.85, marginTop: 2 }}>{r.finding}</div>
                      {r.source && <a className="ls-src" href={r.source} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>{(() => { try { const h = new URL(r.source).hostname.replace('www.', ''); return /vertexaisearch|grounding-api-redirect|googleusercontent/.test(h) ? 'source ↗' : `${h} ↗`; } catch { return 'source ↗'; } })()}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TODO(cv6): "Decisions" section (from brief.decisions) not yet backed by API */}

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

      {/* TODO(cv6): Mobile persistent recording mini-bar above nav (58px, shows timer + waveform + pause/stop buttons).
          Requires integration with HomeView to place above mobile nav on "scribe" tool view. Currently no backing in CV6 design-to-code for mobile nav overlay positioning. */}
    </div>
  );
}
