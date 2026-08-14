import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ─── Brand tokens (AOM v4 dark frame) ────────────────────────────────────────
const V = {
  bg:        '#0C0C0C',
  card:      '#141412',
  card2:     '#1A1A17',
  cardHov:   '#1F1F1C',
  orange:    '#E85D26',
  orangeD:   '#D14E1C',
  blue:      '#3B82F6',
  blueD:     '#2563EB',
  text:      '#F0ECE6',
  muted:     '#8A847C',
  dim:       '#4A4540',
  border:    'rgba(255,255,255,0.08)',
  borderHov: 'rgba(255,255,255,0.16)',
  green:     '#22C55E',
  syne:      "'Syne', sans-serif",
  space:     "'Space Grotesk', sans-serif",
  mono:      "'JetBrains Mono', monospace",
};

const STATE_ABBRS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa',
  KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland',
  MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri',
  MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey',
  NM:'New Mexico', NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio',
  OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming',
};

const TYPE_LABELS = {
  city: 'City',
  town: 'Town',
  village: 'Village',
  borough: 'Borough',
};

const POP_PRESETS = [
  { label: 'Any',       min: 0,       max: Infinity },
  { label: 'Under 1K',  min: 0,       max: 1000     },
  { label: '1K-10K',    min: 1000,    max: 10000    },
  { label: '10K-50K',   min: 10000,   max: 50000    },
  { label: '50K-250K',  min: 50000,   max: 250000   },
  { label: '250K+',     min: 250000,  max: Infinity  },
];

function fmtPop(n) {
  if (n == null) return 'N/A';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + 'K';
  return n.toLocaleString();
}

function fmtArea(n) {
  if (n == null) return 'N/A';
  return n.toFixed(1) + ' mi²';
}

