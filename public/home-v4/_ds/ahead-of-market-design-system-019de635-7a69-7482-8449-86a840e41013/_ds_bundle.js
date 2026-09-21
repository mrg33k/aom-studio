/* @ds-bundle: {"format":4,"namespace":"DesignSystem_019de6","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"f0a74285abe5","components/core/Button.jsx":"070c93885398","ui_kits/website/archive/loop-v3.js":"7453ddd08d61","ui_kits/website/image-slot.js":"fff26d081c8d","ui_kits/website/loop-standalone.js":"850b8104132c","ui_kits/website/loop.js":"5aef8c35e993"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_019de6 = window.DesignSystem_019de6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Ahead of Market — Logo
 * The monogram mark, injected inline so it inherits CSS `color`.
 * Resolves assets/logo/aom-monogram.svg relative to the loaded
 * _ds_bundle.js (works from any consuming page depth).
 */
let monogramCache = null;
let monogramPromise = null;
function loadMonogram() {
  if (monogramCache) return Promise.resolve(monogramCache);
  if (!monogramPromise) {
    const tag = Array.from(document.querySelectorAll('script[src]')).find(s => s.src.includes('_ds_bundle.js'));
    const root = tag ? tag.src.replace(/_ds_bundle\.js.*$/, '') : './';
    monogramPromise = fetch(root + 'assets/logo/aom-monogram.svg').then(r => r.text()).then(t => {
      monogramCache = t;
      return t;
    }).catch(() => '');
  }
  return monogramPromise;
}
function Logo({
  size = 36,
  withWordmark = false,
  style = {},
  ...rest
}) {
  const [svg, setSvg] = React.useState(monogramCache);
  React.useEffect(() => {
    if (!svg) loadMonogram().then(setSvg);
  }, []);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: Math.max(8, size * 0.3),
      color: 'inherit',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-label": "Ahead of Market",
    role: "img",
    style: {
      width: size,
      height: size,
      display: 'inline-block',
      flex: 'none'
    },
    dangerouslySetInnerHTML: {
      __html: (svg || '').replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')
    }
  }), withWordmark && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-bold)',
      fontSize: Math.round(size * 0.46),
      letterSpacing: 'var(--tracking-tight)',
      whiteSpace: 'nowrap'
    }
  }, "Ahead of Market"));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Ahead of Market — Button
 * Pill-shaped, flat. primary = warm-white fill (flips per theme),
 * accent = lime (one per view), secondary = hairline outline that
 * brightens on hover, ghost = bare. Press nudges 1px. No shadows.
 */
