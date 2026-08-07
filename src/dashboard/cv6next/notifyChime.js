// notifyChime — the sound a new agent message makes (Patrik 2026-08-06).
//
// Deliberately synthesised rather than a bundled audio file: no asset to load, no
// request to fail, and it stays in tune with the interface instead of sounding like
// a generic system alert. Two soft notes a fifth apart (E6 -> B6), fast attack and a
// short exponential tail, at low gain — a confirmation, not an alarm.
//
// Browsers refuse to make sound before the user has interacted with the page, so the
// very first attempt on a cold tab can be a no-op. That is correct behaviour, not a
// bug to work around: an unprompted noise on page load is exactly what autoplay
// policy exists to stop. Every call is wrapped — a muted chime must never break a
// render.

let ctx = null;

function context() {
  if (ctx) return ctx;
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function chimeMuted() {
  try { return localStorage.getItem('cv6.chime') === 'off'; } catch { return false; }
}

export function setChimeMuted(muted) {
  try { localStorage.setItem('cv6.chime', muted ? 'off' : 'on'); } catch { /* private mode */ }
}

export function playNotifyChime() {
  if (chimeMuted()) return;
  try {
    const ac = context();
    if (!ac) return;
    // A tab that has been backgrounded suspends the context; resume is a no-op when running.
    if (ac.state === 'suspended') ac.resume?.().catch?.(() => {});
    const start = ac.currentTime;
    [[1318.51, 0], [1975.53, 0.09]].forEach(([freq, delay]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = start + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.075, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  } catch { /* audio blocked or unavailable — silence is the right failure */ }
}
