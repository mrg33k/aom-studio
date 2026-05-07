import React from 'react';

const ITEMS = [
  'Open for new work',
  'Brand · Story · Motion · Web',
  'Phoenix studio, available anywhere',
  'Subscriptions, projects, retainers',
  'See pricing below',
];

export default function TickerBar() {
  const seq = [...ITEMS, ...ITEMS];
  return (
    <div
      aria-hidden="true"
      className="bg-aom-orange text-aom-night font-body font-semibold text-[11px] uppercase tracking-[0.18em] py-[9px] overflow-hidden whitespace-nowrap relative z-[60]"
    >
      <div className="ticker-track inline-block pl-[100%]">
        {seq.map((s, i) => (
          <span key={i} className="inline-block px-7 ticker-item">{s}</span>
        ))}
      </div>
      <style>{`
        .ticker-track { animation: aom-ticker-scroll 50s linear infinite; }
        .ticker-item::after {
          content: '◍';
          margin-left: 28px;
          color: #0C0C0C;
          opacity: 0.55;
        }
        @keyframes aom-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