const CSV_COLUMNS = [
  ['name',             p => p.name],
  ['state_abbr',       p => p.state_abbr],
  ['state_name',       p => p.state_name],
  ['type',             p => p.type],
  ['population_2020',  p => p.population_2020],
  ['land_area_sqmi',   p => p.land_area_sqmi],
  ['latitude',         p => p.latitude],
  ['longitude',        p => p.longitude],
  ['geoid',            p => p.geoid],
  ['contact_name',     p => p.contact_name || ''],
  ['contact_title',    p => p.contact_title || ''],
  ['contact_email',    p => p.contact_email || ''],
  ['contact_phone',    p => p.contact_phone || ''],
  ['contact_source',   p => p.contact_source || ''],
  ['contact_enriched_at', p => p.contact_enriched_at || ''],
];

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCSV(places, filename = 'arsenal-municipalities.csv') {
  const header = CSV_COLUMNS.map(([k]) => k).join(',');
  const rows = places.map(p => CSV_COLUMNS.map(([, fn]) => csvCell(fn(p))).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Type badge ───────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  city:    { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', text: '#93C5FD' },
  town:    { bg: 'rgba(232,93,38,0.12)',  border: '#E85D26', text: '#FDBA74' },
  village: { bg: 'rgba(34,197,94,0.12)', border: '#22C55E', text: '#86EFAC' },
  borough: { bg: 'rgba(168,85,247,0.12)',border: '#A855F7', text: '#D8B4FE' },
};

function TypeBadge({ type }) {
  const t = type?.toLowerCase();
  const c = TYPE_COLORS[t] || { bg: 'rgba(138,132,124,0.15)', border: '#8A847C', text: '#A89F96' };
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: 11, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {TYPE_LABELS[t] || type}
    </span>
  );
}

// ─── Contacts Store (localStorage, keyed by geoid) ───────────────────────────
function getContacts(geoid) {
  try {
    const raw = localStorage.getItem(`arsenal-contacts-${geoid}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveContacts(geoid, contacts) {
  localStorage.setItem(`arsenal-contacts-${geoid}`, JSON.stringify(contacts));
}

// ─── Contact Form ────────────────────────────────────────────────────────────
function ContactSection({ geoid }) {
  const [contacts, setContacts] = useState(() => getContacts(geoid));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', phone: '', email: '', notes: '' });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const updated = [...contacts, { ...form, id: Date.now() }];
    setContacts(updated);
    saveContacts(geoid, updated);
    setForm({ name: '', title: '', phone: '', email: '', notes: '' });
    setAdding(false);
  };

  const handleRemove = (id) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveContacts(geoid, updated);
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.12)`,
    color: '#F0ECE6', borderRadius: 5, padding: '7px 10px', fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 11, color: '#8A847C', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          Contacts ({contacts.length})
        </div>
        <button
          onClick={() => setAdding(!adding)}
          style={{
            background: 'rgba(232,93,38,0.12)', border: '1px solid rgba(232,93,38,0.3)',
            color: '#FDBA74', borderRadius: 4, padding: '3px 10px', fontSize: 11,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, cursor: 'pointer',
          }}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {contacts.map(c => (
        <div key={c.id} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '10px 12px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F0ECE6', fontFamily: "'Space Grotesk', sans-serif" }}>{c.name}</div>
              {c.title && <div style={{ fontSize: 12, color: '#8A847C', marginTop: 1 }}>{c.title}</div>}
            </div>
            <button onClick={() => handleRemove(c.id)} style={{
              background: 'none', border: 'none', color: '#5a5550', fontSize: 14, cursor: 'pointer', padding: '0 4px',
            }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {c.phone && (
              <a href={`tel:${c.phone}`} style={{ fontSize: 12, color: '#93C5FD', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: '#93C5FD', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                {c.email}
              </a>
            )}
          </div>
          {c.notes && <div style={{ fontSize: 12, color: '#8A847C', marginTop: 6, lineHeight: 1.4 }}>{c.notes}</div>}
        </div>
      ))}

      {adding && (
        <div style={{
          background: 'rgba(232,93,38,0.05)', border: '1px solid rgba(232,93,38,0.2)',
          borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input placeholder="Title (e.g. City Manager)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          </div>
          <textarea placeholder="Notes (infrastructure needs, status, etc.)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <button onClick={handleAdd} style={{
            background: '#E85D26', border: 'none', color: '#fff', borderRadius: 5, padding: '8px 0',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Save Contact
          </button>
        </div>
      )}

      {contacts.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: '#5a5550', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
          No contacts yet. Add your first lead.
        </div>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ place, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!place) return null;

  const fields = [
    { label: 'Full Name',     value: place.name },
    { label: 'State',         value: `${place.state_name} (${place.state_abbr})` },
    { label: 'Type',          value: <TypeBadge type={place.type} /> },
    { label: 'Status',        value: place.status },
    { label: 'Population',    value: place.population_2020?.toLocaleString() ?? 'N/A' },
    { label: 'Land Area',     value: fmtArea(place.land_area_sqmi) },
    { label: 'Water Area',    value: fmtArea(place.water_area_sqmi) },
    { label: 'Latitude',      value: place.latitude?.toFixed(4) ?? 'N/A' },
    { label: 'Longitude',     value: place.longitude?.toFixed(4) ?? 'N/A' },
    { label: 'GEOID',         value: place.geoid },
  ];

  const mapsUrl = place.latitude && place.longitude
    ? `https://www.google.com/maps?q=${place.latitude},${place.longitude}`
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: V.card, border: `1px solid ${V.borderHov}`,
          borderRadius: 10, width: '100%', maxWidth: 460,
          overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          background: '#181816', borderBottom: `1px solid ${V.border}`,
          padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: V.syne, color: V.text, lineHeight: 1.2 }}>
              {place.name}
            </div>
            <div style={{ fontSize: 13, color: V.muted, fontFamily: V.space, marginTop: 3 }}>
              {place.state_name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${V.border}`, color: V.muted,
              width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Pop hero stat */}
        <div style={{ padding: '16px 20px 0', display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, color: V.muted, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Population</div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: V.syne, color: '#93C5FD', marginTop: 2 }}>
              {place.population_2020 ? place.population_2020.toLocaleString() : 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: V.dim, fontFamily: V.space }}>2020 Census</div>
          </div>
          <div style={{
            flex: 1, background: 'rgba(232,93,38,0.08)', border: '1px solid rgba(232,93,38,0.2)',
            borderRadius: 8, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, color: V.muted, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Land Area</div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: V.syne, color: '#FDBA74', marginTop: 2 }}>
              {place.land_area_sqmi ? place.land_area_sqmi.toFixed(1) : 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: V.dim, fontFamily: V.space }}>square miles</div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '12px 20px 8px' }}>
          {fields.slice(2).map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: `1px solid ${V.border}`,
            }}>
              <span style={{ fontSize: 13, color: V.muted, fontFamily: V.space }}>{label}</span>
              <span style={{ fontSize: 13, color: V.text, fontFamily: V.space, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Contacts */}
        {/* Pre-enriched contact (from Census enrichment) */}
        {place.contact_name && (
          <div style={{ padding: '0 20px 8px' }}>
            <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
              Key Contact
            </div>
            <div style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 6, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: V.text, fontFamily: V.space }}>{place.contact_name}</div>
              {place.contact_title && <div style={{ fontSize: 12, color: V.muted, marginTop: 1 }}>{place.contact_title}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {place.contact_phone && (
                  <a href={`tel:${place.contact_phone}`} style={{
                    background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#86EFAC', borderRadius: 5, padding: '6px 12px', fontSize: 12,
                    fontFamily: V.mono, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    Call {place.contact_phone}
                  </a>
                )}
                {place.contact_email && (
                  <a href={`mailto:${place.contact_email}`} style={{
                    background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                    color: '#93C5FD', borderRadius: 5, padding: '6px 12px', fontSize: 12,
                    fontFamily: V.mono, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    Email {place.contact_email}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual contacts (localStorage) */}
        <ContactSection geoid={place.geoid} />

        {/* Actions */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 8 }}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                color: '#93C5FD', borderRadius: 6, padding: '9px 0', textAlign: 'center',
                fontSize: 13, fontFamily: V.space, fontWeight: 600, textDecoration: 'none',
                display: 'block',
              }}
            >
              View on Map
            </a>
          )}
          <button
            onClick={() => exportCSV([place])}
            style={{
              flex: 1, background: 'rgba(232,93,38,0.1)', border: '1px solid rgba(232,93,38,0.3)',
              color: '#FDBA74', borderRadius: 6, padding: '9px 0',
              fontSize: 13, fontFamily: V.space, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Export Row
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Dashboard ──────────────────────────────────────────────────────────
function StatsStrip({ meta, filtered, total }) {
  const stats = [
    { label: 'Total',      value: total?.toLocaleString(),    color: V.text,    hideOnMobile: false },
    { label: 'Filtered',   value: filtered?.toLocaleString(), color: '#93C5FD', hideOnMobile: false },
    { label: 'Cities',     value: meta?.type_breakdown?.city?.toLocaleString(), color: '#FDBA74', hideOnMobile: false },
    { label: 'Towns',      value: meta?.type_breakdown?.town?.toLocaleString(), color: '#86EFAC', hideOnMobile: true  },
    { label: 'Villages',   value: meta?.type_breakdown?.village?.toLocaleString(), color: '#D8B4FE', hideOnMobile: true  },
    { label: 'Boroughs',   value: meta?.type_breakdown?.borough?.toLocaleString(), color: '#FCA5A5', hideOnMobile: true  },
    { label: 'States',     value: '49', color: V.muted, hideOnMobile: true },
  ];

  return (
    <div style={{
      display: 'flex', gap: 0, borderBottom: `1px solid ${V.border}`,
      overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
    }}>
      <style>{`.stats-strip::-webkit-scrollbar { display: none; }`}</style>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`md-stats-tile${s.hideOnMobile ? ' md-stats-strip-tile-hide-sm' : ''}`}
          style={{
            flex: '0 0 auto',
            borderRight: i < stats.length - 1 ? `1px solid ${V.border}` : 'none',
          }}
        >
          <div className="md-stats-tile-label" style={{ color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            {s.label}
          </div>
          <div className="md-stats-tile-val" style={{ fontWeight: 900, fontFamily: V.syne, color: s.color }}>
 {s.value ?? '·'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MunicipalDirectory() {
  const [data,    setData]    = useState([]);
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [search,      setSearch]      = useState('');
  const [selState,    setSelState]    = useState('');
  const [selType,     setSelType]     = useState('');
  const [popPreset,   setPopPreset]   = useState(0);
  const [sortField,   setSortField]   = useState('population_2020');
  const [sortDir,     setSortDir]     = useState('desc');
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState(null);
  const [showStats,   setShowStats]   = useState(false);
  const [enrichedOnly, setEnrichedOnly] = useState(false);

  const PAGE_SIZE = 50;

  // Load data
  useEffect(() => {
    document.title = 'US Municipality Directory | 19,475 Cities & Towns';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Search, filter, and export data on 19,475 US municipalities. Population, location, type, and more.');
    return () => { document.title = 'AOM | We Make Companies Impossible to Ignore'; };
  }, []);

  useEffect(() => {
    fetch('/arsenal-municipality-data.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json(); })
      .then(j => { setData(j.places); setMeta(j.metadata); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    if (!data.length) return [];
    const q = search.trim().toLowerCase();
    const preset = POP_PRESETS[popPreset];

    return data.filter(p => {
      if (selState && p.state_abbr !== selState) return false;
      if (selType  && (p.type?.toLowerCase() !== selType)) return false;
      if (enrichedOnly && !(p.contact_email || (p.contacts && p.contacts.length))) return false;

      const pop = p.population_2020 ?? 0;
      if (pop < preset.min) return false;
      if (preset.max !== Infinity && pop > preset.max) return false;

      if (q) {
        const name    = p.name?.toLowerCase()       ?? '';
        const state   = p.state_name?.toLowerCase() ?? '';
        const stateAb = p.state_abbr?.toLowerCase() ?? '';
        if (!name.includes(q) && !state.includes(q) && !stateAb.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb+'').toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, search, selState, selType, popPreset, sortField, sortDir, enrichedOnly]);

  const enrichedCount = useMemo(
    () => data.reduce((n, p) => n + (Array.isArray(p.contacts) ? p.contacts.length : (p.contact_email ? 1 : 0)), 0),
    [data]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'population_2020' ? 'desc' : 'asc'); }
    setPage(1);
  }, [sortField]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleState  = (val) => { setSelState(val); setPage(1); };
  const handleType   = (val) => { setSelType(val); setPage(1); };
  const handlePreset = (i)   => { setPopPreset(i); setPage(1); };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ color: V.dim }}>⇅</span>;
    return <span style={{ color: V.orange }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thStyle = (field) => ({
    padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
    fontSize: 11, color: sortField === field ? V.orange : V.muted,
    fontFamily: V.mono, letterSpacing: '0.1em', textTransform: 'uppercase',
    userSelect: 'none', whiteSpace: 'nowrap', fontWeight: 700,
    borderBottom: `2px solid ${sortField === field ? V.orange : V.border}`,
    transition: 'color 0.15s',
  });

  // ── State breakdown for stats panel ──────────────────────────────────────────
  const stateBreakdown = useMemo(() => {
    if (!meta) return [];
    return Object.entries(meta.records_by_state || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [meta]);

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: V.muted, fontFamily: V.mono, letterSpacing: '0.15em' }}>
          LOADING DIRECTORY...
        </div>
        <div style={{ marginTop: 12, width: 200, height: 2, background: V.dim, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: V.orange, width: '60%', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#EF4444', fontFamily: V.space }}>Error: {error}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text, fontFamily: V.space }}>
      <style>{`
        .md-title { font-size: 20px; white-space: nowrap; }
        .md-title-row { padding: 12px 16px 10px; }
        .md-filter-bar { padding: 10px 16px 12px; }
        .md-stats-tile { padding: 10px 14px; min-width: 68px; }
        .md-stats-tile-val { font-size: 16px; }
        .md-stats-tile-label { font-size: 10px; }
        .md-table { min-width: 700px; }
        .md-row-td { padding: 10px 14px; }
        .md-row-name { font-size: 14px; }
        .md-inline-contact { display: none; }
        .md-results-bar { padding: 8px 20px; }
        .md-btn-topright { padding: 7px 14px; font-size: 12px; }

        @media (max-width: 520px) {
          .md-area-col, .md-type-col, .md-contact-col, .md-phone-col { display: none !important; }
          .md-table { min-width: 0 !important; }
          .md-title { font-size: 17px; white-space: normal; letter-spacing: -0.01em; }
          .md-title-row { padding: 10px 12px 8px; gap: 8px; }
          .md-title-row h1 { font-size: 17px !important; white-space: normal !important; }
          .md-filter-bar { padding: 8px 12px 10px; gap: 6px; }
          .md-results-bar { padding: 6px 12px; }
          .md-stats-tile { padding: 8px 10px; min-width: 60px; }
          .md-stats-tile-val { font-size: 13px; }
          .md-stats-tile-label { font-size: 9px; }
          .md-row-td { padding: 10px 12px; }
          .md-row-name { font-size: 14px; }
          .md-inline-contact { display: block; margin-top: 3px; }
          .md-btn-topright { padding: 6px 10px; font-size: 11px; }
          .md-stats-strip-tile-hide-sm { display: none !important; }
        }
        @media (max-width: 380px) {
          .md-stats-tile { padding: 7px 8px; min-width: 54px; }
          .md-title-row h1 { font-size: 15px !important; }
        }
      `}</style>

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: V.card, borderBottom: `1px solid ${V.border}`,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Title row */}
        <div className="md-title-row" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: V.orange, color: '#fff', fontSize: 10, fontWeight: 900,
                fontFamily: V.mono, letterSpacing: '0.12em', padding: '3px 7px', borderRadius: 3,
                textTransform: 'uppercase', flex: '0 0 auto',
              }}>Arsenal</span>
              <h1 className="md-title" style={{
                fontFamily: V.syne, fontWeight: 900,
                color: V.text, margin: 0, letterSpacing: '-0.02em',
                minWidth: 0, lineHeight: 1.15,
              }}>
                Municipality Directory
              </h1>
              <span style={{ fontSize: 12, color: '#888', fontFamily: V.mono, flex: '0 0 auto' }}>
                {filtered.length.toLocaleString()} towns
              </span>
            </div>
            <div style={{ fontSize: 11, color: V.dim, marginTop: 3, fontFamily: V.space }}>
              19,475 incorporated places · 2020 Census · 49 states
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <button
              className="md-btn-topright"
              onClick={() => setShowStats(s => !s)}
              style={{
                background: showStats ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showStats ? 'rgba(59,130,246,0.4)' : V.border}`,
                color: showStats ? '#93C5FD' : V.muted,
                borderRadius: 6,
                fontFamily: V.space, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Stats
            </button>
            <button
              className="md-btn-topright"
              data-test-id="arsenal-csv-export-btn"
              onClick={() => exportCSV(
                filtered,
                `arsenal-municipalities${enrichedOnly ? '-enriched' : ''}.csv`
              )}
              disabled={filtered.length === 0}
              style={{
                background: 'rgba(232,93,38,0.12)', border: '1px solid rgba(232,93,38,0.3)',
                color: '#FDBA74', borderRadius: 6,
                fontFamily: V.space, fontWeight: 700,
                cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filtered.length === 0 ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              title={`Download ${filtered.length.toLocaleString()} rows as CSV`}
            >
              <span>↓</span> CSV ({filtered.length.toLocaleString()})
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <StatsStrip meta={meta} filtered={filtered.length} total={data.length} />

        {/* Filter bar */}
        <div className="md-filter-bar" style={{
          display: 'flex', gap: 8,
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px', minWidth: 160, position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by city name or state..."
              style={{
                width: '100%', background: V.card2, border: `1px solid ${V.border}`,
                color: V.text, borderRadius: 6, padding: '8px 12px 8px 32px',
                fontSize: 14, fontFamily: V.space, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: V.dim, fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          </div>

          {/* State */}
          <select
            value={selState}
            onChange={e => handleState(e.target.value)}
            style={{
              flex: '0 0 auto', background: V.card2, border: `1px solid ${V.border}`,
              color: selState ? V.text : V.muted, borderRadius: 6, padding: '8px 10px',
              fontSize: 13, fontFamily: V.space, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All States</option>
            {STATE_ABBRS.map(s => (
              <option key={s} value={s}>{s} – {STATE_NAMES[s]}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={selType}
            onChange={e => handleType(e.target.value)}
            style={{
              flex: '0 0 auto', background: V.card2, border: `1px solid ${V.border}`,
              color: selType ? V.text : V.muted, borderRadius: 6, padding: '8px 10px',
              fontSize: 13, fontFamily: V.space, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All Types</option>
            <option value="city">City</option>
            <option value="town">Town</option>
            <option value="village">Village</option>
            <option value="borough">Borough</option>
          </select>

          {/* Enriched only toggle */}
          <button
            onClick={() => { setEnrichedOnly(v => !v); setPage(1); }}
            style={{
              background: enrichedOnly ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${enrichedOnly ? 'rgba(34,197,94,0.45)' : V.border}`,
              color: enrichedOnly ? '#86EFAC' : V.muted,
              borderRadius: 5, padding: '6px 10px', fontSize: 11,
              fontFamily: V.mono, cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: enrichedOnly ? 700 : 500, transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            title={`${enrichedCount.toLocaleString()} cities with enriched contact info`}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: enrichedOnly ? '#22C55E' : V.dim,
            }} />
            Enriched only ({enrichedCount.toLocaleString()})
          </button>

          {/* Population presets */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
            {POP_PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => handlePreset(i)}
                style={{
                  background: popPreset === i ? 'rgba(232,93,38,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${popPreset === i ? 'rgba(232,93,38,0.4)' : V.border}`,
                  color: popPreset === i ? '#FDBA74' : V.muted,
                  borderRadius: 5, padding: '6px 10px', fontSize: 11,
                  fontFamily: V.mono, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontWeight: popPreset === i ? 700 : 400, transition: 'all 0.12s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Clear */}
          {(search || selState || selType || popPreset !== 0 || enrichedOnly) && (
            <button
              onClick={() => { setSearch(''); setSelState(''); setSelType(''); setPopPreset(0); setEnrichedOnly(false); setPage(1); }}
              style={{
                background: 'none', border: `1px solid ${V.border}`, color: V.dim,
                borderRadius: 5, padding: '6px 10px', fontSize: 11,
                fontFamily: V.mono, cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Panel (collapsible) ──────────────────────────────────────── */}
      {showStats && (
        <div style={{
          background: V.card2, borderBottom: `1px solid ${V.border}`,
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: 11, color: V.muted, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Top States by Municipality Count
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stateBreakdown.map(([state, count]) => {
              const maxCount = stateBreakdown[0][1];
              const pct = (count / maxCount) * 100;
              return (
                <button
                  key={state}
                  onClick={() => { handleState(state === selState ? '' : state); setShowStats(false); }}
                  style={{
                    background: selState === state ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selState === state ? 'rgba(59,130,246,0.4)' : V.border}`,
                    borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
                    minWidth: 70, textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: V.syne, color: V.text }}>{state}</div>
                  <div style={{ fontSize: 11, color: V.muted, fontFamily: V.mono, marginTop: 1 }}>{count.toLocaleString()}</div>
                  <div style={{ height: 2, background: V.dim, borderRadius: 1, marginTop: 4 }}>
                    <div style={{ width: pct + '%', height: '100%', background: V.blue, borderRadius: 1 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results bar ────────────────────────────────────────────────────── */}
      <div className="md-results-bar" style={{
        background: '#0F0F0D',
        borderBottom: `1px solid ${V.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: 12, color: V.muted, fontFamily: V.mono }}>
          {filtered.length < data.length ? (
            <>
              <span style={{ color: '#93C5FD', fontWeight: 700 }}>{filtered.length.toLocaleString()}</span>
              <span> of {data.length.toLocaleString()} municipalities</span>
            </>
          ) : (
            <span>{data.length.toLocaleString()} municipalities</span>
          )}
          {totalPages > 1 && (
            <span style={{ color: V.dim }}> · Page {page} of {totalPages}</span>
          )}
        </div>
        {/* Sort quick pick */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>Sort:</span>
          {[
            { label: 'Population', field: 'population_2020' },
            { label: 'Name',       field: 'name' },
            { label: 'State',      field: 'state_abbr' },
            { label: 'Area',       field: 'land_area_sqmi' },
          ].map(({ label, field }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              style={{
                background: sortField === field ? 'rgba(232,93,38,0.12)' : 'none',
                border: `1px solid ${sortField === field ? 'rgba(232,93,38,0.3)' : V.border}`,
                color: sortField === field ? '#FDBA74' : V.dim,
                borderRadius: 4, padding: '3px 8px', fontSize: 11,
                fontFamily: V.mono, cursor: 'pointer',
              }}
            >
              {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table className="md-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0F0F0D' }}>
              <th style={thStyle('name')} onClick={() => handleSort('name')}>
                Name <SortIcon field="name" />
              </th>
              <th style={thStyle('state_abbr')} onClick={() => handleSort('state_abbr')}>
                State <SortIcon field="state_abbr" />
              </th>
              <th className="md-type-col" style={{ ...thStyle('type'), cursor: 'default' }}>Type</th>
              <th style={{ ...thStyle('population_2020'), textAlign: 'right' }} onClick={() => handleSort('population_2020')}>
                Pop <SortIcon field="population_2020" />
              </th>
              <th className="md-contact-col" style={{ ...thStyle('contact_name'), cursor: 'default' }}>Contact</th>
              <th className="md-phone-col" style={{ ...thStyle(''), cursor: 'default' }}>Phone / Email</th>
              <th className="md-area-col" style={thStyle('land_area_sqmi')} onClick={() => handleSort('land_area_sqmi')}>
                Area <SortIcon field="land_area_sqmi" />
              </th>
              <th style={{ ...thStyle(''), cursor: 'default', display: 'none' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{
                  padding: '48px 20px', textAlign: 'center',
                  color: V.muted, fontSize: 14, fontFamily: V.space,
                }}>
                  No municipalities match your filters.
                </td>
              </tr>
            ) : rows.map((p, i) => (
              <tr
                key={p.geoid}
                onClick={() => setSelected(p)}
                style={{
                  borderBottom: `1px solid ${V.border}`,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = V.cardHov}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
              >
                <td className="md-row-td" style={{ padding: '10px 14px' }}>
                  <div className="md-row-name" style={{ fontWeight: 600, fontFamily: V.space, color: V.text }}>
                    {p.name}
                  </div>
                  {p.contact_name && (
                    <div className="md-inline-contact" style={{ fontSize: 11, fontFamily: V.space, color: '#86EFAC', lineHeight: 1.3 }}>
                      {p.contact_name}{p.contact_title ? ` · ${p.contact_title}` : ''}
                      {p.contact_email && (
                        <div style={{ fontSize: 10, color: '#93C5FD', fontFamily: V.mono, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.contact_email}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="md-row-td" style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: V.mono, color: V.muted }}>
                    {p.state_abbr}
                  </span>
                </td>
                <td className="md-type-col md-row-td" style={{ padding: '10px 14px' }}>
                  <TypeBadge type={p.type} />
                </td>
                <td className="md-row-td" style={{ padding: '10px 14px', textAlign: 'right' }}>
                  {p.population_2020 != null ? (
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: V.mono, color: V.text, whiteSpace: 'nowrap' }}>
                        {fmtPop(p.population_2020)}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: V.dim, fontFamily: V.mono }}>N/A</span>
                  )}
                </td>
                <td className="md-contact-col md-row-td" style={{ padding: '10px 14px' }}>
                  {p.contact_name ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#86EFAC', fontFamily: V.space, whiteSpace: 'nowrap' }}>{p.contact_name}</div>
                      {p.contact_title && <div style={{ fontSize: 10, color: V.dim, fontFamily: V.mono }}>{p.contact_title}</div>}
                    </div>
                  ) : (
 <span style={{ fontSize: 11, color: V.dim }}>·</span>
                  )}
                </td>
                <td className="md-phone-col md-row-td" style={{ padding: '10px 14px' }}>
                  {(p.contact_phone || p.contact_email) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {p.contact_phone && (
                        <a href={`tel:${p.contact_phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#93C5FD', textDecoration: 'none', fontFamily: V.mono, whiteSpace: 'nowrap' }}>
                          {p.contact_phone}
                        </a>
                      )}
                      {p.contact_email && (
                        <a href={`mailto:${p.contact_email}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#93C5FD', textDecoration: 'none', fontFamily: V.mono, whiteSpace: 'nowrap' }}>
                          {p.contact_email}
                        </a>
                      )}
                    </div>
                  ) : (
 <span style={{ fontSize: 11, color: V.dim }}>·</span>
                  )}
                </td>
                <td className="md-area-col md-row-td" style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 13, fontFamily: V.mono, color: V.muted }}>
 {p.land_area_sqmi ? p.land_area_sqmi.toFixed(1) + ' mi²' : '·'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '16px 20px 24px',
          borderTop: `1px solid ${V.border}`,
        }}>
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            style={{
              background: 'none', border: `1px solid ${V.border}`, color: V.muted,
              borderRadius: 5, padding: '6px 10px', fontSize: 12,
              fontFamily: V.mono, cursor: page === 1 ? 'default' : 'pointer',
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            «
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: 'none', border: `1px solid ${V.border}`, color: V.muted,
              borderRadius: 5, padding: '6px 12px', fontSize: 12,
              fontFamily: V.mono, cursor: page === 1 ? 'default' : 'pointer',
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            ‹ Prev
          </button>

          {/* Page numbers */}
          {(() => {
            const pages = [];
            const start = Math.max(1, page - 2);
            const end   = Math.min(totalPages, page + 2);
            if (start > 1) {
              pages.push(1);
              if (start > 2) pages.push('...');
            }
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages) {
              if (end < totalPages - 1) pages.push('...');
              pages.push(totalPages);
            }
            return pages.map((p, i) => (
              p === '...' ? (
                <span key={`el-${i}`} style={{ color: V.dim, padding: '0 4px', fontSize: 12, fontFamily: V.mono }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: page === p ? V.orange : 'none',
                    border: `1px solid ${page === p ? V.orange : V.border}`,
                    color: page === p ? '#fff' : V.muted,
                    borderRadius: 5, padding: '6px 10px', fontSize: 12,
                    fontFamily: V.mono, cursor: 'pointer', minWidth: 34,
                    fontWeight: page === p ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              )
            ));
          })()}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: 'none', border: `1px solid ${V.border}`, color: V.muted,
              borderRadius: 5, padding: '6px 12px', fontSize: 12,
              fontFamily: V.mono, cursor: page === totalPages ? 'default' : 'pointer',
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            Next ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            style={{
              background: 'none', border: `1px solid ${V.border}`, color: V.muted,
              borderRadius: 5, padding: '6px 10px', fontSize: 12,
              fontFamily: V.mono, cursor: page === totalPages ? 'default' : 'pointer',
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            »
          </button>

          <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, marginLeft: 8 }}>
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
          </span>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${V.border}`, padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
          Source: 2024 Census Bureau Gazetteer · Population: 2020 US Decennial Census
        </span>
        <a
          href="/"
          style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textDecoration: 'none' }}
        >
          aheadofmarket.com
        </a>
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────────────── */}
      <DetailModal place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}