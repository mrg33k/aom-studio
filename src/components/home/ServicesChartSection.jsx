import React, { useState, useEffect } from 'react';

/**
 * ServicesChartSection — chart-led visualization of what we do.
 * Replaces the WhatWeMakeSection cards approach.
 *
 * Four chart variants, picker bottom-right:
 *   A: Spectrum — horizontal time-bar chart. Each service is a bar showing how
 *                 long it typically takes. Quick scan: "what's fast, what's long?"
 *   B: Matrix   — capability table. Rows = service families, columns = scope
 *                 buckets. Cells name the deliverable. Reads like a menu.
 *   C: Orbital  — radial diagram. Strategy at center, services orbit around it.
 *                 SVG, clean, shows how everything hangs off one engagement.
 *   D: Process  — left-to-right phase flow. Intake → Plan → Make → Ship → Hold.
 *                 Each phase lists the services that happen there.
 *
 * Data lives in this file (chart-driving metadata: duration, family, phase, etc.).
 */

const STORAGE_KEY = 'aom_services_chart_variant';
const VARIANTS = ['A', 'B', 'C', 'D'];
const VARIANT_LABELS = { A: 'Spectrum', B: 'Matrix', C: 'Orbital', D: 'Process' };
const DEFAULT_VARIANT = 'A';

/* ───────── Service data with chart-driving fields ───────── */
// duration: "weeks" units. Used as the bar length on Spectrum.
// burst:    short label for how long it actually takes start-to-finish.
// family:   Brand / Film / Web / Marketing / Editorial.
// phase:    Plan / Make / Launch / Hold. Used by Process flow.
// scope:    Quick / Project / Retainer. Used by Matrix.
const SERVICES = [
  { id: 'brand-identity', title: 'Brand identity',  burst: '4–6 wks',         weeks: 5,  family: 'Brand',     phase: 'Plan',   scope: 'Project' },
  { id: 'brand-film',     title: 'Brand film',      burst: '1–2 day shoot · 2 wk ship', weeks: 3,  family: 'Film',     phase: 'Make',   scope: 'Project' },
  { id: 'documentary',    title: 'Documentary',     burst: '6–10 wks',        weeks: 9,  family: 'Film',     phase: 'Make',   scope: 'Project' },
  { id: 'homepage',       title: 'Homepage rebuild', burst: '3–4 wks',        weeks: 4,  family: 'Web',      phase: 'Make',   scope: 'Project' },
  { id: 'web-platform',   title: 'Custom web platform', burst: '6–12 wks',    weeks: 10, family: 'Web',      phase: 'Make',   scope: 'Project' },
  { id: 'content-camp',   title: 'Content campaign', burst: '1–2 day shoot · season of posts', weeks: 4, family: 'Film',     phase: 'Make',   scope: 'Retainer' },
  { id: 'product-video',  title: 'Product video',   burst: '2–4 wks',         weeks: 3,  family: 'Film',     phase: 'Make',   scope: 'Project' },
  { id: 'google-ads',     title: 'Google Ads',      burst: 'Ongoing',          weeks: 12, family: 'Marketing', phase: 'Hold',  scope: 'Retainer' },
  { id: 'event-film',     title: 'Event film',      burst: 'Event day · 1–2 wk ship', weeks: 2, family: 'Film',     phase: 'Launch', scope: 'Project' },
  { id: 'editorial',      title: 'Photography & look book', burst: '3–5 wks', weeks: 4,  family: 'Editorial', phase: 'Plan',   scope: 'Project' },
];

const FAMILY_COLOR = {
  Brand:     '#E85D26',
  Film:      '#FDF6EC',
  Web:       '#7C9A72',
  Marketing: '#C9A84C',
  Editorial: '#A5B5C9',
};

/* ───────── Picker ───────── */
function useVariant() {
  const [v, setV] = useState(DEFAULT_VARIANT);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VARIANTS.includes(stored)) setV(stored);
    } catch {}
  }, []);
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };
  return [v, set];
}