function Button({
  children,
  variant = 'primary',
  // primary | accent | secondary | ghost
  size = 'md',
  // sm | md | lg
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  className = '',
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      h: 'var(--control-h-sm)',
      px: 'var(--space-4)',
      fs: 'var(--text-sm)'
    },
    md: {
      h: 'var(--control-h)',
      px: 'var(--space-6)',
      fs: 'var(--text-body)'
    },
    lg: {
      h: 'var(--control-h-lg)',
      px: 'var(--space-8)',
      fs: 'var(--text-lg)'
    }
  };
  const s = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      bg: 'var(--text)',
      fg: 'var(--text-inverse)',
      bd: 'transparent',
      hbg: 'var(--accent)',
      hfg: 'var(--on-accent)'
    },
    accent: {
      bg: 'var(--accent)',
      fg: 'var(--on-accent)',
      bd: 'transparent',
      hbg: 'var(--accent-hover)',
      hfg: 'var(--on-accent)'
    },
    secondary: {
      bg: 'transparent',
      fg: 'var(--text)',
      bd: 'var(--border-strong)',
      hbg: 'transparent',
      hfg: 'var(--text)',
      hbd: 'var(--text)'
    },
    ghost: {
      bg: 'transparent',
      fg: 'var(--text)',
      bd: 'transparent',
      hbg: 'var(--surface-raised)',
      hfg: 'var(--text)'
    }
  };
  const p = palettes[variant] || palettes.primary;
  const [hover, setHover] = React.useState(false);
  const on = hover && !disabled;
  const css = {
    display: block ? 'flex' : 'inline-flex',
    width: block ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    height: s.h,
    padding: `0 ${s.px}`,
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-bold)',
    fontSize: s.fs,
    letterSpacing: 'var(--tracking-tight)',
    color: on ? p.hfg : p.fg,
    background: on ? p.hbg : p.bg,
    border: `var(--rule-hairline) solid ${on ? p.hbd || p.bd : p.bd}`,
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)',
    whiteSpace: 'nowrap',
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    className: className,
    style: css,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: e => {
      setHover(false);
      e.currentTarget.style.transform = 'translateY(0)';
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'translateY(1px)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'translateY(0)';
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/archive/loop-v3.js
try { (() => {
/* Ahead of Market — endless card loop, v2.
   One viewport. Wheel, drag and idle drift all feed the same rail.
   No indices anywhere: cards are named, not numbered. */
const CARDS = [{
  kind: 'story',
  step: 1,
  label: 'Who we are',
  title: 'You already do the real work',
  hi: '#E8DFCB',
  hion: '#12120F',
  paper: true,
  disp: 'You already do [[the real work]].',
  tags: [{
    t: 'Construction',
    x: 5,
    y: 11,
    r: -3
  }, {
    t: 'Trades',
    x: 66,
    y: 7,
    r: 4
  }, {
    t: 'Founders',
    x: 60,
    y: 78,
    r: -2
  }, {
    t: 'Nonprofits',
    x: 6,
    y: 84,
    r: 3
  }],
  body: 'AOM is a creative production and systems company based in Phoenix. We work with construction companies, founders, nonprofits and brands that do real work. The work is already good. The story around it usually is not.',
  story: [{
    h: 'Who this is for',
    p: 'Construction companies, specialty trades, founders, nonprofits and brands that do real work — companies whose marketing has never caught up to what they actually build.'
  }, {
    h: 'How we are set up',
    p: 'A small Phoenix team. The people who pitch the work make the work: shooting, editing, designing and building in-house.'
  }]
}, {
  kind: 'story',
  step: 2,
  label: 'The problem',
  title: 'Nobody outside your office ever sees it',
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'But nobody outside of your office {{ever sees it}}.',
  tags: [{
    t: 'The gap',
    x: 6,
    y: 10,
    r: -4
  }, {
    t: 'Best-kept secret',
    x: 5,
    y: 84,
    r: 3
  }],
  body: 'The best proof you have is happening on site every day, and it dies there. No footage, no story, no reason for anyone new to believe you.',
  story: [{
    h: 'What it costs',
    p: 'Bids won on price instead of trust. Crews who never heard of you. A feed that looks like every competitor in the state.'
  }, {
    h: 'Why it happens',
    p: 'Nobody on your team has time to film it, and the agencies who offer to have never stood on a roof in July.'
  }]
}, {
  kind: 'story',
  step: 3,
  label: 'What we do',
  title: 'That is where we come in',
  hi: '#DD5420',
  hion: '#FFF6EE',
  paper: true,
  disp: 'That is where [[we come in]].',
  tags: [{
    t: 'Video',
    x: 64,
    y: 8,
    r: 5
  }, {
    t: 'Social',
    x: 5,
    y: 13,
    r: -3
  }, {
    t: 'Websites',
    x: 62,
    y: 79,
    r: -4
  }, {
    t: 'AI systems',
    x: 5,
    y: 86,
    r: 3
  }],
  body: 'A day or two on site with your crew. No script, no stock, no borrowed footage. Then we build everything around it: the content, the website and the systems that keep it moving.',
  story: [{
    h: 'Video',
    p: 'Brand films, founder series and job-site stories. Production through final cut, in every length each platform actually wants.'
  }, {
    h: 'Social',
    p: 'One shoot day becomes a month of native posts. We run the calendar and write the hooks.'
  }, {
    h: 'Websites',
    p: 'Marketing sites and web apps, designed and engineered by the same people who cut the film.'
  }, {
    h: 'AI systems',
    p: 'AI-powered workflows behind the content so publishing never waits on another meeting.'
  }]
}, {
  kind: 'story',
  step: 4,
  label: 'How it works',
  title: 'Your story, told and seen',
  hi: '#A8C0D8',
  hion: '#12120F',
  paper: true,
  disp: 'AOM makes sure your story is [[told and seen]].',
  tags: [{
    t: '01 · We come to you',
    x: 5,
    y: 10,
    r: -3
  }, {
    t: '02 · Nine cuts',
    x: 58,
    y: 8,
    r: 4
  }, {
    t: '03 · It keeps running',
    x: 5,
    y: 86,
    r: -2
  }],
  body: 'The hero film, the bid-room version, the recruiting cut and a month of short native posts — all out of the same two days.',
  story: [{
    h: 'We come to you',
    p: 'One or two days on site. We work around the crew, not the other way around.'
  }, {
    h: 'We cut it many ways',
    p: 'Nine versions, three lengths, every platform native. Nothing exported sideways.'
  }, {
    h: 'We keep it running',
    p: 'Content ships on a calendar you can see, month after month.'
  }]
}, {
  kind: 'ask',
  step: 5,
  label: 'How we help',
  title: 'How can we help you?',
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'How can we [[help you]]?',
  opts: [{
    t: 'We need web creativity',
    p: 'A site that looks like the work'
  }, {
    t: 'We need to get social',
    p: 'Always-on content, run for you'
  }, {
    t: 'We need a video',
    p: 'One film that does the convincing'
  }, {
    t: 'We need a marketing team',
    p: 'All of it, handled in-house'
  }],
  body: 'Pick the closest one. We reply with a plan, a price and a date — not a discovery call.',
  story: [{
    h: 'What changes',
    p: 'Leads that already trust you, bids you get invited into, and applicants who came looking for you.'
  }, {
    h: 'How we start',
    p: 'Three questions and a look at what you already have. Then a plan you can say yes or no to.'
  }]
}, {
  kind: 'work',
  label: 'Work',
  title: 'Sunland Builders — brand film',
  meta: 'Brand film · 2026',
  metric: 'The bid-winning cut',
  slot: 'loop-work-1',
  src: '../../assets/photos/rooftop-crew.jpeg',
  body: 'Two days on site, no script, no borrowed footage. The film now opens every bid presentation Sunland walks into.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'Almost a million views',
  say: 'The video you guys made us hit almost a million views organically (not kidding)',
  who: 'Founder · construction',
  body: 'One founder series, posted natively, no paid support. Organic first is not a budget constraint — it is the proof that the story works.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Video',
  tone: 'pale',
  name: 'Video',
  head: 'Films that get watched',
  pts: ['Brand films', 'Founder series', 'Job-site stories'],
  body: 'Production to final cut, in-house. Nine versions, three lengths, every platform native — nothing exported sideways.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Founder series, Vol. 1',
  meta: 'Social system · 2026',
  metric: 'Almost a million views',
  slot: 'loop-work-2',
  src: '../../assets/photos/founders.jpeg',
  body: 'A weekly founder series built to compound: one shoot day, a month of native cuts, a feed that works while you run the company.'
}, {
  kind: 'team',
  label: 'Studio',
  title: 'Small on purpose',
  slot: 'loop-team',
  src: '../../assets/photos/portrait-mat.jpeg',
  head: 'Small on purpose',
  who: 'Ahead of Market · Phoenix',
  body: 'The people who pitch the work make the work. No account layer, no handoff, no drift between the idea and what ships.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Desert Hope gala film',
  meta: 'Nonprofit film · 2025',
  metric: 'Giving up by two thirds',
  slot: 'loop-work-3',
  src: '../../assets/photos/restaurant-team.jpeg',
  body: 'A three-minute film cut for a room of 400 donors, then re-cut for the eleven months between galas.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Web',
  tone: 'pale',
  name: 'Web',
  head: 'Sites that convert',
  pts: ['Marketing sites', 'Web apps', 'Design engineering'],
  body: 'Precise, editorial builds. Fast, monochrome, every pixel earning its place.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'A new league',
  say: 'Your taking us into a new league',
  who: 'Owner · specialty trades',
  body: 'Said after the first cut landed. The work is judged by what it changes — the bids you get invited to, the crews who apply.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Crew stories — recruiting',
  meta: 'Campaign · 2025',
  metric: 'Three times the applicants',
  slot: 'loop-work-4',
  src: '../../assets/photos/duct-install.jpeg',
  body: 'Recruiting content shot with the crew who actually do the work. Three times the qualified applicants in one quarter.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Systems',
  tone: 'pale',
  name: 'Systems',
  head: 'Social and AI workflows',
  pts: ['Social systems', 'AI workflows', 'Always-on content'],
  body: 'Content engines with AI-powered workflows behind them, so the feed keeps moving without another meeting.'
}, {
  kind: 'post',
  label: 'Journal',
  title: 'Nobody watches your intro',
  tone: 'pale',
  head: 'Nobody watches your intro',
  meta: 'Journal · March 2026',
  body: 'The first three seconds decide everything. Logo stings, drone establishing shots and a slow fade into a mission statement are three seconds you do not have.',
  story: [{
    h: 'Start in the middle',
    p: 'Open on the loudest, most specific moment you have: the torch, the pour, the plate leaving the pass. Context can come second — attention cannot.'
  }, {
    h: 'Say one thing',
    p: 'A film that says four things says nothing. Pick the sentence you want repeated back to you and cut everything that is not it.'
  }, {
    h: 'Cut for the platform, not the pitch deck',
    p: 'The same story wants a different edit on a phone than on a projector. We deliver both rather than compromising into one.'
  }]
}, {
  kind: 'cta',
  label: 'Start',
  title: 'Work with us',
  head: 'Tell us what you need',
  body: 'Three questions. We reply with a plan, a price and a date — not a discovery call.'
}];
const QUIZ = [{
  q: 'What do you need?',
  opts: ['A video that actually lands', 'Social content that compounds', 'A website that converts', 'All of it — make us impossible to ignore']
}, {
  q: 'When does it go live?',
  opts: ['This month', 'This quarter', 'Still planning']
}, {
  q: 'Who are you?',
  opts: ['Construction / trades', 'Founder-led brand', 'Nonprofit', 'Something else']
}];
const rail = document.getElementById('rail');
const labelEl = document.getElementById('label');
const ticksEl = document.getElementById('ticks');
const hintEl = document.getElementById('hint');
const ov = document.getElementById('ov');
const hero = document.getElementById('hero');
const pagebody = document.getElementById('pagebody');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const MARK = '../../assets/logo/aom-monogram.svg';
function cardHTML(c) {
  const top = '';
  const edge = `<span class="edge"></span><span class="sheen"></span>`;
  const open = `<span class="open lbl">Open</span>`;
  const media = ph => c.src ? `<img class="shot" src="${c.src}" alt="" loading="lazy" />` : `<image-slot id="${c.slot}" shape="rect" placeholder="${ph}"></image-slot>`;
  if (c.kind === 'work') return `${media('Still')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><div class="rule"></div><div class="metric">${esc(c.metric)}</div><h3 style="margin-top:10px">${esc(c.title)}</h3><p>${esc(c.meta)}</p></div>${open}</div>`;
  if (c.kind === 'team') return `${media('Studio photo')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><h3>${esc(c.head)}</h3><p>${esc(c.who)}</p></div>${open}</div>`;
  if (c.kind === 'quote') return `<span class="quo">”</span>${edge}<div class="in">${top}<p class="say" style="margin:auto 0 0">${esc(c.say)}</p><div class="rule" style="margin-top:18px"></div><p style="margin-top:12px">${esc(c.who)}</p>${open}</div>`;
  if (c.kind === 'ask') {
    const d2 = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>');
    const opts = c.opts.map((o, n) => `<button class="opt" style="--i:${n}"><b>${esc(o.t)}</b><i>${esc(o.p)}</i></button>`).join('');
    return `${edge}<span class="idx">05</span><div class="in"><p class="disp ask">${d2}</p><div class="opts">${opts}</div>${open}</div>`;
  }
  if (c.kind === 'story') {
    const disp = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>').replace(/\{\{(.+?)\}\}/g, '<span class="un">$1</span>');
    const tags = (c.tags || []).map((t, n) => `<span class="tag${n === 0 ? ' tag--fill' : ''}" style="left:${t.x}%;top:${t.y}%;--r:${t.r}deg;--i:${n}">${esc(t.t)}</span>`).join('');
    return `${edge}${tags}<span class="idx">${String(c.step || 1).padStart(2, '0')}</span><div class="in"><p class="disp">${disp}</p>${open}</div>`;
  }
  if (c.kind === 'post') return `${edge}<div class="in">${top}<div class="foot"><div class="lbl" style="color:var(--gray-500)">${esc(c.meta)}</div><h3 class="big" style="margin-top:12px">${esc(c.head)}</h3></div>${open}</div>`;
  if (c.kind === 'explain') return `${edge}<div class="in">${top}<div class="foot"><h3 class="big">${esc(c.head)}</h3><ul class="svc num">${c.pts.map((p, n) => `<li><i>${String(n + 1).padStart(2, '0')}</i>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  if (c.kind === 'say') return `<img class="wm" src="${MARK}" alt="" />${edge}<div class="in">${top}<p class="big">${esc(c.big)}</p><p class="lbl" style="color:var(--gray-500);margin-top:18px">${esc(c.kicker || 'Read more')}</p></div>`;
  if (c.kind === 'svc') return `${edge}<span class="vert lbl">${esc(c.name)}</span><div class="in">${top}<div class="foot"><div class="wordmark">${esc(c.name)}</div><h3 style="margin-top:12px">${esc(c.head)}</h3><ul class="svc">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  return `${edge}<img class="wm" src="${MARK}" alt="" /><div class="in">${top}<h3 class="big" style="margin-top:auto">${esc(c.head)}</h3><p style="margin-top:16px">${esc(c.body)}</p><p class="lbl" style="margin-top:20px">Start here →</p></div>`;
}
CARDS.forEach(c => {
  c.span = {
    ask: 1.24,
    story: 1.18,
    say: 1.24,
    explain: 1,
    work: 1.34,
    quote: 1.12,
    svc: .84,
    team: 1,
    post: 1.06,
    cta: .9
  }[c.kind] || 1;
});
const els = CARDS.map((c, i) => {
  const d = document.createElement('div');
  d.className = 'card card--' + c.kind + (c.tone === 'pale' ? ' card--pale' : '');
  d.dataset.i = i;
  if (c.paper) d.setAttribute('data-paper', '');
  if (c.hi) {
    d.style.setProperty('--hi-bg', c.hi);
    d.style.setProperty('--hi-fg', c.hion);
  }
  d.innerHTML = cardHTML(c);
  rail.appendChild(d);
  return d;
});
CARDS.forEach((c, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', c.title);
  b.addEventListener('click', () => travelTo(i));
  ticksEl.appendChild(b);
});
const ticks = [...ticksEl.children];

/* ---- geometry + motion ---- */
let step = 0,
  total = 0,
  x = 0,
  v = 0,
  drag = null,
  target = null,
  active = -1,
  touched = false;
let W = [],
  P = [];
const DRIFT = 0.38;
function measure() {
  const rh = rail.clientHeight || 480;
  const h = Math.max(250, Math.min(460, rh - 30));
  const base = Math.round(h * 0.72);
  const k = h / 428;
  const gap = window.innerWidth < 760 ? 18 : Math.round(30 * k);
  W = CARDS.map(c => Math.round(base * (window.innerWidth < 760 ? 1 : c.span)));
  els.forEach((el, i) => {
    el.style.width = W[i] + 'px';
    el.style.height = h + 'px';
    el.style.marginTop = -h / 2 + 'px';
    el.style.marginLeft = -W[i] / 2 + 'px';
  });
  rail.style.setProperty('--k', k.toFixed(3));
  let acc = 0;
  P = [];
  for (let i = 0; i < W.length; i++) {
    P.push(acc + W[i] / 2);
    acc += W[i] + gap;
  }
  total = acc;
  step = base + gap;
}
const wrap = d => {
  d = (d % total + total) % total;
  return d > total / 2 ? d - total : d;
};
function frame() {
  if (drag) {
    v = v * 0.6 + (x - drag.lastX) * 0.4;
    drag.lastX = x;
  } else if (target !== null) {
    const d = wrap(target - x);
    if (Math.abs(d) < 0.4) {
      x = target;
      target = null;
      v = DRIFT;
    } else {
      x += d * 0.085;
      v = d * 0.085;
    }
  } else {
    x += v;
    v += (DRIFT - v) * 0.033;
  }
  render();
  requestAnimationFrame(frame);
}
function render() {
  const half = window.innerWidth / 2 + step;
  let best = 1e9,
    bestI = 0;
  for (let i = 0; i < els.length; i++) {
    const dx = wrap(P[i] - x);
    const a = Math.abs(dx);
    if (a < best) {
      best = a;
      bestI = i;
    }
    if (a > half) {
      if (els[i].style.visibility !== 'hidden') els[i].style.visibility = 'hidden';
      continue;
    }
    const n = dx / step; // signed distance in cards
    // deadband: anything within a third of a card of centre reads as fully live
    const t = Math.min(1, Math.max(0, (a - step * 0.34) / (step * 2)));
    const ry = Math.max(-10, Math.min(10, -n * 4.2)); // slight turn away from centre
    const tf = `translate3d(${dx.toFixed(1)}px,${(t * 14).toFixed(1)}px,${(-t * 90).toFixed(0)}px) rotateY(${ry.toFixed(2)}deg) scale(${(1 - t * 0.07).toFixed(3)})`;
    els[i].style.visibility = 'visible';
    if (els[i].dataset.tf !== tf) {
      els[i].dataset.tf = tf;
      els[i].style.transform = tf;
      els[i].style.opacity = (1 - t * 0.7).toFixed(3);
      els[i].style.zIndex = String(100 - Math.round(a));
    }
  }
  if (bestI !== active) setActive(bestI);
}
function setActive(i) {
  if (active >= 0) els[active].removeAttribute('data-live');
  active = i;
  els[i].setAttribute('data-live', '');
  const c = CARDS[i];
  const span = document.createElement('span');
  span.innerHTML = `<i>${esc(c.label)} &nbsp;</i><b>${esc(c.title)}</b>`;
  span.style.opacity = '0';
  span.style.transform = 'translateY(6px)';
  [...labelEl.children].slice(0, -1).forEach(n => {
    if (n !== labelEl.lastChild) n.remove();
  });
  const old = labelEl.firstChild;
  labelEl.appendChild(span);
  requestAnimationFrame(() => {
    span.style.opacity = '1';
    span.style.transform = 'none';
    if (old) {
      old.style.opacity = '0';
      old.style.transform = 'translateY(-6px)';
      setTimeout(() => old.remove(), 320);
    }
  });
  ticks.forEach((d, k) => k === i ? d.setAttribute('data-on', '') : d.removeAttribute('data-on'));
}
function travelTo(i) {
  target = x + wrap(P[i] - x);
}
function markTouched() {
  if (!touched) {
    touched = true;
    hintEl.setAttribute('data-off', '');
  }
}

/* ---- input ---- */
addEventListener('wheel', e => {
  if (ov.hasAttribute('data-on')) return;
  e.preventDefault();
  markTouched();
  target = null;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  v = Math.max(-70, Math.min(70, v + d * 0.09));
}, {
  passive: false
});
rail.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  rail.setPointerCapture(e.pointerId);
  rail.setAttribute('data-drag', '');
  markTouched();
  target = null;
  drag = {
    px: e.clientX,
    x0: x,
    lastX: x,
    moved: 0
  };
});
rail.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.px;
  drag.moved = Math.max(drag.moved, Math.abs(dx));
  x = drag.x0 - dx;
});
const endDrag = e => {
  if (!drag) return;
  const wasClick = drag.moved < 6;
  const card = e.target && e.target.closest ? e.target.closest('.card') : null;
  drag = null;
  rail.removeAttribute('data-drag');
  if (wasClick && card) {
    const i = +card.dataset.i;
    if (i === active) openCard(i);else travelTo(i);
  }
};
rail.addEventListener('pointerup', endDrag);
rail.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOv();
  if (ov.hasAttribute('data-on')) return;
  if (e.key === 'ArrowRight') {
    markTouched();
    travelTo((active + 1) % CARDS.length);
  }
  if (e.key === 'ArrowLeft') {
    markTouched();
    travelTo((active - 1 + CARDS.length) % CARDS.length);
  }
  if (e.key === 'Enter') openCard(active);
});
document.querySelectorAll('#dock [data-go]').forEach(b => b.addEventListener('click', () => {
  markTouched();
  const go = b.dataset.go;
  if (go === 'cta') {
    const i = CARDS.findIndex(c => c.kind === 'cta');
    travelTo(i);
    openCard(i);
    return;
  }
  const kinds = go === 'work' ? ['work'] : ['story', 'ask', 'work', 'team', 'svc', 'post'];
  let i = active;
  for (let k = 1; k <= CARDS.length; k++) {
    const j = (active + k) % CARDS.length;
    if (kinds.includes(CARDS[j].kind)) {
      i = j;
      break;
    }
  }
  travelTo(i);
}));

/* ---- dedicated page per card ---- */
let openI = -1,
  animating = false;
const EASE = 'cubic-bezier(.2,.85,.2,1)';
function heroHTML(c) {
  const kicker = c.meta || c.who || c.kicker || 'Ahead of Market';
  const head = c.kind === 'quote' ? `“${esc(c.say)}”` : esc(c.head || c.title);
  const img = c.src ? `<img src="${c.src}" alt="" />` : '';
  return `${img}<div class="veil"></div><div class="htxt"><div class="lbl eyebrow rise" style="--d:60">${esc(c.label)} &nbsp;·&nbsp; ${esc(kicker)}</div><h2 class="rise" style="--d:110">${head}</h2></div>`;
}
function bodyHTML(c, i) {
  const parts = [`<p class="lede rise" style="--d:170">${esc(c.body)}</p>`];
  let d = 220;
  if (c.kind === 'work') parts.push(`<div class="facts rise" style="--d:${d += 50}"><div class="lbl">Result<b>${esc(c.metric)}</b></div><div class="lbl">Engagement<b>${esc(c.meta)}</b></div></div>`);
  if (c.kind === 'quote') parts.push(`<blockquote class="rise" style="--d:${d += 50}">“${esc(c.say)}”</blockquote><p class="lbl rise" style="--d:${d += 40};color:var(--gray-500)">${esc(c.who)}</p>`);
  if (c.pts) parts.push(`<ul class="rise" style="--d:${d += 50}">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`);
  (c.story || []).forEach(s => parts.push(`<section class="rise" style="--d:${d += 50}"><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></section>`));
  if (c.kind === 'cta') parts.push(`<div class="rise" style="--d:${d += 50}">${quizHTML()}</div>`);
  const n = (i + 1) % CARDS.length;
  parts.push(`<button id="nextcard" class="lbl rise" style="--d:${d += 60}">Next &nbsp;·&nbsp; ${esc(CARDS[n].title)} →</button>`);
  return parts.join('');
}
function openCard(i, instant) {
  const c = CARDS[i];
  openI = i;
  hero.innerHTML = heroHTML(c);
  pagebody.innerHTML = bodyHTML(c, i);
  if (c.kind === 'cta') wireQuiz();
  document.getElementById('nextcard').addEventListener('click', () => {
    const n = (i + 1) % CARDS.length;
    travelTo(n);
    ov.scrollTop = 0;
    hero.style.transition = 'opacity .16s';
    hero.style.opacity = '0';
    pagebody.style.transition = 'opacity .16s';
    pagebody.style.opacity = '0';
    setTimeout(() => {
      hero.style.transition = pagebody.style.transition = '';
      hero.style.opacity = pagebody.style.opacity = '';
      ov.removeAttribute('data-on');
      requestAnimationFrame(() => openCard(n, true));
    }, 170);
  });
  ov.scrollTop = 0;
  ov.removeAttribute('aria-hidden');
  if (instant) {
    ov.setAttribute('data-on', '');
    return;
  }
  // FLIP the hero out of the clicked card
  const from = els[i].getBoundingClientRect();
  ov.setAttribute('data-on', '');
  const to = hero.getBoundingClientRect();
  const sx = from.width / to.width,
    sy = from.height / to.height;
  hero.style.transition = 'none';
  hero.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${sx},${sy})`;
  animating = true;
  requestAnimationFrame(() => {
    hero.style.transition = `transform .5s ${EASE}`;
    hero.style.transform = 'none';
    setTimeout(() => {
      animating = false;
      hero.style.transition = '';
    }, 520);
  });
}
function quizHTML() {
  return QUIZ.map((q, qi) => `<div style="margin-top:26px"><div class="lbl" style="color:var(--gray-500)">${esc(q.q)}</div><div class="pick" data-q="${qi}">${q.opts.map((o, oi) => `<button data-o="${oi}">${esc(o)}</button>`).join('')}</div></div>`).join('') + `<div style="margin-top:32px;padding-top:22px;border-top:1px solid rgba(12,12,12,.14)"><p class="lbl" style="color:var(--gray-500)">Then</p><p style="margin-top:8px;font-size:16px;line-height:1.7">hello@aheadofmarket.com — we reply the same day.</p></div>`;
}
function wireQuiz() {
  pagebody.querySelectorAll('.pick').forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    [...row.children].forEach(k => k.removeAttribute('data-on'));
    b.setAttribute('data-on', '');
  }));
}
function closeOv() {
  if (!ov.hasAttribute('data-on') || animating) return;
  const i = openI;
  const to = els[i] ? els[i].getBoundingClientRect() : null;
  const from = hero.getBoundingClientRect();
  ov.removeAttribute('data-on');
  ov.setAttribute('aria-hidden', 'true');
  if (to && ov.scrollTop < 40) {
    const sx = to.width / from.width,
      sy = to.height / from.height;
    hero.style.transition = `transform .38s ${EASE}`;
    hero.style.transform = `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${sx},${sy})`;
    setTimeout(() => {
      hero.style.transition = 'none';
      hero.style.transform = 'none';
    }, 400);
  }
}
ov.addEventListener('click', e => {
  if (e.target === ov || e.target.id === 'ovclose') closeOv();
});
measure();
x = P[0];
let resizePending = false;
addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    measure();
    render();
  });
});
setActive(0);
requestAnimationFrame(frame);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/archive/loop-v3.js", error: String((e && e.message) || e) }); }

