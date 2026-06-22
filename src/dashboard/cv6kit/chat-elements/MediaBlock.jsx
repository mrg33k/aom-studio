import React from 'react';

/**
 * CV6 kit Chat — Media Block (audio + video).
 * Renders voice notes with waveform + transcript, or video with poster + duration.
 * Static visual; no real playback engine.
 * Faithful to ui_kits/agent-chat/media.html design system.
 *
 * Props:
 *   AudioBlock({ duration, waveform, transcriptText, showTranscript, onToggleTranscript })
 *   VideoBlock({ duration, title, posterImage, onPlay })
 *
 * Renders inside [data-cv6kit] ancestor (chat surface provides it).
 * Uses chat.css class names: turn, tav, tbody, tname, caudio, cvideo, bubble, chips, chip-btn.
 */

/**
 * AudioBlock: voice note with scrubbable waveform + optional transcript.
 * The waveform shows playback progress; transcript is toggled.
 */
export function AudioBlock({
  duration = '0:24',
  currentTime = '0:09',
  waveform = null,
  transcriptText = '"Quick update: the resolver patch is in and verified. I\'ll start the regression test now and ping you if the print key gives me trouble."',
  showTranscript = false,
  onToggleTranscript = () => {},
  agentName = 'Elon',
  agentInitials = 'EL',
}) {
  // Default waveform heights if not provided
  const defaultWave = [30, 60, 85, 50, 100, 70, 40, 80, 55, 95, 45, 65, 35, 75, 50, 90, 40, 60];
  const waveHeights = waveform || defaultWave;

  return (
    <div className="turn">
      <div className="tav">{agentInitials}</div>
      <div className="tbody">
        <div className="tname">
          <b>{agentName}</b>
          <span className="tt">voice note · {duration}</span>
        </div>

        {/* Audio player with waveform */}
        <div className="caudio">
          <button className="play" aria-label="Play audio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
              <path d="M7 5l12 7-12 7Z" />
            </svg>
          </button>
          <div className="wave">
            {waveHeights.map((height, i) => (
              <i key={i} className={i < 6 ? 'on' : ''} style={{ height: `${height}%` }} />
            ))}
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)', flex: 'none' }}>
            {currentTime}
          </span>
        </div>

        {/* Transcript toggle button */}
        <button
          onClick={onToggleTranscript}
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            paddingLeft: '2px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h10M4 18h13" />
          </svg>
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>

        {/* Transcript text (displayed when toggled) */}
        {showTranscript && (
          <div className="bubble" style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
            {transcriptText}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * VideoBlock: screen recording or video message with poster + duration.
 * Shows play button overlay, metadata chips, and action buttons.
 */
export function VideoBlock({
  duration = '1:48',
  title = 'Onboarding walkthrough',
  posterImage = null,
  onPlay = () => {},
  agentName = 'Rex',
  agentInitials = 'RX',
  agentAvatarBg = 'rgba(163,230,53,.2)',
  agentAvatarColor = '#A3E635',
}) {
  return (
    <div className="turn">
      <div className="tav" style={{ background: agentAvatarBg, color: agentAvatarColor }}>
        {agentInitials}
      </div>
      <div className="tbody">
        <div className="tname">
          <b>{agentName}</b>
          <span className="tt">screen recording · {duration}</span>
        </div>

        {/* Video poster with play button overlay */}
        <div className="cvideo" style={{ backgroundImage: posterImage ? `url(${posterImage})` : 'linear-gradient(135deg,#26303f,#13161c)' }}>
          <div className="vplay" onClick={onPlay} role="button" aria-label="Play video" style={{ cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5l11 7-11 7Z" />
            </svg>
          </div>
          <div className="vmeta">
            <span className="vchip">▶ {duration}</span>
            <span style={{ flex: 1 }} />
            <span className="vchip">{title}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="chips">
          <button className="chip-btn is-primary" onClick={onPlay}>
            Play
          </button>
          <button className="chip-btn">Send to Review</button>
          <button className="chip-btn">Transcript</button>
        </div>
      </div>
    </div>
  );
}