function VariantPicker({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 border border-white/[0.10] rounded-full bg-black/40 backdrop-blur p-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 px-2">Chart</span>
      {VARIANTS.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`font-mono text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full transition-colors ${
            value === v ? 'bg-[#E85D26] text-[#0C0C0C]' : 'text-[#F0ECE6]/60 hover:text-[#F0ECE6]'
          }`}
        >
          {v} · {VARIANT_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

/* ───────── A — Spectrum (timeline bars) ───────── */
function VariantA() {
  const maxWeeks = 12;
  const ticks = [0, 2, 4, 6, 8, 10, 12];
  return (
    <div className="relative">
      {/* Tick header */}
      <div className="grid grid-cols-12 gap-0 mb-3 pl-[200px] md:pl-[260px] pr-4">
        {ticks.map((t) => (
          <div key={t} className="col-span-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 -ml-2">
            {t === 0 ? 'Day 0' : t === 12 ? '12+ wks' : `${t} wks`}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {SERVICES.map((s) => {
          const pct = Math.min(100, (s.weeks / maxWeeks) * 100);
          return (
            <div key={s.id} className="grid grid-cols-[200px_1fr] md:grid-cols-[260px_1fr] items-center gap-4 group">
              <div className="flex items-baseline gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: FAMILY_COLOR[s.family] }} />
                <span className="font-headline text-[15px] md:text-[17px] tracking-[-0.012em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">{s.title}</span>
              </div>
              <div className="relative h-9 bg-white/[0.025] rounded-md overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${FAMILY_COLOR[s.family]}88 0%, ${FAMILY_COLOR[s.family]}33 100%)`,
                    borderRight: `2px solid ${FAMILY_COLOR[s.family]}`,
                  }}
                />
                <span className="absolute inset-0 flex items-center px-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/85 z-10">
                  {s.burst}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Family legend */}
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
        {Object.entries(FAMILY_COLOR).map(([f, c]) => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── B — Matrix (capability table) ───────── */
function VariantB() {
  const families = ['Brand', 'Film', 'Web', 'Marketing', 'Editorial'];
  const scopes = ['Quick', 'Project', 'Retainer'];
  const cells = {};
  for (const f of families) for (const sc of scopes) cells[`${f}|${sc}`] = [];
  for (const s of SERVICES) cells[`${s.family}|${s.scope}`].push(s);

  return (
    <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] border-b border-white/[0.10] w-32">Family</th>
            {scopes.map((sc) => (
              <th key={sc} className="text-left p-4 font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] border-b border-white/[0.10]">
                {sc === 'Quick' ? 'Quick · days to weeks' : sc === 'Project' ? 'Project · weeks' : 'Retainer · ongoing'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {families.map((f, fi) => (
            <tr key={f} className={fi % 2 ? 'bg-white/[0.012]' : ''}>
              <td className="align-top p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FAMILY_COLOR[f] }} />
                  <span className="font-headline text-[18px] md:text-[22px] tracking-[-0.012em] text-[#F0ECE6]">{f}</span>
                </div>
              </td>
              {scopes.map((sc) => {
                const items = cells[`${f}|${sc}`];
                return (
                  <td key={sc} className="align-top p-4 border-b border-white/[0.06]">
                    {items.length === 0 ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/20">·</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {items.map((it) => (
                          <div key={it.id}>
                            <p className="font-headline text-[15px] md:text-[17px] tracking-[-0.012em] text-[#F0ECE6]">{it.title}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/50 mt-0.5">{it.burst}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── C — Orbital (radial SVG diagram) ───────── */
function VariantC() {
  const size = 720;
  const cx = size / 2;
  const cy = size / 2;
  const N = SERVICES.length;
  const ringR = 270;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[720px] h-auto">
        {/* Ring guide */}
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="rgba(232,93,38,0.18)" strokeDasharray="4 6" />
        <circle cx={cx} cy={cy} r={120} fill="none" stroke="rgba(255,255,255,0.08)" />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={88} fill="#0C0C0C" stroke="#E85D26" strokeWidth="1" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-[#E85D26]" style={{ font: '500 11px ui-monospace, monospace', letterSpacing: '0.32em', textTransform: 'uppercase' }}>
          One brief
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="fill-[#F0ECE6]" style={{ font: '700 26px Syne, sans-serif', letterSpacing: '-0.02em' }}>
          AOM
        </text>

        {/* Service nodes around the ring */}
        {SERVICES.map((s, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * ringR;
          const y = cy + Math.sin(angle) * ringR;
          const labelOffset = 22;
          const lx = cx + Math.cos(angle) * (ringR + labelOffset);
          const ly = cy + Math.sin(angle) * (ringR + labelOffset);
          const anchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle';
          return (
            <g key={s.id}>
              {/* Spoke */}
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={FAMILY_COLOR[s.family]} strokeOpacity="0.25" strokeWidth="1" />
              {/* Node */}
              <circle cx={x} cy={y} r={9} fill={FAMILY_COLOR[s.family]} />
              <circle cx={x} cy={y} r={9} fill="none" stroke={FAMILY_COLOR[s.family]} strokeOpacity="0.35" strokeWidth="6" />
              {/* Label */}
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="fill-[#F0ECE6]" style={{ font: '600 13px Syne, sans-serif', letterSpacing: '-0.012em' }}>
                {s.title}
              </text>
              <text x={lx} y={ly + 14} textAnchor={anchor} dominantBaseline="middle" className="fill-[#F0ECE6]/45" style={{ font: '500 9.5px ui-monospace, monospace', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                {s.burst}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ───────── D — Process (phase flow) ───────── */
function VariantD() {
  const phases = [
    { key: 'Plan',   label: 'Plan',   desc: 'We figure out what to make and why.' },
    { key: 'Make',   label: 'Make',   desc: 'We shoot, design, and build it.' },
    { key: 'Launch', label: 'Launch', desc: 'It goes live.' },
    { key: 'Hold',   label: 'Hold',   desc: 'We keep it working.' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-white/[0.08] rounded-2xl overflow-hidden">
      {phases.map((p, pi) => {
        const items = SERVICES.filter((s) => s.phase === p.key);
        return (
          <div key={p.key} className="bg-[#0a0a0a] p-6 md:p-7 flex flex-col gap-4 min-h-[280px]">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Phase {pi + 1}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <h3 className="font-headline text-[28px] md:text-[36px] leading-[1.0] tracking-[-0.022em] text-[#F0ECE6]">
              {p.label}<span className="text-[#E85D26]">.</span>
            </h3>
            <p className="font-body text-[13.5px] md:text-[14px] text-[#F0ECE6]/55 leading-[1.55]">{p.desc}</p>
            <div className="flex flex-col gap-2 mt-2">
              {items.map((s) => (
                <div key={s.id} className="flex items-baseline gap-3 py-2 border-t border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: FAMILY_COLOR[s.family] }} />
                  <div className="flex-1">
                    <p className="font-headline text-[15px] tracking-[-0.012em] text-[#F0ECE6]">{s.title}</p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-0.5">{s.burst}</p>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/25">·</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function ServicesChartSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || VariantA;

  return (
    <section className="bg-[#0a0a0a] border-t border-white/[0.06] py-20 md:py-28 px-6 md:px-12">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-16">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-4">What we do</p>
            <h2 className="font-headline text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] max-w-3xl text-[#F0ECE6]">
              Ten services, one <em className="text-[#E85D26]">brief.</em>
            </h2>
            <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/65 mt-5 max-w-xl leading-[1.6]">
              The work, mapped. How long each piece takes, what it falls under, and where it sits in the flow.
            </p>
          </div>
        </div>

        <Variant />

        {VARIANTS.length > 1 && (
          <div className="mt-12 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