// ui_kits/website/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever a design needs an image.
 * You control the slot's shape; it sizes to its container by default. When the search_stock_photos tool
 * is available, prefill the slot by default — write the photo's URL into
 * src (with credit/credit-href); the user can still fill or replace it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The sidecar is a SIBLING of the HTML file that uses this component: the
 * read is a document-relative fetch, and the host resolves the bridge's
 * sidecar writes into the previewed file's directory to match (same
 * contract as design_canvas.jsx). Pages in the same directory share one
 * sidecar; keep slot ids distinct across them.
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          Initial framing baseline: cover | contain.   (default 'cover')
 *                cover starts the image filling the frame (overflow cropped);
 *                contain starts it fully visible (letterboxed). Either way the
 *                user can always pan/scale from there — double-click, or the
 *                Edit control, enters reframe mode (drag to move, scroll or
 *                corner-handles to scale; Escape / click-out commits). The
 *                crop persists alongside the image in the sidecar.
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. Prefill it with a real
 *                photo via search_stock_photos when that tool is available
 *                (set credit/credit-href from the result). A user drop
 *                overrides it; clearing the drop reveals src again.
 *   credit       Attribution text shown as a small overlay at the
 *                bottom-left of the filled slot. REQUIRED whenever src
 *                points at any Unsplash host (images.unsplash.com,
 *                plus.unsplash.com, …): an Unsplash src with no credit
 *                renders an error tile INSTEAD of the photo (Unsplash
 *                terms forbid showing their photos unattributed). Use the
 *                exact form 'Photo by {photographer name} on Unsplash' —
 *                the overlay then links the name to credit-href and
 *                'Unsplash' to the Unsplash homepage, and links back to
 *                unsplash.com automatically get the required utm referral
 *                params appended at render time. The credit belongs to
 *                the src image, so it only shows while src is what's
 *                displayed — a user-dropped image hides it.
 *   credit-href  Link for the photographer's name in the credit overlay
 *                (their Unsplash profile URL from the stock-photo search
 *                results). http(s) URLs only — anything else renders the
 *                name as plain text.
 *
 * Sizing: the slot fills its container by default (width/height 100%).
 * Put it in a sized wrapper — absolutely positioned, a grid cell, a fixed
 * frame — and it takes exactly that box. When the parent's height is
 * indefinite (ordinary flow), it falls back to full width at a 3:2 aspect
 * ratio instead of collapsing. In a shrink-to-fit parent (a float,
 * width:max-content, an unsized absolute wrapper), percentages have
 * nothing to resolve against — size the slot or its wrapper explicitly
 * there. For a fixed-size slot, set
 * width/height on the element itself (inline style), which overrides the
 * default. When
 * layering content above a slot (full-bleed layouts), make the overlay
 * click-through — pointer-events: none on scrims/text plates, re-enabled
 * on interactive children — so the slot's hover controls stay reachable.
 * Keep the slot's bottom-left corner visually clear as well: the credit
 * overlay renders there, and a dark fade or text plate covering it hides
 * the attribution Unsplash's terms require — end the fade above that
 * corner, or keep it nearly transparent where the credit sits.
 *
 * Usage:
 *   <div style="position:relative;width:100%;height:100%">      <!-- full-bleed: -->
 *     <image-slot id="bg" shape="rect"></image-slot>            <!-- fills the wrapper -->
 *   </div>
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';

  // Unsplash terms require visible attribution wherever their photos
  // display, and every link back to unsplash.com must carry utm referral
  // params. Two render-time rules enforce that here:
  //  - an Unsplash-src slot with NO credit attribute renders an error
  //    tile INSTEAD of the photo (an uncredited Unsplash photo on screen
  //    is itself the terms violation, so it never renders bare);
  //  - rendered credit links pointing at unsplash.com get the referral
  //    params appended when absent (credit-href values live in page
  //    content that can't be edited after the fact).
  // Keep the utm_source value in sync with UTM_SOURCE in
  // platform/web-agent/unsplash.ts — this file is a project-local
  // artifact and cannot import it (equality is pinned by tests).
  const UNSPLASH_HOMEPAGE_HREF = 'https://unsplash.com/?utm_source=claude_design&utm_medium=referral';
  // Host rule mirrors the hotlink validator that admits Unsplash srcs into
  // pages in the first place (cdn$ in unsplash.ts: apex or any subdomain)
  // — Unsplash+ results serve from plus.unsplash.com, not just images.*,
  // and an admitted-but-uncredited photo must error whatever unsplash
  // host it rides on.
  // Trailing-dot FQDNs (images.unsplash.com.) are the same host to the
  // browser but would miss the regex — strip one dot so the check fails
  // CLOSED (unrecognized-but-real Unsplash srcs must error, not render).
  const isUnsplashHost = u => {
    try {
      return /(^|\.)unsplash\.com$/.test(new URL(u, document.baseURI).hostname.replace(/\.$/, ''));
    } catch {
      return false;
    }
  };
  // Render-time referral normalization for links back to Unsplash:
  // appends utm_source/utm_medium when absent, preserves every existing
  // query param, never overwrites an existing utm_source, and passes
  // non-Unsplash URLs through untouched. Input is an ABSOLUTE validated
  // http(s) URL (the credit render funnel resolves + validates first).
  const withReferral = href => {
    try {
      const u = new URL(href);
      if (!/(^|\.)unsplash\.com$/.test(u.hostname.replace(/\.$/, ''))) {
        return href;
      }
      if (!u.searchParams.has('utm_source')) {
        u.searchParams.set('utm_source', 'claude_design');
      }
      if (!u.searchParams.has('utm_medium')) {
        u.searchParams.set('utm_medium', 'referral');
      }
      return u.toString();
    } catch (e) {
      return href;
    }
  };
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  // Unload-time flush: save()'s serialization defers a mid-RTT re-fire to a
  // .then that never runs in an unloading document, silently dropping a
  // pagehide commit. Post the current slots immediately instead — content
  // is a superset snapshot of any in-flight save's, the write is a
  // whole-file last-writer-wins replace, and postMessage FIFO delivers it
  // to the host after the in-flight one, so a backend-side reorder at
  // worst reproduces the dropped-commit outcome this flush improves on.
  // Guarded on the initial sidecar read: pre-hydration slots can miss
  // other slots' persisted entries, and flushing it would clobber them —
  // that narrow case stays best-effort (the in-memory merge in load()
  // cannot happen in an unloading document anyway).
  function flushNow() {
    if (!loaded) return;
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    try {
      Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {});
    } catch (e) {}
  }
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet =
  // Fill the container by default: slots are usually placed inside a
  // sized wrapper (a hero frame, a grid cell, an inset:0 layer) and are
  // expected to take that box — a fixed intrinsic size would render as
  // a small tile in the corner of a full-bleed wrapper instead.
  // aspect-ratio is the companion fallback that keeps a bare slot
  // visible when the parent's height is indefinite: height:100%
  // resolves to auto there, and the ratio then derives height from
  // width instead of letting the slot collapse to zero height.
  // Explicit width/height on the element override all of this.
  // color:inherit (not a fixed near-black): the placeholder chrome —
  // empty-state icon/caption (currentColor) and the dashed ring — must
  // read on dark decks too, and the slide's own text color is the one
  // color guaranteed to contrast with the slide background. The soft
  // look comes from opacity on those parts, not from a baked-in alpha.
  ':host{display:block;position:relative;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;' + '  width:100%;height:100%;aspect-ratio:3/2}' + '.empty .cap,.empty .sub{opacity:.75}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(127,127,127,.08)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  // popover=manual promotes the spill to the top layer on reframe, so it is
  // not clipped by any overflow:hidden / clip-path / scroll-container
  // ancestor (a plain z-index can't escape overflow clipping). UA popover
  // defaults (inset:0;margin:auto) are reset; _applyView sets viewport px.
  '.spill{position:fixed;margin:0;inset:auto;border:0;padding:0;background:transparent;' + '  overflow:visible;transform:translate(-50%,-50%);z-index:1;cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px}' + '.empty:hover .sub{opacity:1}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed currentColor;' + '  opacity:.35;transition:border-color .12s,opacity .12s}' + ':host([data-over]) .ring{border-color:#c96442;opacity:1}' + ':host([data-filled]) .ring{display:none}' +
  // Controls overlay INSIDE the frame, pinned to the top-right corner, so
  // a full-bleed slot in an overflow:hidden container still shows them
  // (the old below-mask placement got clipped). Credit sits bottom-left,
  // so top-right avoids collision. The blurred pill background keeps them
  // legible over the image.
  // The UA [popover] base rule styles the element in EVERY state (only
  // display:none is gated on :not(:popover-open), and the display:flex
  // below overrides that) — so the UA resets live HERE, like .spill's,
  // or the ordinary hover-state strip renders as a bordered Canvas box
  // centered by margin:auto. inset:auto precedes top/right (shorthand).
  '.ctl{position:absolute;inset:auto;top:8px;right:8px;margin:0;border:0;padding:0;' + '  background:transparent;overflow:visible;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' +
  // While reframing, the spill owns the top layer and would swallow every
  // click on the in-frame controls. Promoting .ctl into the top layer
  // ABOVE the spill (shown after it — later popovers stack higher) keeps
  // Edit-as-toggle and Replace clickable mid-reframe. _applyView pins it
  // to the frame's top-right in viewport px (translateX(-100%)
  // right-aligns against the computed left edge); inset:auto clears the
  // base rule's top/right so the inline left/top position it alone.
  '.ctl:popover-open{position:fixed;inset:auto;transform:translateX(-100%)}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}' +
  // Replacement in flight: after a src swap the browser keeps painting
  // the PREVIOUS image until the new one decodes, so a Replace would
  // flash the old photo and then pop. Hide the stale frame (visibility,
  // not display — _applyView geometry still applies) and spin until the
  // new image reports in (load/error clears data-swapping).
  ':host([data-swapping]) .frame img{visibility:hidden}' + '.loading{position:absolute;inset:0;display:none;align-items:center;' + '  justify-content:center;pointer-events:none}' + ':host([data-swapping]) .loading{display:flex}' + '.loading::after{content:"";width:22px;height:22px;border-radius:50%;' + '  border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;' + '  animation:om-slot-spin .7s linear infinite}' + '@keyframes om-slot-spin{to{transform:rotate(360deg)}}' +
  // Reduced motion: the static two-tone ring still reads as "working".
  '@media (prefers-reduced-motion:reduce){.loading::after{animation:none}}' + '.credit{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);display:none;' + '  padding:3px 7px;border-radius:5px;background:rgba(0,0,0,.55);color:#fff;' + '  font:10px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;' + '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}' +
  // The credit is a SPAN holding one or two <a>s (Unsplash's prescribed
  // form links the photographer AND Unsplash) — anchors style inline so
  // the overlay reads as one line of text.
  '.credit a{color:inherit;text-decoration:none}' + '.credit a:hover,.credit a:focus-visible{text-decoration:underline}' + ':host([data-filled][data-credit]) .credit{display:block}' +
  // Exports must ship JUST the image — no hover controls, no credit chip
  // (the host marks <html data-om-exporting> for the capture window; the
  // page-level hide script can't reach shadow DOM, this rule can).
  ':host-context([data-om-exporting]) .ctl,' + ':host-context([data-om-exporting]) .credit{display:none !important}' +
  // Print must ship just the image too: the hover-gated controls can be
  // mid-hover when print() fires, and the credit chip is screen chrome —
  // the same rule the capture window gets, keyed on print media instead
  // of the host's data-om-exporting mark (the print path sets no mark).
  '@media print{.ctl,.credit{display:none !important}}' +
  // No export-window mask rules here on purpose: the export capture
  // releases the replacement mask by REMOVING data-swapping (the
  // shadow-root pass in pages/export/shared.ts HIDE_EXPORT_CHROME_SCRIPT)
  // — attribute removal works in every engine (:host-context is
  // Chromium-only), is scoped by construction to slots actually
  // mid-swap, and hides the spinner through the same gate. A masked img
  // would otherwise be silently dropped from PPTX decks (the capture
  // walk skips visibility:hidden imgs).
  // Attribution error tile: REPLACES the photo when an Unsplash src has
  // no credit attribute — rendering the photo uncredited is the terms
  // violation, so the photo must not appear at all.
  // Calm and neutral on purpose (review feedback): the tile informs the
  // user; the fix instructions are machine-facing (usage docblock, tool
  // description, and the turn-end scan's bounce copy name the attributes
  // for the agent).
  '.attr-error{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  background:#f2f1ef;color:#6e6c66;user-select:none;' + '  font:13px/1.45 system-ui,-apple-system,sans-serif}' + '.attr-error svg{opacity:.55}' + '.attr-error .cap{max-width:92%;font-weight:500;letter-spacing:.01em}' + ':host([data-attribution-error]) .attr-error{display:flex}' + ':host([data-attribution-error]) .ring{display:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  const warnIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>' + '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'placeholder', 'src', 'id', 'credit', 'credit-href'];
    }

    /** Duplicate-slide hook (called by deck-stage, see its
     *  _remintDuplicateIds): copy this id's stored image, if any, under a
     *  freshly minted key and return that key — so a duplicated slide's
     *  slot keeps its dropped photo instead of reverting to the
     *  placeholder. 'isFree' is the caller's uniqueness check (document
     *  ids); candidates must ALSO be unused in the sidecar, which can
     *  hold keys from other pages sharing the project root. (An EMPTY
     *  slot on another page leaves no sidecar entry, so its id is not
     *  detectable here — a minted key can collide with it and that slot
     *  would show this photo. Same blast radius as two pages reusing an
     *  id by hand, which the shared sidecar already permits.) Returns null
     *  when no id could be minted (caller strips the id, today's
     *  behavior). */
    static cloneSlot(fromId, isFree) {
      if (typeof fromId !== 'string' || !fromId) return null;
      // Pre-hydration the store can't veto candidates or source the copy
      // — degrade to the strip (today's behavior) rather than mint
      // against keys we can't see yet. Any rendered (= droppable) slot
      // means load() has already settled.
      if (!loaded) return null;
      const stem = fromId.replace(/-\d+$/, '') || fromId;
      for (let n = 2; n < 100; n++) {
        const toId = stem + '-' + n;
        if (toId === fromId) continue;
        if (slots[toId] !== undefined) {
          // Reuse a key holding this exact value (bytes AND crop) if no
          // live element here owns it — a duplicate op the host refused
          // after minting leaves such a key behind, and reusing keeps
          // refused retries from accumulating one orphaned copy per
          // attempt. Full equality (not just bytes) so a byte-identical
          // key another PAGE owns with its own crop is stepped past, not
          // adopted or rewritten. (Entries without .u never match.)
          const prev = getSlot(toId);
          const cur = getSlot(fromId);
          if (!(prev && cur && prev.u && prev.u === cur.u && prev.s === cur.s && prev.x === cur.x && prev.y === cur.y && (typeof isFree !== 'function' || isFree(toId)))) continue;
          return toId;
        }
        if (typeof isFree === 'function' && !isFree(toId)) continue;
        const v = getSlot(fromId);
        if (v) setSlot(toId, Object.assign({}, v));
        return toId;
      }
      return null;
    }
    constructor() {
      super();
      // clonable: rail thumbnails deep-clone slides and carry this shadow
      // along; reuse an already-cloned root so upgrade-after-clone works.
      // (Deliberately NOT serializable — a getHTML consumer would embed
      // multi-MB sidecar data-URLs into serialized page HTML.)
      const root = this.shadowRoot || this.attachShadow({
        mode: 'open',
        clonable: true
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="attr-error" part="attribution-error">' + warnIcon + '    <div class="cap">This photo needs attribution</div></div>' + '  <div class="loading" part="loading"></div>' + '  <div class="ring" part="ring"></div>' + '</div>' +
      // Outside .frame, like .spill/.ctl — the frame's overflow:hidden +
      // border-radius/clip-path would cut the credit off on circle/pill/mask.
      // A SPAN, not an <a>: the prescribed Unsplash credit holds two links
      // (photographer + Unsplash), built per-render in _render().
      '<span class="credit" part="credit"></span>' + '<div class="spill" popover="manual" data-dc-edit-transparent>' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' +
      // data-dc-edit-transparent: the DC editor's edit-mode picker lets
      // clicks through for chrome marked with it (EDIT_TRANSPARENT_SEL)
      // — without it, Replace/Edit clicks in Edit mode are swallowed by
      // element selection and the controls look dead.
      '<div class="ctl" popover="manual" data-dc-edit-transparent><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="edit" title="Reframe image">Edit</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ctl = root.querySelector('.ctl');
      this._credit = root.querySelector('.credit');
      this._attrError = root.querySelector('.attr-error');
      // Credit clicks open the link, not browse/reframe.
      this._credit.addEventListener('click', e => e.stopPropagation());
      this._credit.addEventListener('dblclick', e => e.stopPropagation());
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      // Encode-in-flight marker (the owning _ingest generation): while set,
      // the same-src "nothing in flight" clear in _render must not fire —
      // the stored value still points at the OLD image until the encode
      // lands, so that clear would unmask the stale image mid-replace.
      this._swapGen = 0;
      // Render-owned swap in flight: set when _render assigns a new src,
      // cleared only by the img's own load/error (or the empty branch).
      // img.complete CANNOT stand in for this — setting src only QUEUES
      // the current-request swap (a microtask), so synchronously after an
      // assignment, complete still reports the OLD settled request. The
      // pick path does exactly that: the host sets src, credit, and
      // credit-href back-to-back in one task, and renders #2/#3 would
      // read the stale complete === true and drop the mask one render
      // after it was set.
      this._loadPending = false;
      // See _render's empty branch: a transient attribution-error wipe of a
      // showing image must make the follow-up render a replacement (spinner),
      // not a first fill (blank frame).
      this._hidShowing = false;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        // The hidden controls are opacity-0 but still tabbable — without
        // this gate a keyboard user could drive them on a read-only share
        // link (mirrors the dblclick handler's editable gate).
        if (!this.hasAttribute('data-editable')) return;
        if (act === 'replace') {
          this._exitReframe(true);
          // Host-owned picker (Unsplash modal; it also offers local import).
          this.dispatchEvent(new CustomEvent('image-slot:pick', {
            bubbles: true,
            composed: true,
            detail: {
              id: this.id || null
            }
          }));
        }
        if (act === 'edit') {
          if (!this._reframes()) return;
          if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      // load/error also release the replacement-in-flight mask (via the
      // single discipline in _releaseMask): the swap is only revealed once
      // the new image can actually paint (on error the frame shows its
      // background, same as a fresh slot with a broken src).
      this._img.addEventListener('load', () => {
        this._loadPending = false;
        this._releaseMask(true);
        this._applyView();
      });
      this._img.addEventListener('error', () => {
        this._loadPending = false;
        this._releaseMask(true);
      });
      // Gated only on editable — any filled slot can be repositioned/scaled,
      // regardless of fit. Share links (no writeFile) stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
          const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // The host may inject window.omelette.writeFile AFTER the first render;
      // re-render on hover so the editable-gated controls reliably appear.
      this.addEventListener('pointerenter', this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('pointerenter', this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      // commit=false: a disconnect is not a user intent — committing here
      // would persist whatever half-finished drag a React remount or DOM
      // splice happened to interrupt. Deliberate exits commit on their own
      // paths (Escape/click-out/toggle), and unloads commit via pagehide.
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._signalReframe(true);
      // Best-effort commit when the document unloads mid-reframe (a host
      // navigation racing the enter signal, a manual reload, tab close):
      // the sidecar write rides the host bridge, which outlives this
      // document, so the crop survives even though the mode dies with the
      // DOM. Held on the instance so _exitReframe detaches exactly what
      // was attached.
      this._pagehide = () => {
        this._exitReframe(true);
        flushNow();
      };
      window.addEventListener('pagehide', this._pagehide);
      // Promote spill to the top layer, then keep it pinned over the frame:
      // scroll/resize cover the common cases, and a per-frame rect check
      // catches layout shifts that fire neither (an image above finishing
      // load, streamed DOM pushing the slot down, an ancestor transform
      // change) so the overlay can't detach from the frame.
      try {
        this._spill.showPopover();
      } catch {}
      // After the spill, so the controls stack above it in the top layer.
      try {
        this._ctl.showPopover();
      } catch {}
      this._reposition = () => {
        if (this.hasAttribute('data-reframe')) this._applyView();
      };
      window.addEventListener('scroll', this._reposition, true);
      window.addEventListener('resize', this._reposition);
      this._lastRect = '';
      this._watch = () => {
        if (!this.hasAttribute('data-reframe')) return;
        const r = this.getBoundingClientRect();
        const key = r.left + ',' + r.top + ',' + r.width + ',' + r.height;
        if (key !== this._lastRect) {
          this._lastRect = key;
          this._applyView();
        }
        this._watchId = requestAnimationFrame(this._watch);
      };
      this._watchId = requestAnimationFrame(this._watch);
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (this._reposition) {
        window.removeEventListener('scroll', this._reposition, true);
        window.removeEventListener('resize', this._reposition);
        this._reposition = null;
      }
      if (this._watchId) {
        cancelAnimationFrame(this._watchId);
        this._watchId = 0;
      }
      if (this._pagehide) {
        window.removeEventListener('pagehide', this._pagehide);
        this._pagehide = null;
      }
      try {
        this._spill.hidePopover();
      } catch {}
      try {
        this._ctl.hidePopover();
      } catch {}
      this._ctl.style.left = '';
      this._ctl.style.top = '';
      if (commit) this._commitView();
      this._signalReframe(false);
    }

    // Reframe state lives only in this DOM until commit, invisible to the
    // host's dirty signals — announce enter/exit so the host can hold
    // auto-reloads for exactly the gesture (the guest bundle forwards
    // image-slot:reframe to the host as imageSlotReframe). Dispatched on
    // the element (composed, so it escapes shadow roots) while connected;
    // a disconnected exit (disconnectedCallback) falls back to document so
    // the host still hears it.
    _signalReframe(active) {
      const target = this.isConnected ? this : document;
      target.dispatchEvent(new CustomEvent('image-slot:reframe', {
        bubbles: true,
        composed: true,
        detail: {
          active: active,
          id: this.id || null
        }
      }));
    }

    // Public: host's "Import from computer" calls this to run local browse.
    openFilePicker() {
      this._exitReframe(true);
      this._input.click();
    }

    // A src write is a newer intent for this slot's content — the host
    // pick path (setImageSlotImage) or an agent edit — so it must win
    // over any encode still in flight from an earlier drop: left live,
    // that encode lands later, passes _ingest's gen guard, and its
    // setSlot silently overwrites the pick (the stored value shadows
    // src in _render). Bumping _gen kills the encode before its own
    // _swapGen clear runs, so clear the dead claim here too — otherwise
    // _releaseMask (gated on !_swapGen) never fires and the pick's
    // spinner is stranded. src ONLY: the pick sets credit/credit-href
    // in the same task, and clearing _swapGen on those would let the
    // same-src branch unmask the old image mid-encode.
    attributeChangedCallback(name, oldVal, newVal) {
      if (name === 'src' && oldVal !== newVal) {
        this._gen++;
        this._swapGen = 0;
      }
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      // Replacing a shown image: surface the swap through the encode too,
      // not just the decode — otherwise the old photo sits there with no
      // feedback while the canvas re-encode runs. An empty slot keeps its
      // placeholder (no spinner) until the encode lands, as before.
      // _swapGen guards the mask against re-renders DURING the encode
      // (pointerenter, ResizeObserver, another slot's store write): the
      // stored value still resolves to the old image there, so _render's
      // same-src clear would otherwise unmask it mid-replace.
      if (this.hasAttribute('data-filled')) {
        this.setAttribute('data-swapping', '');
        this._swapGen = gen;
      }
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        // Clear BEFORE setSlot: its synchronous re-render must see no
        // pending encode, so a byte-identical re-upload (same data URL, no
        // load event coming) still clears the mask via the complete branch.
        this._swapGen = 0;
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._swapGen = 0;
        // Reveal the kept old image — unless another replacement (a
        // remote pick's src swap) is still in flight, in which case the
        // mask stays until THAT image settles (its load/error releases).
        this._releaseMask();
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is available on any filled slot — the user can
    // always reposition/scale. `fit` only sets the initial baseline (see
    // _geom): contain starts fully-visible, cover starts frame-filling.
    _reframes() {
      return this.hasAttribute('data-filled');
    }

    // The single release discipline for the replacement-in-flight mask
    // (data-swapping). The mask comes off only when BOTH hold:
    //  - no encode is pending (_swapGen) — mid-encode the stored value
    //    still resolves to the old image, so any reveal paints it;
    //  - the frame img has settled on its current src — an unsettled src
    //    means some replacement is still in flight (e.g. a remote pick),
    //    whoever started it, and revealing would paint the previous
    //    frame. The load/error listeners pass settled=true (the event IS
    //    the settlement signal, per spec complete is true by then);
    //    other callers rely on the complete flag (covers loaded AND
    //    failed).
    // Every release path funnels through here EXCEPT _render's empty
    // branch (the img is being cleared — nothing will ever settle).
    _releaseMask(settled) {
      if (!this._swapGen && !this._loadPending && (settled || this._img.complete)) {
        this.removeAttribute('data-swapping');
      }
    }

    // Baseline geometry, shared by clamp/apply/resize. `base` is the scale at
    // view-scale s=1: cover = fill the frame (overflow on the looser axis),
    // contain = fit fully inside (letterboxed). Zooming a contain image past
    // s where it overflows naturally becomes a crop. Null until the img has
    // loaded (naturalWidth is 0 before that) or when the slot has no layout
    // box — ResizeObserver fires with a 0×0 rect under display:none, and
    // clamping against a degenerate 1×1 frame would silently pull the stored
    // pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
      const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
      return {
        iw,
        ih,
        fw,
        fh,
        base
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      // Top-layer controls: pin to the frame's top-right in viewport px
      // (the same 8px inset as the in-frame layout; unscaled — top-layer UI
      // reads as chrome, not page content). BEFORE the geometry branch:
      // placement needs only the frame rect, and a not-yet-loaded or broken
      // src must not leave the promoted strip floating unpositioned. Gated
      // on the popover actually being open: without the Popover API,
      // showPopover() threw (swallowed in _enterReframe), .ctl stays in
      // its in-frame absolute layout, and viewport-px coordinates would
      // shove it off-frame — and matches(':popover-open') itself throws
      // there (unknown pseudo-class), hence the try/catch.
      if (this.hasAttribute('data-reframe')) {
        let onTop = false;
        try {
          onTop = this._ctl.matches(':popover-open');
        } catch {}
        if (onTop) {
          const r = this.getBoundingClientRect();
          this._ctl.style.left = r.right - 8 + 'px';
          this._ctl.style.top = r.top + 8 + 'px';
        }
      }
      if (!g) {
        // Dimensions not known yet (before img load) — centered fit so there
        // is no flash of an unpositioned image before the geometry lands.
        const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = contain ? 'contain' : 'cover';
        return;
      }
      // Baseline (cover-fill or contain-fit) × view scale. Width/height and
      // left/top are all frame-% — depends only on the frame aspect ratio, so
      // a responsive resize keeps the same crop. The spill layer mirrors the
      // same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      if (this.hasAttribute('data-reframe')) {
        // Top-layer spill: position in viewport px over the frame. The top
        // layer escapes ancestor transforms entirely, so EVERY term must be
        // in viewport units: getBoundingClientRect gives the frame's scaled
        // origin AND size, and the rect/layout ratio rescales the ghost —
        // sizing from layout px alone renders it 1/scale too large under a
        // scaled deck slide. Inner ghost + handles stay box-relative.
        const r = this.getBoundingClientRect();
        const sx = g.fw ? r.width / g.fw : 1;
        const sy = g.fh ? r.height / g.fh : 1;
        this._spill.style.width = g.iw * k * sx + 'px';
        this._spill.style.height = g.ih * k * sy + 'px';
        this._spill.style.left = r.left + (50 + this._view.x) / 100 * r.width + 'px';
        this._spill.style.top = r.top + (50 + this._view.y) / 100 * r.height + 'px';
      }
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      // An Unsplash src with no credit attribute must NOT render — showing
      // the photo uncredited is the Unsplash-terms violation itself. The
      // error tile replaces the photo until the credit is written. A
      // user-dropped image is the user's own content and always renders.
      // Trimmed: credit is agent/user-editable content, and a whitespace-
      // only value must count as missing — otherwise it would suppress the
      // error tile AND render an empty credit box (no text, no links),
      // exactly the unattributed state this gate exists to prevent.
      const credit = (this.getAttribute('credit') || '').trim();
      const attrError = !!(!credit && !this._userUrl && srcAttr && isUnsplashHost(srcAttr));
      this.toggleAttribute('data-attribution-error', attrError);
      if (url && !attrError) {
        const prev = this._img.getAttribute('src');
        if (prev !== url) {
          // Replacing an already-shown image: mark the swap BEFORE setting
          // src so the stale frame is never revealed (see the data-swapping
          // stylesheet rules). First fill (prev empty) keeps the existing
          // placeholder-until-load behavior — no spinner. _hidShowing
          // covers the pick path's transient attribution-error wipe: prev
          // is gone, but an image WAS showing, so this is a replacement.
          if (prev || this._hidShowing) this.setAttribute('data-swapping', '');
          // Mark the swap BEFORE assigning src: complete keeps reporting
          // the old settled request until the browser's
          // update-the-image-data microtask runs, so same-task re-renders
          // (the pick path's credit/credit-href setAttributes) need this
          // flag, not complete, to know a load is in flight.
          this._loadPending = true;
          this._img.src = url;
          this._ghost.src = url;
        } else {
          // Same-src re-render — release if settled, so an ingest-set
          // spinner can't stick after a byte-identical re-upload (same
          // data URL, no further load event ever fires).
          this._releaseMask();
        }
        this._hidShowing = false;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this.removeAttribute('data-swapping');
        // The src is being removed — no load/error will ever fire for it.
        this._loadPending = false;
        // A transient attribution-error wipe of a showing image happens on
        // the pick path: the host sets src one setAttribute before credit,
        // so render N hides the old image (attrError) and render N+1
        // restores a URL. Remember the wipe so that restore renders as a
        // replacement (spinner), not a first fill (blank frame).
        this._hidShowing = attrError && !!this._img.getAttribute('src');
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        // The error tile owns the blocked-photo state; .empty stays for
        // the genuinely-empty slot.
        this._empty.style.display = attrError ? 'none' : 'flex';
        this.removeAttribute('data-filled');
      }

      // Credit belongs to the author src, so a user drop hides it.
      // textContent + the http(s)-only funnel keep external strings inert.
      const showCredit = !!(url && credit && !this._userUrl && !attrError);
      this._credit.textContent = '';
      if (showCredit) {
        // Validate once (resolved against the document, http(s) only),
        // then append the terms-required utm referral params to links
        // that point back at unsplash.com.
        let href = '';
        const rawHref = this.getAttribute('credit-href') || '';
        if (rawHref) {
          try {
            const u = new URL(rawHref, document.baseURI);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              href = withReferral(u.href);
            }
          } catch {}
        }
        const mkLink = (text, linkHref) => {
          const a = document.createElement('a');
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.setAttribute('href', linkHref);
          a.textContent = text;
          return a;
        };
        // Unsplash's prescribed credit is TWO links — the photographer's
        // name to their profile (credit-href) and 'Unsplash' to the
        // homepage. Render that split whenever the text has the canonical
        // shape; other text keeps the legacy single-link rendering.
        const m = /^Photo by (.+) on Unsplash$/.exec(credit);
        if (m) {
          this._credit.appendChild(document.createTextNode('Photo by '));
          this._credit.appendChild(href ? mkLink(m[1], href) : document.createTextNode(m[1]));
          this._credit.appendChild(document.createTextNode(' on '));
          this._credit.appendChild(mkLink('Unsplash', UNSPLASH_HOMEPAGE_HREF));
        } else if (href) {
          this._credit.appendChild(mkLink(credit, href));
        } else {
          this._credit.textContent = credit;
        }
      }
      this.toggleAttribute('data-credit', showCredit);
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/website/loop-standalone.js
try { (() => {
/* Ahead of Market — endless card loop, v2.
   One viewport. Wheel, drag and idle drift all feed the same rail.
   No indices anywhere: cards are named, not numbered. */
const CARDS = [{
  kind: 'story',
  step: 1,
  label: 'Who we are',
  title: 'You already do the real work',
  amb: {
    tint: '#C9B896'
  },
  hi: '#E8DFCB',
  hion: '#12120F',
  paper: true,
  disp: 'You already do [[the real work]].',
  tags: [{
    t: 'Construction',
    s: 'tl'
  }, {
    t: 'Trades',
    s: 'tr'
  }, {
    t: 'Founders',
    s: 'br'
  }, {
    t: 'Nonprofits',
    s: 'bl'
  }],
  body: 'AOM is a creative production and systems company based in Phoenix. We work with construction companies, founders, nonprofits and brands that do real work. The work is already good. The story around it usually is not.',
  story: [{
    h: 'Who this is for',
    p: 'Construction companies, specialty trades, founders, nonprofits and brands that do real work — companies whose marketing has never caught up to what they actually build.'
  }, {
    h: 'How we are set up',
    p: 'A small Phoenix team. The people who pitch the work make the work: shooting, editing, designing and building in-house.'
  }]
}, {
  kind: 'story',
  step: 2,
  label: 'The problem',
  title: 'Nobody outside your office ever sees it',
  amb: {
    tint: '#7C8B99'
  },
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'But nobody outside of your office {{ever sees it}}.',
  tags: [{
    t: 'The gap',
    s: 'tl'
  }, {
    t: 'Best-kept secret',
    s: 'bl'
  }],
  body: 'The best proof you have is happening on site every day, and it dies there. No footage, no story, no reason for anyone new to believe you.',
  story: [{
    h: 'What it costs',
    p: 'Bids won on price instead of trust. Crews who never heard of you. A feed that looks like every competitor in the state.'
  }, {
    h: 'Why it happens',
    p: 'Nobody on your team has time to film it, and the agencies who offer to have never stood on a roof in July.'
  }]
}, {
  kind: 'story',
  step: 3,
  label: 'What we do',
  title: 'That is where we come in',
  amb: {
    tint: '#DD5420'
  },
  hi: '#DD5420',
  hion: '#FFF6EE',
  paper: true,
  disp: 'That is where [[we come in]].',
  tags: [{
    t: 'Social',
    s: 'tl'
  }, {
    t: 'Video',
    s: 'tr'
  }, {
    t: 'Websites',
    s: 'br'
  }, {
    t: 'AI systems',
    s: 'bl'
  }],
  body: 'A day or two on site with your crew. No script, no stock, no borrowed footage. Then we build everything around it: the content, the website and the systems that keep it moving.',
  story: [{
    h: 'Video',
    p: 'Brand films, founder series and job-site stories. Production through final cut, in every length each platform actually wants.'
  }, {
    h: 'Social',
    p: 'One shoot day becomes a month of native posts. We run the calendar and write the hooks.'
  }, {
    h: 'Websites',
    p: 'Marketing sites and web apps, designed and engineered by the same people who cut the film.'
  }, {
    h: 'AI systems',
    p: 'AI-powered workflows behind the content so publishing never waits on another meeting.'
  }]
}, {
  kind: 'story',
  step: 4,
  label: 'How it works',
  title: 'Your story, told and seen',
  amb: {
    tint: '#5E86A8'
  },
  hi: '#A8C0D8',
  hion: '#12120F',
  paper: true,
  disp: 'AOM makes sure your story is [[told and seen]].',
  tags: [{
    t: 'We come to you',
    s: 'tl'
  }, {
    t: 'Nine cuts, one shoot',
    s: 'tr'
  }, {
    t: 'It keeps running',
    s: 'bl'
  }],
  body: 'The hero film, the bid-room version, the recruiting cut and a month of short native posts — all out of the same two days.',
  story: [{
    h: 'We come to you',
    p: 'One or two days on site. We work around the crew, not the other way around.'
  }, {
    h: 'We cut it many ways',
    p: 'Nine versions, three lengths, every platform native. Nothing exported sideways.'
  }, {
    h: 'We keep it running',
    p: 'Content ships on a calendar you can see, month after month.'
  }]
}, {
  kind: 'ask',
  step: 5,
  label: 'How we help',
  title: 'How can we help you?',
  amb: {
    tint: '#D6DE3C'
  },
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'How can we [[help you]]?',
  opts: [{
    t: 'We need web creativity',
    p: 'A site that looks like the work'
  }, {
    t: 'We need to get social',
    p: 'Always-on content, run for you'
  }, {
    t: 'We need a video',
    p: 'One film that does the convincing'
  }, {
    t: 'We need a marketing team',
    p: 'All of it, handled in-house'
  }],
  body: 'Pick the closest one. We reply with a plan, a price and a date — not a discovery call.',
  story: [{
    h: 'What changes',
    p: 'Leads that already trust you, bids you get invited into, and applicants who came looking for you.'
  }, {
    h: 'How we start',
    p: 'Three questions and a look at what you already have. Then a plan you can say yes or no to.'
  }]
}, {
  kind: 'work',
  label: 'Work',
  title: 'Sunland Builders — brand film',
  meta: 'Brand film · 2026',
  metric: 'The bid-winning cut',
  slot: 'loop-work-1',
  src: window.__resources.photo1,
  body: 'Two days on site, no script, no borrowed footage. The film now opens every bid presentation Sunland walks into.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'Almost a million views',
  say: 'The video you guys made us hit almost a million views organically (not kidding)',
  who: 'Founder · construction',
  body: 'One founder series, posted natively, no paid support. Organic first is not a budget constraint — it is the proof that the story works.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Video',
  tone: 'pale',
  name: 'Video',
  head: 'Films that get watched',
  pts: ['Brand films', 'Founder series', 'Job-site stories'],
  body: 'Production to final cut, in-house. Nine versions, three lengths, every platform native — nothing exported sideways.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Founder series, Vol. 1',
  meta: 'Social system · 2026',
  metric: 'Almost a million views',
  slot: 'loop-work-2',
  src: window.__resources.photo2,
  body: 'A weekly founder series built to compound: one shoot day, a month of native cuts, a feed that works while you run the company.'
}, {
  kind: 'team',
  label: 'Studio',
  title: 'Small on purpose',
  slot: 'loop-team',
  src: window.__resources.photo3,
  head: 'Small on purpose',
  who: 'Ahead of Market · Phoenix',
  body: 'The people who pitch the work make the work. No account layer, no handoff, no drift between the idea and what ships.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Desert Hope gala film',
  meta: 'Nonprofit film · 2025',
  metric: 'Giving up by two thirds',
  slot: 'loop-work-3',
  src: window.__resources.photo4,
  body: 'A three-minute film cut for a room of 400 donors, then re-cut for the eleven months between galas.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Web',
  tone: 'pale',
  name: 'Web',
  head: 'Sites that convert',
  pts: ['Marketing sites', 'Web apps', 'Design engineering'],
  body: 'Precise, editorial builds. Fast, monochrome, every pixel earning its place.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'A new league',
  say: 'Your taking us into a new league',
  who: 'Owner · specialty trades',
  body: 'Said after the first cut landed. The work is judged by what it changes — the bids you get invited to, the crews who apply.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Crew stories — recruiting',
  meta: 'Campaign · 2025',
  metric: 'Three times the applicants',
  slot: 'loop-work-4',
  src: window.__resources.photo5,
  body: 'Recruiting content shot with the crew who actually do the work. Three times the qualified applicants in one quarter.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Systems',
  tone: 'pale',
  name: 'Systems',
  head: 'Social and AI workflows',
  pts: ['Social systems', 'AI workflows', 'Always-on content'],
  body: 'Content engines with AI-powered workflows behind them, so the feed keeps moving without another meeting.'
}, {
  kind: 'post',
  label: 'Journal',
  title: 'Nobody watches your intro',
  tone: 'pale',
  head: 'Nobody watches your intro',
  meta: 'Journal · March 2026',
  body: 'The first three seconds decide everything. Logo stings, drone establishing shots and a slow fade into a mission statement are three seconds you do not have.',
  story: [{
    h: 'Start in the middle',
    p: 'Open on the loudest, most specific moment you have: the torch, the pour, the plate leaving the pass. Context can come second — attention cannot.'
  }, {
    h: 'Say one thing',
    p: 'A film that says four things says nothing. Pick the sentence you want repeated back to you and cut everything that is not it.'
  }, {
    h: 'Cut for the platform, not the pitch deck',
    p: 'The same story wants a different edit on a phone than on a projector. We deliver both rather than compromising into one.'
  }]
}, {
  kind: 'cta',
  label: 'Start',
  title: 'Work with us',
  head: 'Tell us what you need',
  body: 'Three questions. We reply with a plan, a price and a date — not a discovery call.'
}];
const QUIZ = [{
  q: 'What do you need?',
  opts: ['A video that actually lands', 'Social content that compounds', 'A website that converts', 'All of it — make us impossible to ignore']
}, {
  q: 'When does it go live?',
  opts: ['This month', 'This quarter', 'Still planning']
}, {
  q: 'Who are you?',
  opts: ['Construction / trades', 'Founder-led brand', 'Nonprofit', 'Something else']
}];
const rail = document.getElementById('rail');
const labelEl = document.getElementById('label');
const ticksEl = document.getElementById('ticks');
const hintEl = document.getElementById('hint');
const ov = document.getElementById('ov');
const hero = document.getElementById('hero');
const pagebody = document.getElementById('pagebody');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const MARK = window.__resources.mark;
function stepbar(step) {
  const n = step || 1;
  const pips = [1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' data-f' : ''} style="--n:${i}"></i>`).join('');
  return `<div class="step"><span>${String(n).padStart(2, '0')}</span><div class="pips">${pips}</div><span class="of">05</span></div>`;
}
function cardHTML(c) {
  const top = '';
  const edge = `<span class="edge"></span><span class="sheen"></span>`;
  const open = `<span class="open lbl">Open</span>`;
  const media = ph => c.src ? `<img class="shot" src="${c.src}" alt="" loading="lazy" />` : `<image-slot id="${c.slot}" shape="rect" placeholder="${ph}"></image-slot>`;
  if (c.kind === 'work') return `${media('Still')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><div class="rule"></div><div class="metric">${esc(c.metric)}</div><h3 style="margin-top:10px">${esc(c.title)}</h3><p>${esc(c.meta)}</p></div>${open}</div>`;
  if (c.kind === 'team') return `${media('Studio photo')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><h3>${esc(c.head)}</h3><p>${esc(c.who)}</p></div>${open}</div>`;
  if (c.kind === 'quote') return `<span class="quo">”</span>${edge}<div class="in">${top}<p class="say" style="margin:auto 0 0">${esc(c.say)}</p><div class="rule" style="margin-top:18px"></div><p style="margin-top:12px">${esc(c.who)}</p>${open}</div>`;
  if (c.kind === 'ask') {
    const d2 = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>');
    const opts = c.opts.map((o, n) => `<button class="opt" style="--i:${n}"><b>${esc(o.t)}</b><i>${esc(o.p)}</i></button>`).join('');
    return `${edge}${stepbar(5)}<div class="in"><p class="disp ask">${d2}</p><div class="opts">${opts}</div>${open}</div>`;
  }
  if (c.kind === 'story') {
    const disp = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>').replace(/\{\{(.+?)\}\}/g, '<span class="un">$1</span>');
    const tags = (c.tags || []).map((t, n) => `<span class="tag tag--${t.s}${n === 0 ? ' tag--fill' : ''}" style="--i:${n}">${esc(t.t)}</span>`).join('');
    return `${edge}${tags}${stepbar(c.step)}<div class="in"><p class="disp">${disp}</p>${open}</div>`;
  }
  if (c.kind === 'post') return `${edge}<div class="in">${top}<div class="foot"><div class="lbl" style="color:var(--gray-500)">${esc(c.meta)}</div><h3 class="big" style="margin-top:12px">${esc(c.head)}</h3></div>${open}</div>`;
  if (c.kind === 'explain') return `${edge}<div class="in">${top}<div class="foot"><h3 class="big">${esc(c.head)}</h3><ul class="svc num">${c.pts.map((p, n) => `<li><i>${String(n + 1).padStart(2, '0')}</i>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  if (c.kind === 'say') return `<img class="wm" src="${MARK}" alt="" />${edge}<div class="in">${top}<p class="big">${esc(c.big)}</p><p class="lbl" style="color:var(--gray-500);margin-top:18px">${esc(c.kicker || 'Read more')}</p></div>`;
  if (c.kind === 'svc') return `${edge}<span class="vert lbl">${esc(c.name)}</span><div class="in">${top}<div class="foot"><div class="wordmark">${esc(c.name)}</div><h3 style="margin-top:12px">${esc(c.head)}</h3><ul class="svc">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  return `${edge}<img class="wm" src="${MARK}" alt="" /><div class="in">${top}<h3 class="big" style="margin-top:auto">${esc(c.head)}</h3><p style="margin-top:16px">${esc(c.body)}</p><p class="lbl" style="margin-top:20px">Start here →</p></div>`;
}
CARDS.forEach(c => {
  c.span = {
    ask: 1.24,
    story: 1.18,
    say: 1.24,
    explain: 1,
    work: 1.34,
    quote: 1.12,
    svc: .84,
    team: 1,
    post: 1.06,
    cta: .9
  }[c.kind] || 1;
});
const els = CARDS.map((c, i) => {
  const d = document.createElement('div');
  d.className = 'card card--' + c.kind + (c.tone === 'pale' ? ' card--pale' : '');
  d.dataset.i = i;
  if (c.paper) d.setAttribute('data-paper', '');
  if (c.hi) {
    d.style.setProperty('--hi-bg', c.hi);
    d.style.setProperty('--hi-fg', c.hion);
  }
  d.innerHTML = cardHTML(c);
  rail.appendChild(d);
  return d;
});
CARDS.forEach((c, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', c.title);
  b.addEventListener('click', () => travelTo(i));
  ticksEl.appendChild(b);
});
const ticks = [...ticksEl.children];

/* ---- ambient backdrop ----
   Each card may define: amb: { tint:'#hex', media:'path.mp4|.jpg', dim:0..1 }
   Two layers crossfade so video keeps playing through the transition.        */
const amb = document.getElementById('amb');
const layers = [amb.querySelector('[data-a]'), amb.querySelector('[data-b]')];
let ambTurn = 0,
  ambKey = null;
function ambFor(c) {
  const a = c.amb || {};
  return {
    tint: a.tint || (c.hi && c.hi !== '#12120F' ? c.hi : '#EDEAE2'),
    media: a.media || c.src || null,
    dim: a.dim == null ? .82 : a.dim
  };
}
function setAmbience(c) {
  const a = ambFor(c);
  const key = a.tint + '|' + (a.media || '');
  if (key === ambKey) return;
  ambKey = key;
  const next = layers[ambTurn],
    prev = layers[ambTurn ^ 1];
  ambTurn ^= 1;
  const isVid = a.media && /\.(mp4|webm|mov)$/i.test(a.media);
  const media = !a.media ? '' : isVid ? `<video src="${a.media}" autoplay muted loop playsinline></video>` : `<img src="${a.media}" alt="" />`;
  const wash = a.media ? `<div class="wash" style="background:linear-gradient(180deg,rgba(245,244,240,${a.dim}) 0%,rgba(245,244,240,${Math.min(1, a.dim + .1)}) 100%),radial-gradient(circle at 50% 46%,${a.tint}22,transparent 70%)"></div>` : `<div class="wash" style="background:radial-gradient(120% 90% at 50% 42%,${a.tint}3d 0%,${a.tint}14 42%,rgba(245,244,240,0) 74%),linear-gradient(180deg,rgba(245,244,240,.5),rgba(245,244,240,.9))"></div>`;
  next.innerHTML = media + wash + '<div class="grain"></div>';
  requestAnimationFrame(() => {
    next.setAttribute('data-on', '');
    prev.removeAttribute('data-on');
  });
  setTimeout(() => {
    if (!prev.hasAttribute('data-on')) prev.innerHTML = '';
  }, 1000);
}

/* ---- geometry + motion ---- */
let step = 0,
  total = 0,
  x = 0,
  v = 0,
  drag = null,
  target = null,
  active = -1,
  touched = false;
let W = [],
  P = [];
const DRIFT = 0.38;
function measure() {
  const rh = rail.clientHeight || 480;
  const h = Math.max(250, Math.min(460, rh - 30));
  const base = Math.round(h * 0.72);
  const k = h / 428;
  const gap = window.innerWidth < 760 ? 18 : Math.round(30 * k);
  W = CARDS.map(c => Math.round(base * (window.innerWidth < 760 ? 1 : c.span)));
  els.forEach((el, i) => {
    el.style.width = W[i] + 'px';
    el.style.height = h + 'px';
    el.style.marginTop = -h / 2 + 'px';
    el.style.marginLeft = -W[i] / 2 + 'px';
  });
  rail.style.setProperty('--k', k.toFixed(3));
  let acc = 0;
  P = [];
  for (let i = 0; i < W.length; i++) {
    P.push(acc + W[i] / 2);
    acc += W[i] + gap;
  }
  total = acc;
  step = base + gap;
}
const wrap = d => {
  d = (d % total + total) % total;
  return d > total / 2 ? d - total : d;
};
function frame() {
  if (drag) {
    v = v * 0.6 + (x - drag.lastX) * 0.4;
    drag.lastX = x;
  } else if (target !== null) {
    const d = wrap(target - x);
    if (Math.abs(d) < 0.4) {
      x = target;
      target = null;
      v = DRIFT;
    } else {
      x += d * 0.085;
      v = d * 0.085;
    }
  } else {
    x += v;
    v += (DRIFT - v) * 0.033;
  }
  render();
  requestAnimationFrame(frame);
}
function render() {
  const half = window.innerWidth / 2 + step;
  let best = 1e9,
    bestI = 0;
  for (let i = 0; i < els.length; i++) {
    const dx = wrap(P[i] - x);
    const a = Math.abs(dx);
    if (a < best) {
      best = a;
      bestI = i;
    }
    if (a > half) {
      if (els[i].style.visibility !== 'hidden') els[i].style.visibility = 'hidden';
      continue;
    }
    const n = dx / step; // signed distance in cards
    // deadband: anything within a third of a card of centre reads as fully live
    const t = Math.min(1, Math.max(0, (a - step * 0.34) / (step * 2)));
    const ry = Math.max(-10, Math.min(10, -n * 4.2)); // slight turn away from centre
    const tf = `translate3d(${dx.toFixed(1)}px,${(t * 14).toFixed(1)}px,${(-t * 90).toFixed(0)}px) rotateY(${ry.toFixed(2)}deg) scale(${(1 - t * 0.07).toFixed(3)})`;
    els[i].style.visibility = 'visible';
    if (els[i].dataset.tf !== tf) {
      els[i].dataset.tf = tf;
      els[i].style.transform = tf;
      els[i].style.opacity = (1 - t * 0.7).toFixed(3);
      els[i].style.zIndex = String(100 - Math.round(a));
    }
  }
  if (bestI !== active) setActive(bestI);
}
function setActive(i) {
  if (active >= 0) els[active].removeAttribute('data-live');
  active = i;
  els[i].setAttribute('data-live', '');
  const c = CARDS[i];
  setAmbience(c);
  const span = document.createElement('span');
  span.innerHTML = `<i>${esc(c.label)} &nbsp;</i><b>${esc(c.title)}</b>`;
  span.style.opacity = '0';
  span.style.transform = 'translateY(6px)';
  [...labelEl.children].slice(0, -1).forEach(n => {
    if (n !== labelEl.lastChild) n.remove();
  });
  const old = labelEl.firstChild;
  labelEl.appendChild(span);
  requestAnimationFrame(() => {
    span.style.opacity = '1';
    span.style.transform = 'none';
    if (old) {
      old.style.opacity = '0';
      old.style.transform = 'translateY(-6px)';
      setTimeout(() => old.remove(), 320);
    }
  });
  ticks.forEach((d, k) => k === i ? d.setAttribute('data-on', '') : d.removeAttribute('data-on'));
}
function travelTo(i) {
  target = x + wrap(P[i] - x);
}
function markTouched() {
  if (!touched) {
    touched = true;
    hintEl.setAttribute('data-off', '');
  }
}

/* ---- input ---- */
addEventListener('wheel', e => {
  if (ov.hasAttribute('data-on')) return;
  e.preventDefault();
  markTouched();
  target = null;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  v = Math.max(-70, Math.min(70, v + d * 0.09));
}, {
  passive: false
});
rail.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  rail.setPointerCapture(e.pointerId);
  rail.setAttribute('data-drag', '');
  markTouched();
  target = null;
  drag = {
    px: e.clientX,
    x0: x,
    lastX: x,
    moved: 0
  };
});
rail.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.px;
  drag.moved = Math.max(drag.moved, Math.abs(dx));
  x = drag.x0 - dx;
});
const endDrag = e => {
  if (!drag) return;
  const wasClick = drag.moved < 6;
  const card = e.target && e.target.closest ? e.target.closest('.card') : null;
  drag = null;
  rail.removeAttribute('data-drag');
  if (wasClick && card) {
    const i = +card.dataset.i;
    if (i === active) openCard(i);else travelTo(i);
  }
};
rail.addEventListener('pointerup', endDrag);
rail.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOv();
  if (ov.hasAttribute('data-on')) return;
  if (e.key === 'ArrowRight') {
    markTouched();
    travelTo((active + 1) % CARDS.length);
  }
  if (e.key === 'ArrowLeft') {
    markTouched();
    travelTo((active - 1 + CARDS.length) % CARDS.length);
  }
  if (e.key === 'Enter') openCard(active);
});
document.querySelectorAll('#dock [data-go]').forEach(b => b.addEventListener('click', () => {
  markTouched();
  const go = b.dataset.go;
  if (go === 'cta') {
    const i = CARDS.findIndex(c => c.kind === 'cta');
    travelTo(i);
    openCard(i);
    return;
  }
  const kinds = go === 'work' ? ['work'] : ['story', 'ask', 'work', 'team', 'svc', 'post'];
  let i = active;
  for (let k = 1; k <= CARDS.length; k++) {
    const j = (active + k) % CARDS.length;
    if (kinds.includes(CARDS[j].kind)) {
      i = j;
      break;
    }
  }
  travelTo(i);
}));

/* ---- dedicated page per card ---- */
let openI = -1,
  animating = false;
const EASE = 'cubic-bezier(.2,.85,.2,1)';
function heroHTML(c) {
  const kicker = c.meta || c.who || c.kicker || 'Ahead of Market';
  const head = c.kind === 'quote' ? `“${esc(c.say)}”` : esc(c.head || c.title);
  const img = c.src ? `<img src="${c.src}" alt="" />` : '';
  return `${img}<div class="veil"></div><div class="htxt"><div class="lbl eyebrow rise" style="--d:60">${esc(c.label)} &nbsp;·&nbsp; ${esc(kicker)}</div><h2 class="rise" style="--d:110">${head}</h2></div>`;
}
function bodyHTML(c, i) {
  const parts = [`<p class="lede rise" style="--d:170">${esc(c.body)}</p>`];
  let d = 220;
  if (c.kind === 'work') parts.push(`<div class="facts rise" style="--d:${d += 50}"><div class="lbl">Result<b>${esc(c.metric)}</b></div><div class="lbl">Engagement<b>${esc(c.meta)}</b></div></div>`);
  if (c.kind === 'quote') parts.push(`<blockquote class="rise" style="--d:${d += 50}">“${esc(c.say)}”</blockquote><p class="lbl rise" style="--d:${d += 40};color:var(--gray-500)">${esc(c.who)}</p>`);
  if (c.pts) parts.push(`<ul class="rise" style="--d:${d += 50}">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`);
  (c.story || []).forEach(s => parts.push(`<section class="rise" style="--d:${d += 50}"><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></section>`));
  if (c.kind === 'cta') parts.push(`<div class="rise" style="--d:${d += 50}">${quizHTML()}</div>`);
  const n = (i + 1) % CARDS.length;
  parts.push(`<button id="nextcard" class="lbl rise" style="--d:${d += 60}">Next &nbsp;·&nbsp; ${esc(CARDS[n].title)} →</button>`);
  return parts.join('');
}
function openCard(i, instant) {
  const c = CARDS[i];
  openI = i;
  hero.innerHTML = heroHTML(c);
  pagebody.innerHTML = bodyHTML(c, i);
  if (c.kind === 'cta') wireQuiz();
  document.getElementById('nextcard').addEventListener('click', () => {
    const n = (i + 1) % CARDS.length;
    travelTo(n);
    ov.scrollTop = 0;
    hero.style.transition = 'opacity .16s';
    hero.style.opacity = '0';
    pagebody.style.transition = 'opacity .16s';
    pagebody.style.opacity = '0';
    setTimeout(() => {
      hero.style.transition = pagebody.style.transition = '';
      hero.style.opacity = pagebody.style.opacity = '';
      ov.removeAttribute('data-on');
      requestAnimationFrame(() => openCard(n, true));
    }, 170);
  });
  ov.scrollTop = 0;
  ov.removeAttribute('aria-hidden');
  if (instant) {
    ov.setAttribute('data-on', '');
    return;
  }
  // FLIP the hero out of the clicked card
  const from = els[i].getBoundingClientRect();
  ov.setAttribute('data-on', '');
  const to = hero.getBoundingClientRect();
  const sx = from.width / to.width,
    sy = from.height / to.height;
  hero.style.transition = 'none';
  hero.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${sx},${sy})`;
  animating = true;
  requestAnimationFrame(() => {
    hero.style.transition = `transform .5s ${EASE}`;
    hero.style.transform = 'none';
    setTimeout(() => {
      animating = false;
      hero.style.transition = '';
    }, 520);
  });
}
function quizHTML() {
  return QUIZ.map((q, qi) => `<div style="margin-top:26px"><div class="lbl" style="color:var(--gray-500)">${esc(q.q)}</div><div class="pick" data-q="${qi}">${q.opts.map((o, oi) => `<button data-o="${oi}">${esc(o)}</button>`).join('')}</div></div>`).join('') + `<div style="margin-top:32px;padding-top:22px;border-top:1px solid rgba(12,12,12,.14)"><p class="lbl" style="color:var(--gray-500)">Then</p><p style="margin-top:8px;font-size:16px;line-height:1.7">hello@aheadofmarket.com — we reply the same day.</p></div>`;
}
function wireQuiz() {
  pagebody.querySelectorAll('.pick').forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    [...row.children].forEach(k => k.removeAttribute('data-on'));
    b.setAttribute('data-on', '');
  }));
}
function closeOv() {
  if (!ov.hasAttribute('data-on') || animating) return;
  const i = openI;
  const to = els[i] ? els[i].getBoundingClientRect() : null;
  const from = hero.getBoundingClientRect();
  ov.removeAttribute('data-on');
  ov.setAttribute('aria-hidden', 'true');
  if (to && ov.scrollTop < 40) {
    const sx = to.width / from.width,
      sy = to.height / from.height;
    hero.style.transition = `transform .38s ${EASE}`;
    hero.style.transform = `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${sx},${sy})`;
    setTimeout(() => {
      hero.style.transition = 'none';
      hero.style.transform = 'none';
    }, 400);
  }
}
ov.addEventListener('click', e => {
  if (e.target === ov || e.target.id === 'ovclose') closeOv();
});
measure();
x = P[0];
let resizePending = false;
addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    measure();
    render();
  });
});
setActive(0);
requestAnimationFrame(frame);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/loop-standalone.js", error: String((e && e.message) || e) }); }

// ui_kits/website/loop.js
try { (() => {
/* Ahead of Market — endless card loop, v2.
   One viewport. Wheel, drag and idle drift all feed the same rail.
   No indices anywhere: cards are named, not numbered. */
const CARDS = [{
  kind: 'story',
  step: 1,
  label: 'Who we are',
  title: 'You already do the real work',
  amb: {
    tint: '#C9B896'
  },
  hi: '#E8DFCB',
  hion: '#12120F',
  paper: true,
  disp: 'You already do [[the real work]].',
  tags: [{
    t: 'Construction',
    s: 'tl'
  }, {
    t: 'Trades',
    s: 'tr'
  }, {
    t: 'Founders',
    s: 'br'
  }, {
    t: 'Nonprofits',
    s: 'bl'
  }],
  body: 'AOM is a creative production and systems company based in Phoenix. We work with construction companies, founders, nonprofits and brands that do real work. The work is already good. The story around it usually is not.',
  story: [{
    h: 'Who this is for',
    p: 'Construction companies, specialty trades, founders, nonprofits and brands that do real work — companies whose marketing has never caught up to what they actually build.'
  }, {
    h: 'How we are set up',
    p: 'A small Phoenix team. The people who pitch the work make the work: shooting, editing, designing and building in-house.'
  }]
}, {
  kind: 'story',
  step: 2,
  label: 'The problem',
  title: 'Nobody outside your office ever sees it',
  amb: {
    tint: '#7C8B99'
  },
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'But nobody outside of your office {{ever sees it}}.',
  tags: [{
    t: 'The gap',
    s: 'tl'
  }, {
    t: 'Best-kept secret',
    s: 'bl'
  }],
  body: 'The best proof you have is happening on site every day, and it dies there. No footage, no story, no reason for anyone new to believe you.',
  story: [{
    h: 'What it costs',
    p: 'Bids won on price instead of trust. Crews who never heard of you. A feed that looks like every competitor in the state.'
  }, {
    h: 'Why it happens',
    p: 'Nobody on your team has time to film it, and the agencies who offer to have never stood on a roof in July.'
  }]
}, {
  kind: 'story',
  step: 3,
  label: 'What we do',
  title: 'That is where we come in',
  amb: {
    tint: '#DD5420'
  },
  hi: '#DD5420',
  hion: '#FFF6EE',
  paper: true,
  disp: 'That is where [[we come in]].',
  tags: [{
    t: 'Social',
    s: 'tl'
  }, {
    t: 'Video',
    s: 'tr'
  }, {
    t: 'Websites',
    s: 'br'
  }, {
    t: 'AI systems',
    s: 'bl'
  }],
  body: 'A day or two on site with your crew. No script, no stock, no borrowed footage. Then we build everything around it: the content, the website and the systems that keep it moving.',
  story: [{
    h: 'Video',
    p: 'Brand films, founder series and job-site stories. Production through final cut, in every length each platform actually wants.'
  }, {
    h: 'Social',
    p: 'One shoot day becomes a month of native posts. We run the calendar and write the hooks.'
  }, {
    h: 'Websites',
    p: 'Marketing sites and web apps, designed and engineered by the same people who cut the film.'
  }, {
    h: 'AI systems',
    p: 'AI-powered workflows behind the content so publishing never waits on another meeting.'
  }]
}, {
  kind: 'story',
  step: 4,
  label: 'How it works',
  title: 'Your story, told and seen',
  amb: {
    tint: '#5E86A8'
  },
  hi: '#A8C0D8',
  hion: '#12120F',
  paper: true,
  disp: 'AOM makes sure your story is [[told and seen]].',
  tags: [{
    t: 'We come to you',
    s: 'tl'
  }, {
    t: 'Nine cuts, one shoot',
    s: 'tr'
  }, {
    t: 'It keeps running',
    s: 'bl'
  }],
  body: 'The hero film, the bid-room version, the recruiting cut and a month of short native posts — all out of the same two days.',
  story: [{
    h: 'We come to you',
    p: 'One or two days on site. We work around the crew, not the other way around.'
  }, {
    h: 'We cut it many ways',
    p: 'Nine versions, three lengths, every platform native. Nothing exported sideways.'
  }, {
    h: 'We keep it running',
    p: 'Content ships on a calendar you can see, month after month.'
  }]
}, {
  kind: 'ask',
  step: 5,
  label: 'How we help',
  title: 'How can we help you?',
  amb: {
    tint: '#D6DE3C'
  },
  hi: '#E8F04A',
  hion: '#12120F',
  paper: true,
  disp: 'How can we [[help you]]?',
  opts: [{
    t: 'We need web creativity',
    p: 'A site that looks like the work'
  }, {
    t: 'We need to get social',
    p: 'Always-on content, run for you'
  }, {
    t: 'We need a video',
    p: 'One film that does the convincing'
  }, {
    t: 'We need a marketing team',
    p: 'All of it, handled in-house'
  }],
  body: 'Pick the closest one. We reply with a plan, a price and a date — not a discovery call.',
  story: [{
    h: 'What changes',
    p: 'Leads that already trust you, bids you get invited into, and applicants who came looking for you.'
  }, {
    h: 'How we start',
    p: 'Three questions and a look at what you already have. Then a plan you can say yes or no to.'
  }]
}, {
  kind: 'work',
  label: 'Work',
  title: 'Sunland Builders — brand film',
  meta: 'Brand film · 2026',
  metric: 'The bid-winning cut',
  slot: 'loop-work-1',
  src: '../../assets/photos/rooftop-crew.jpeg',
  body: 'Two days on site, no script, no borrowed footage. The film now opens every bid presentation Sunland walks into.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'Almost a million views',
  say: 'The video you guys made us hit almost a million views organically (not kidding)',
  who: 'Founder · construction',
  body: 'One founder series, posted natively, no paid support. Organic first is not a budget constraint — it is the proof that the story works.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Video',
  tone: 'pale',
  name: 'Video',
  head: 'Films that get watched',
  pts: ['Brand films', 'Founder series', 'Job-site stories'],
  body: 'Production to final cut, in-house. Nine versions, three lengths, every platform native — nothing exported sideways.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Founder series, Vol. 1',
  meta: 'Social system · 2026',
  metric: 'Almost a million views',
  slot: 'loop-work-2',
  src: '../../assets/photos/founders.jpeg',
  body: 'A weekly founder series built to compound: one shoot day, a month of native cuts, a feed that works while you run the company.'
}, {
  kind: 'team',
  label: 'Studio',
  title: 'Small on purpose',
  slot: 'loop-team',
  src: '../../assets/photos/portrait-mat.jpeg',
  head: 'Small on purpose',
  who: 'Ahead of Market · Phoenix',
  body: 'The people who pitch the work make the work. No account layer, no handoff, no drift between the idea and what ships.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Desert Hope gala film',
  meta: 'Nonprofit film · 2025',
  metric: 'Giving up by two thirds',
  slot: 'loop-work-3',
  src: '../../assets/photos/restaurant-team.jpeg',
  body: 'A three-minute film cut for a room of 400 donors, then re-cut for the eleven months between galas.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Web',
  tone: 'pale',
  name: 'Web',
  head: 'Sites that convert',
  pts: ['Marketing sites', 'Web apps', 'Design engineering'],
  body: 'Precise, editorial builds. Fast, monochrome, every pixel earning its place.'
}, {
  kind: 'quote',
  label: 'Client',
  title: 'A new league',
  say: 'Your taking us into a new league',
  who: 'Owner · specialty trades',
  body: 'Said after the first cut landed. The work is judged by what it changes — the bids you get invited to, the crews who apply.'
}, {
  kind: 'work',
  label: 'Work',
  title: 'Crew stories — recruiting',
  meta: 'Campaign · 2025',
  metric: 'Three times the applicants',
  slot: 'loop-work-4',
  src: '../../assets/photos/duct-install.jpeg',
  body: 'Recruiting content shot with the crew who actually do the work. Three times the qualified applicants in one quarter.'
}, {
  kind: 'svc',
  label: 'Service',
  title: 'Systems',
  tone: 'pale',
  name: 'Systems',
  head: 'Social and AI workflows',
  pts: ['Social systems', 'AI workflows', 'Always-on content'],
  body: 'Content engines with AI-powered workflows behind them, so the feed keeps moving without another meeting.'
}, {
  kind: 'post',
  label: 'Journal',
  title: 'Nobody watches your intro',
  tone: 'pale',
  head: 'Nobody watches your intro',
  meta: 'Journal · March 2026',
  body: 'The first three seconds decide everything. Logo stings, drone establishing shots and a slow fade into a mission statement are three seconds you do not have.',
  story: [{
    h: 'Start in the middle',
    p: 'Open on the loudest, most specific moment you have: the torch, the pour, the plate leaving the pass. Context can come second — attention cannot.'
  }, {
    h: 'Say one thing',
    p: 'A film that says four things says nothing. Pick the sentence you want repeated back to you and cut everything that is not it.'
  }, {
    h: 'Cut for the platform, not the pitch deck',
    p: 'The same story wants a different edit on a phone than on a projector. We deliver both rather than compromising into one.'
  }]
}, {
  kind: 'cta',
  label: 'Start',
  title: 'Work with us',
  head: 'Tell us what you need',
  body: 'Three questions. We reply with a plan, a price and a date — not a discovery call.'
}];
const QUIZ = [{
  q: 'What do you need?',
  opts: ['A video that actually lands', 'Social content that compounds', 'A website that converts', 'All of it — make us impossible to ignore']
}, {
  q: 'When does it go live?',
  opts: ['This month', 'This quarter', 'Still planning']
}, {
  q: 'Who are you?',
  opts: ['Construction / trades', 'Founder-led brand', 'Nonprofit', 'Something else']
}];
const rail = document.getElementById('rail');
const labelEl = document.getElementById('label');
const ticksEl = document.getElementById('ticks');
const hintEl = document.getElementById('hint');
const ov = document.getElementById('ov');
const hero = document.getElementById('hero');
const pagebody = document.getElementById('pagebody');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const MARK = '../../assets/logo/aom-monogram.svg';
function stepbar(step) {
  const n = step || 1;
  const pips = [1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' data-f' : ''} style="--n:${i}"></i>`).join('');
  return `<div class="step"><span>${String(n).padStart(2, '0')}</span><div class="pips">${pips}</div><span class="of">05</span></div>`;
}
function cardHTML(c) {
  const top = '';
  const edge = `<span class="edge"></span><span class="sheen"></span>`;
  const open = `<span class="open lbl">Open</span>`;
  const media = ph => c.src ? `<img class="shot" src="${c.src}" alt="" loading="lazy" />` : `<image-slot id="${c.slot}" shape="rect" placeholder="${ph}"></image-slot>`;
  if (c.kind === 'work') return `${media('Still')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><div class="rule"></div><div class="metric">${esc(c.metric)}</div><h3 style="margin-top:10px">${esc(c.title)}</h3><p>${esc(c.meta)}</p></div>${open}</div>`;
  if (c.kind === 'team') return `${media('Studio photo')}<div class="veil"></div>${edge}<div class="in">${top}<div class="foot"><h3>${esc(c.head)}</h3><p>${esc(c.who)}</p></div>${open}</div>`;
  if (c.kind === 'quote') return `<span class="quo">”</span>${edge}<div class="in">${top}<p class="say" style="margin:auto 0 0">${esc(c.say)}</p><div class="rule" style="margin-top:18px"></div><p style="margin-top:12px">${esc(c.who)}</p>${open}</div>`;
  if (c.kind === 'ask') {
    const d2 = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>');
    const opts = c.opts.map((o, n) => `<button class="opt" style="--i:${n}"><b>${esc(o.t)}</b><i>${esc(o.p)}</i></button>`).join('');
    return `${edge}${stepbar(5)}<div class="in"><p class="disp ask">${d2}</p><div class="opts">${opts}</div>${open}</div>`;
  }
  if (c.kind === 'story') {
    const disp = esc(c.disp).replace(/\[\[(.+?)\]\]/g, '<mark class="hi">$1</mark>').replace(/\{\{(.+?)\}\}/g, '<span class="un">$1</span>');
    const tags = (c.tags || []).map((t, n) => `<span class="tag tag--${t.s}${n === 0 ? ' tag--fill' : ''}" style="--i:${n}">${esc(t.t)}</span>`).join('');
    return `${edge}${tags}${stepbar(c.step)}<div class="in"><p class="disp">${disp}</p>${open}</div>`;
  }
  if (c.kind === 'post') return `${edge}<div class="in">${top}<div class="foot"><div class="lbl" style="color:var(--gray-500)">${esc(c.meta)}</div><h3 class="big" style="margin-top:12px">${esc(c.head)}</h3></div>${open}</div>`;
  if (c.kind === 'explain') return `${edge}<div class="in">${top}<div class="foot"><h3 class="big">${esc(c.head)}</h3><ul class="svc num">${c.pts.map((p, n) => `<li><i>${String(n + 1).padStart(2, '0')}</i>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  if (c.kind === 'say') return `<img class="wm" src="${MARK}" alt="" />${edge}<div class="in">${top}<p class="big">${esc(c.big)}</p><p class="lbl" style="color:var(--gray-500);margin-top:18px">${esc(c.kicker || 'Read more')}</p></div>`;
  if (c.kind === 'svc') return `${edge}<span class="vert lbl">${esc(c.name)}</span><div class="in">${top}<div class="foot"><div class="wordmark">${esc(c.name)}</div><h3 style="margin-top:12px">${esc(c.head)}</h3><ul class="svc">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>${open}</div>`;
  return `${edge}<img class="wm" src="${MARK}" alt="" /><div class="in">${top}<h3 class="big" style="margin-top:auto">${esc(c.head)}</h3><p style="margin-top:16px">${esc(c.body)}</p><p class="lbl" style="margin-top:20px">Start here →</p></div>`;
}
CARDS.forEach(c => {
  c.span = {
    ask: 1.24,
    story: 1.18,
    say: 1.24,
    explain: 1,
    work: 1.34,
    quote: 1.12,
    svc: .84,
    team: 1,
    post: 1.06,
    cta: .9
  }[c.kind] || 1;
});
const els = CARDS.map((c, i) => {
  const d = document.createElement('div');
  d.className = 'card card--' + c.kind + (c.tone === 'pale' ? ' card--pale' : '');
  d.dataset.i = i;
  if (c.paper) d.setAttribute('data-paper', '');
  if (c.hi) {
    d.style.setProperty('--hi-bg', c.hi);
    d.style.setProperty('--hi-fg', c.hion);
  }
  d.innerHTML = cardHTML(c);
  rail.appendChild(d);
  return d;
});
CARDS.forEach((c, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', c.title);
  b.addEventListener('click', () => travelTo(i));
  ticksEl.appendChild(b);
});
const ticks = [...ticksEl.children];

/* ---- ambient backdrop ----
   Each card may define: amb: { tint:'#hex', media:'path.mp4|.jpg', dim:0..1 }
   Two layers crossfade so video keeps playing through the transition.        */
const amb = document.getElementById('amb');
const layers = [amb.querySelector('[data-a]'), amb.querySelector('[data-b]')];
let ambTurn = 0,
  ambKey = null;
function ambFor(c) {
  const a = c.amb || {};
  return {
    tint: a.tint || (c.hi && c.hi !== '#12120F' ? c.hi : '#EDEAE2'),
    media: a.media || c.src || null,
    dim: a.dim == null ? .82 : a.dim
  };
}
function setAmbience(c) {
  const a = ambFor(c);
  const key = a.tint + '|' + (a.media || '');
  if (key === ambKey) return;
  ambKey = key;
  const next = layers[ambTurn],
    prev = layers[ambTurn ^ 1];
  ambTurn ^= 1;
  const isVid = a.media && /\.(mp4|webm|mov)$/i.test(a.media);
  const media = !a.media ? '' : isVid ? `<video src="${a.media}" autoplay muted loop playsinline></video>` : `<img src="${a.media}" alt="" />`;
  const wash = a.media ? `<div class="wash" style="background:linear-gradient(180deg,rgba(245,244,240,${a.dim}) 0%,rgba(245,244,240,${Math.min(1, a.dim + .1)}) 100%),radial-gradient(circle at 50% 46%,${a.tint}22,transparent 70%)"></div>` : `<div class="wash" style="background:radial-gradient(120% 90% at 50% 42%,${a.tint}3d 0%,${a.tint}14 42%,rgba(245,244,240,0) 74%),linear-gradient(180deg,rgba(245,244,240,.5),rgba(245,244,240,.9))"></div>`;
  next.innerHTML = media + wash + '<div class="grain"></div>';
  requestAnimationFrame(() => {
    next.setAttribute('data-on', '');
    prev.removeAttribute('data-on');
  });
  setTimeout(() => {
    if (!prev.hasAttribute('data-on')) prev.innerHTML = '';
  }, 1000);
}

/* ---- geometry + motion ---- */
let step = 0,
  total = 0,
  x = 0,
  v = 0,
  drag = null,
  target = null,
  active = -1,
  touched = false;
let W = [],
  P = [];
const DRIFT = 0.38;
function measure() {
  const rh = rail.clientHeight || 480;
  const h = Math.max(250, Math.min(460, rh - 30));
  const base = Math.round(h * 0.72);
  const k = h / 428;
  const gap = window.innerWidth < 760 ? 18 : Math.round(30 * k);
  W = CARDS.map(c => Math.round(base * (window.innerWidth < 760 ? 1 : c.span)));
  els.forEach((el, i) => {
    el.style.width = W[i] + 'px';
    el.style.height = h + 'px';
    el.style.marginTop = -h / 2 + 'px';
    el.style.marginLeft = -W[i] / 2 + 'px';
  });
  rail.style.setProperty('--k', k.toFixed(3));
  let acc = 0;
  P = [];
  for (let i = 0; i < W.length; i++) {
    P.push(acc + W[i] / 2);
    acc += W[i] + gap;
  }
  total = acc;
  step = base + gap;
}
const wrap = d => {
  d = (d % total + total) % total;
  return d > total / 2 ? d - total : d;
};
function frame() {
  if (drag) {
    v = v * 0.6 + (x - drag.lastX) * 0.4;
    drag.lastX = x;
  } else if (target !== null) {
    const d = wrap(target - x);
    if (Math.abs(d) < 0.4) {
      x = target;
      target = null;
      v = DRIFT;
    } else {
      x += d * 0.085;
      v = d * 0.085;
    }
  } else {
    x += v;
    v += (DRIFT - v) * 0.033;
  }
  render();
  requestAnimationFrame(frame);
}
function render() {
  const half = window.innerWidth / 2 + step;
  let best = 1e9,
    bestI = 0;
  for (let i = 0; i < els.length; i++) {
    const dx = wrap(P[i] - x);
    const a = Math.abs(dx);
    if (a < best) {
      best = a;
      bestI = i;
    }
    if (a > half) {
      if (els[i].style.visibility !== 'hidden') els[i].style.visibility = 'hidden';
      continue;
    }
    const n = dx / step; // signed distance in cards
    // deadband: anything within a third of a card of centre reads as fully live
    const t = Math.min(1, Math.max(0, (a - step * 0.34) / (step * 2)));
    const ry = Math.max(-10, Math.min(10, -n * 4.2)); // slight turn away from centre
    const tf = `translate3d(${dx.toFixed(1)}px,${(t * 14).toFixed(1)}px,${(-t * 90).toFixed(0)}px) rotateY(${ry.toFixed(2)}deg) scale(${(1 - t * 0.07).toFixed(3)})`;
    els[i].style.visibility = 'visible';
    if (els[i].dataset.tf !== tf) {
      els[i].dataset.tf = tf;
      els[i].style.transform = tf;
      els[i].style.opacity = (1 - t * 0.7).toFixed(3);
      els[i].style.zIndex = String(100 - Math.round(a));
    }
  }
  if (bestI !== active) setActive(bestI);
}
function setActive(i) {
  if (active >= 0) els[active].removeAttribute('data-live');
  active = i;
  els[i].setAttribute('data-live', '');
  const c = CARDS[i];
  setAmbience(c);
  const span = document.createElement('span');
  span.innerHTML = `<i>${esc(c.label)} &nbsp;</i><b>${esc(c.title)}</b>`;
  span.style.opacity = '0';
  span.style.transform = 'translateY(6px)';
  [...labelEl.children].slice(0, -1).forEach(n => {
    if (n !== labelEl.lastChild) n.remove();
  });
  const old = labelEl.firstChild;
  labelEl.appendChild(span);
  requestAnimationFrame(() => {
    span.style.opacity = '1';
    span.style.transform = 'none';
    if (old) {
      old.style.opacity = '0';
      old.style.transform = 'translateY(-6px)';
      setTimeout(() => old.remove(), 320);
    }
  });
  ticks.forEach((d, k) => k === i ? d.setAttribute('data-on', '') : d.removeAttribute('data-on'));
}
function travelTo(i) {
  target = x + wrap(P[i] - x);
}
function markTouched() {
  if (!touched) {
    touched = true;
    hintEl.setAttribute('data-off', '');
  }
}

/* ---- input ---- */
addEventListener('wheel', e => {
  if (ov.hasAttribute('data-on')) return;
  e.preventDefault();
  markTouched();
  target = null;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  v = Math.max(-70, Math.min(70, v + d * 0.09));
}, {
  passive: false
});
rail.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  rail.setPointerCapture(e.pointerId);
  rail.setAttribute('data-drag', '');
  markTouched();
  target = null;
  drag = {
    px: e.clientX,
    x0: x,
    lastX: x,
    moved: 0
  };
});
rail.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.px;
  drag.moved = Math.max(drag.moved, Math.abs(dx));
  x = drag.x0 - dx;
});
const endDrag = e => {
  if (!drag) return;
  const wasClick = drag.moved < 6;
  const card = e.target && e.target.closest ? e.target.closest('.card') : null;
  drag = null;
  rail.removeAttribute('data-drag');
  if (wasClick && card) {
    const i = +card.dataset.i;
    if (i === active) openCard(i);else travelTo(i);
  }
};
rail.addEventListener('pointerup', endDrag);
rail.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOv();
  if (ov.hasAttribute('data-on')) return;
  if (e.key === 'ArrowRight') {
    markTouched();
    travelTo((active + 1) % CARDS.length);
  }
  if (e.key === 'ArrowLeft') {
    markTouched();
    travelTo((active - 1 + CARDS.length) % CARDS.length);
  }
  if (e.key === 'Enter') openCard(active);
});
document.querySelectorAll('#dock [data-go]').forEach(b => b.addEventListener('click', () => {
  markTouched();
  const go = b.dataset.go;
  if (go === 'cta') {
    const i = CARDS.findIndex(c => c.kind === 'cta');
    travelTo(i);
    openCard(i);
    return;
  }
  const kinds = go === 'work' ? ['work'] : ['story', 'ask', 'work', 'team', 'svc', 'post'];
  let i = active;
  for (let k = 1; k <= CARDS.length; k++) {
    const j = (active + k) % CARDS.length;
    if (kinds.includes(CARDS[j].kind)) {
      i = j;
      break;
    }
  }
  travelTo(i);
}));

/* ---- dedicated page per card ---- */
let openI = -1,
  animating = false;
const EASE = 'cubic-bezier(.2,.85,.2,1)';
function heroHTML(c) {
  const kicker = c.meta || c.who || c.kicker || 'Ahead of Market';
  const head = c.kind === 'quote' ? `“${esc(c.say)}”` : esc(c.head || c.title);
  const img = c.src ? `<img src="${c.src}" alt="" />` : '';
  return `${img}<div class="veil"></div><div class="htxt"><div class="lbl eyebrow rise" style="--d:60">${esc(c.label)} &nbsp;·&nbsp; ${esc(kicker)}</div><h2 class="rise" style="--d:110">${head}</h2></div>`;
}
function bodyHTML(c, i) {
  const parts = [`<p class="lede rise" style="--d:170">${esc(c.body)}</p>`];
  let d = 220;
  if (c.kind === 'work') parts.push(`<div class="facts rise" style="--d:${d += 50}"><div class="lbl">Result<b>${esc(c.metric)}</b></div><div class="lbl">Engagement<b>${esc(c.meta)}</b></div></div>`);
  if (c.kind === 'quote') parts.push(`<blockquote class="rise" style="--d:${d += 50}">“${esc(c.say)}”</blockquote><p class="lbl rise" style="--d:${d += 40};color:var(--gray-500)">${esc(c.who)}</p>`);
  if (c.pts) parts.push(`<ul class="rise" style="--d:${d += 50}">${c.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`);
  (c.story || []).forEach(s => parts.push(`<section class="rise" style="--d:${d += 50}"><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></section>`));
  if (c.kind === 'cta') parts.push(`<div class="rise" style="--d:${d += 50}">${quizHTML()}</div>`);
  const n = (i + 1) % CARDS.length;
  parts.push(`<button id="nextcard" class="lbl rise" style="--d:${d += 60}">Next &nbsp;·&nbsp; ${esc(CARDS[n].title)} →</button>`);
  return parts.join('');
}
function openCard(i, instant) {
  const c = CARDS[i];
  openI = i;
  hero.innerHTML = heroHTML(c);
  pagebody.innerHTML = bodyHTML(c, i);
  if (c.kind === 'cta') wireQuiz();
  document.getElementById('nextcard').addEventListener('click', () => {
    const n = (i + 1) % CARDS.length;
    travelTo(n);
    ov.scrollTop = 0;
    hero.style.transition = 'opacity .16s';
    hero.style.opacity = '0';
    pagebody.style.transition = 'opacity .16s';
    pagebody.style.opacity = '0';
    setTimeout(() => {
      hero.style.transition = pagebody.style.transition = '';
      hero.style.opacity = pagebody.style.opacity = '';
      ov.removeAttribute('data-on');
      requestAnimationFrame(() => openCard(n, true));
    }, 170);
  });
  ov.scrollTop = 0;
  ov.removeAttribute('aria-hidden');
  if (instant) {
    ov.setAttribute('data-on', '');
    return;
  }
  // FLIP the hero out of the clicked card
  const from = els[i].getBoundingClientRect();
  ov.setAttribute('data-on', '');
  const to = hero.getBoundingClientRect();
  const sx = from.width / to.width,
    sy = from.height / to.height;
  hero.style.transition = 'none';
  hero.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${sx},${sy})`;
  animating = true;
  requestAnimationFrame(() => {
    hero.style.transition = `transform .5s ${EASE}`;
    hero.style.transform = 'none';
    setTimeout(() => {
      animating = false;
      hero.style.transition = '';
    }, 520);
  });
}
function quizHTML() {
  return QUIZ.map((q, qi) => `<div style="margin-top:26px"><div class="lbl" style="color:var(--gray-500)">${esc(q.q)}</div><div class="pick" data-q="${qi}">${q.opts.map((o, oi) => `<button data-o="${oi}">${esc(o)}</button>`).join('')}</div></div>`).join('') + `<div style="margin-top:32px;padding-top:22px;border-top:1px solid rgba(12,12,12,.14)"><p class="lbl" style="color:var(--gray-500)">Then</p><p style="margin-top:8px;font-size:16px;line-height:1.7">hello@aheadofmarket.com — we reply the same day.</p></div>`;
}
function wireQuiz() {
  pagebody.querySelectorAll('.pick').forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    [...row.children].forEach(k => k.removeAttribute('data-on'));
    b.setAttribute('data-on', '');
  }));
}
function closeOv() {
  if (!ov.hasAttribute('data-on') || animating) return;
  const i = openI;
  const to = els[i] ? els[i].getBoundingClientRect() : null;
  const from = hero.getBoundingClientRect();
  ov.removeAttribute('data-on');
  ov.setAttribute('aria-hidden', 'true');
  if (to && ov.scrollTop < 40) {
    const sx = to.width / from.width,
      sy = to.height / from.height;
    hero.style.transition = `transform .38s ${EASE}`;
    hero.style.transform = `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${sx},${sy})`;
    setTimeout(() => {
      hero.style.transition = 'none';
      hero.style.transform = 'none';
    }, 400);
  }
}
ov.addEventListener('click', e => {
  if (e.target === ov || e.target.id === 'ovclose') closeOv();
});
measure();
x = P[0];
let resizePending = false;
addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    measure();
    render();
  });
});
setActive(0);
requestAnimationFrame(frame);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/loop.js", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Button = __ds_scope.Button;

})();
