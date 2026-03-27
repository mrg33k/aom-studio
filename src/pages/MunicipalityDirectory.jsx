import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ── constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'village', label: 'Village' },
  { value: 'borough', label: 'Borough' },
];

const POP_RANGES = [
  { value: '', label: 'Any Population' },
  { value: '0-5000', label: 'Under 5,000' },
  { value: '5000-25000', label: '5K – 25K' },
  { value: '25000-100000', label: '25K – 100K' },
  { value: '100000-500000', label: '100K – 500K' },
  { value: '500000+', label: '500K+' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'population-desc', label: 'Population (High-Low)' },
  { value: 'population-asc', label: 'Population (Low-High)' },
  { value: 'state-asc', label: 'State A-Z' },
];

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtPop(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtPopFull(n) {
  if (!n && n !== 0) return 'N/A';
  return n.toLocaleString();
}

function fmtArea(sqmi) {
  if (!sqmi) return '—';
  return sqmi.toFixed(1) + ' sq mi';
}

function popInRange(pop, range) {
  if (!range) return true;
  if (!pop) return false;
  if (range === '500000+') return pop >= 500_000;
  const [lo, hi] = range.split('-').map(Number);
  return pop >= lo && pop < hi;
}

function typeLabel(t) {
  if (!t) return '—';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function exportCSV(rows) {
  const headers = ['Name', 'State', 'Type', 'Population', 'Land Area (sq mi)', 'Latitude', 'Longitude', 'Status'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      `"${r.name}"`,
      r.state_abbr,
      r.type,
      r.population_2020 ?? '',
      r.land_area_sqmi ?? '',
      r.latitude ?? '',
      r.longitude ?? '',
      r.status ?? '',
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'arsenal-municipalities.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#F9FAFB', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4, fontFamily: 'Space Grotesk, sans-serif' }}>{sub}</div>}
    </div>
  );
}

function TypeBadge({ type }) {
  const colors = {
    city: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
    town: { bg: 'rgba(16,185,129,0.15)', color: '#34D399', border: 'rgba(16,185,129,0.3)' },
    village: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
    borough: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: 'rgba(245,158,11,0.3)' },
  };
  const c = colors[type] || { bg: 'rgba(107,114,128,0.15)', color: '#9CA3AF', border: 'rgba(107,114,128,0.3)' };
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 4,
      padding: '2px 7px',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'Space Grotesk, sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {type || 'other'}
    </span>
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#111827',
        color: '#F9FAFB',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 14,
        fontFamily: 'Space Grotesk, sans-serif',
        cursor: 'pointer',
        outline: 'none',
        ...style,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DetailModal({ place, onClose }) {
  if (!place) return null;
  const mapUrl = `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0F172A',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '32px',
          maxWidth: 520,
          width: '100%',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: 6,
            color: '#9CA3AF', cursor: 'pointer',
            padding: '4px 10px', fontSize: 18, lineHeight: 1,
          }}
        >
          &times;
        </button>

        <div style={{ marginBottom: 8 }}>
          <TypeBadge type={place.type} />
        </div>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 26, color: '#F9FAFB', marginBottom: 4, lineHeight: 1.2,
        }}>
          {place.name}
        </h2>
        <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, color: '#6B7280', marginBottom: 24 }}>
          {place.state_name}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Population (2020)', value: fmtPopFull(place.population_2020) },
            { label: 'Land Area', value: fmtArea(place.land_area_sqmi) },
            { label: 'State', value: `${place.state_name} (${place.state_abbr})` },
            { label: 'Status', value: place.status || '—' },
            { label: 'Latitude', value: place.latitude?.toFixed(5) || '—' },
            { label: 'Longitude', value: place.longitude?.toFixed(5) || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#F9FAFB', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
            </div>
          ))}
        </div>

        {place.latitude && place.longitude && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#E85D26',
              color: '#fff',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700, fontSize: 14,
              padding: '10px 20px',
              borderRadius: 6,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            View on Map
          </a>
        )}
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function MunicipalityDirectory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [popRange, setPopRange] = useState('');
  const [sortBy, setSortBy] = useState('population-desc');
  const [page, setPage] = useState(1);

  // detail
  const [selectedPlace, setSelectedPlace] = useState(null);

  const searchRef = useRef(null);

  // load data
  useEffect(() => {
    setLoading(true);
    fetch('/arsenal-municipality-data.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const places = data?.places || [];
  const metadata = data?.metadata || {};

  // unique states for dropdown
  const stateOptions = useMemo(() => {
    const states = [...new Set(places.map(p => p.state_name))].sort();
    return [{ value: '', label: 'All States' }, ...states.map(s => ({ value: s, label: s }))];
  }, [places]);

  // filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = places.filter(p => {
      if (q) {
        const match = p.name.toLowerCase().includes(q)
          || p.state_name?.toLowerCase().includes(q)
          || p.state_abbr?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (stateFilter && p.state_name !== stateFilter) return false;
      if (typeFilter) {
        const t = p.type || '';
        if (typeFilter === 'city' && t !== 'city' && t !== 'city and borough') return false;
        else if (typeFilter !== 'city' && t !== typeFilter) return false;
      }
      if (!popInRange(p.population_2020, popRange)) return false;
      return true;
    });

    const [field, dir] = sortBy.split('-');
    result.sort((a, b) => {
      if (field === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return dir === 'asc' ? cmp : -cmp;
      }
      if (field === 'population') {
        const pa = a.population_2020 || 0;
        const pb = b.population_2020 || 0;
        return dir === 'desc' ? pb - pa : pa - pb;
      }
      if (field === 'state') {
        const cmp = (a.state_name || '').localeCompare(b.state_name || '');
        return dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });

    return result;
  }, [places, search, stateFilter, typeFilter, popRange, sortBy]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [search, stateFilter, typeFilter, popRange, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // stats
  const stats = useMemo(() => {
    if (!places.length) return {};
    const withPop = places.filter(p => p.population_2020);
    const totalPop = withPop.reduce((s, p) => s + p.population_2020, 0);
    const typeBreakdown = metadata.type_breakdown || {};
    const stateCount = Object.keys(metadata.records_by_state || {}).length;
    return { totalPop, stateCount, typeBreakdown };
  }, [places, metadata]);

  const handleReset = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setTypeFilter('');
    setPopRange('');
    setSortBy('population-desc');
    setPage(1);
  }, []);

  const hasFilters = search || stateFilter || typeFilter || popRange;

  // ── styles ───────────────────────────────────────────────────────────────────

  const containerStyle = {
    minHeight: '100vh',
    background: '#060B14',
    color: '#F9FAFB',
    fontFamily: 'Space Grotesk, system-ui, sans-serif',
  };

  const maxWidth = { maxWidth: 1400, margin: '0 auto', padding: '0 20px' };

  // ── render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(232,93,38,0.2)',
          borderTop: '3px solid #E85D26',
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', fontSize: 16 }}>Loading 19,475 municipalities...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#EF4444' }}>
        <p style={{ fontSize: 18, marginBottom: 8 }}>Failed to load directory data.</p>
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, #0A1628 0%, #060B14 100%)',
      }}>
        <div style={{ ...maxWidth, padding: '40px 20px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  background: '#E85D26',
                  color: '#fff',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 4,
                }}>
                  Arsenal GPA
                </div>
                <span style={{ color: '#374151', fontSize: 13 }}>aheadofmarket.com</span>
              </div>
              <h1 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(28px, 5vw, 48px)',
                color: '#F9FAFB',
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}>
                US Municipality Directory
              </h1>
              <p style={{ color: '#6B7280', fontSize: 16, marginTop: 8, marginBottom: 0 }}>
                {places.length.toLocaleString()} incorporated cities, towns, and villages. 2020 Census data.
              </p>
            </div>
            <button
              onClick={() => exportCSV(filtered)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#E85D26',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#D14E1C'}
              onMouseLeave={e => e.currentTarget.style.background = '#E85D26'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV {hasFilters ? `(${filtered.length.toLocaleString()})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ ...maxWidth, padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Total Municipalities" value={metadata.total_records?.toLocaleString() || places.length.toLocaleString()} sub="All 49 states" />
          <StatCard label="Cities" value={metadata.type_breakdown?.city?.toLocaleString() || '—'} sub="Incorporated cities" />
          <StatCard label="Towns" value={metadata.type_breakdown?.town?.toLocaleString() || '—'} sub="Incorporated towns" />
          <StatCard label="Villages" value={metadata.type_breakdown?.village?.toLocaleString() || '—'} sub="Incorporated villages" />
          <StatCard label="Boroughs" value={metadata.type_breakdown?.borough?.toLocaleString() || '—'} sub="Incorporated boroughs" />
          <StatCard label="States Covered" value={stats.stateCount || 49} sub="Census Bureau data" />
        </div>
      </div>

      {/* Filters */}
      <div style={{
        ...maxWidth,
        padding: '0 20px 20px',
      }}>
        <div style={{
          background: '#0D1520',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            {/* Search */}
            <div style={{ flex: '1 1 280px', minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="City name, state..."
                  style={{
                    width: '100%',
                    background: '#111827',
                    color: '#F9FAFB',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    padding: '8px 12px 8px 38px',
                    fontSize: 15,
                    fontFamily: 'Space Grotesk, sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18, padding: 2,
                    }}
                  >&times;</button>
                )}
              </div>
            </div>

            {/* State */}
            <div style={{ flex: '0 1 180px', minWidth: 150 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                State
              </label>
              <Select value={stateFilter} onChange={setStateFilter} options={stateOptions} style={{ width: '100%' }} />
            </div>

            {/* Type */}
            <div style={{ flex: '0 1 160px', minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Type
              </label>
              <Select value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} style={{ width: '100%' }} />
            </div>

            {/* Population */}
            <div style={{ flex: '0 1 180px', minWidth: 150 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Population
              </label>
              <Select value={popRange} onChange={setPopRange} options={POP_RANGES} style={{ width: '100%' }} />
            </div>

            {/* Sort */}
            <div style={{ flex: '0 1 200px', minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Sort By
              </label>
              <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} style={{ width: '100%' }} />
            </div>

            {/* Reset */}
            {hasFilters && (
              <button
                onClick={handleReset}
                style={{
                  alignSelf: 'flex-end',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#9CA3AF',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontFamily: 'Space Grotesk, sans-serif',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results summary */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#9CA3AF', fontSize: 14 }}>
              <span style={{ color: '#F9FAFB', fontWeight: 600 }}>{filtered.length.toLocaleString()}</span>
              {' '}results
              {hasFilters && <span style={{ color: '#6B7280' }}> (filtered from {places.length.toLocaleString()})</span>}
            </span>
            {hasFilters && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stateFilter && <FilterTag label={stateFilter} onRemove={() => setStateFilter('')} />}
                {typeFilter && <FilterTag label={typeFilter} onRemove={() => setTypeFilter('')} />}
                {popRange && <FilterTag label={POP_RANGES.find(r => r.value === popRange)?.label || popRange} onRemove={() => setPopRange('')} />}
                {search && <FilterTag label={`"${search}"`} onRemove={() => setSearch('')} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...maxWidth, padding: '0 20px 40px' }}>
        <div style={{
          background: '#0D1520',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 100px 110px 120px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: '#0A1220',
          }}>
            {['Municipality', 'State', 'Type', 'Population', 'Land Area'].map((h, i) => (
              <div key={h} style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#4B5563',
                fontFamily: 'Space Grotesk, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                textAlign: i >= 3 ? 'right' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {pageRows.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280', fontSize: 16 }}>
              No municipalities match your filters.
            </div>
          ) : (
            pageRows.map((place, idx) => (
              <TableRow
                key={place.geoid}
                place={place}
                idx={(page - 1) * PAGE_SIZE + idx}
                onClick={() => setSelectedPlace(place)}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPlace && (
        <DetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}

      {/* Footer */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 20px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#374151', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>
          Data source: 2024 Census Bureau National Gazetteer + 2020 Decennial Census. Built by AOM for Arsenal GPA.
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #4B5563; }
        select option { background: #111827; color: #F9FAFB; }
        @media (max-width: 640px) {
          .dir-table-row { grid-template-columns: 1fr 60px 80px !important; }
          .dir-col-area, .dir-col-type { display: none; }
        }
      `}</style>
    </div>
  );
}

// ── TableRow ───────────────────────────────────────────────────────────────────

function TableRow({ place, idx, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 100px 110px 120px',
        padding: '13px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        background: hovered ? 'rgba(232,93,38,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'),
        transition: 'background 0.15s',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: hovered ? '#E85D26' : '#F9FAFB',
          fontFamily: 'Space Grotesk, sans-serif',
          transition: 'color 0.15s',
        }}>
          {place.name}
        </div>
      </div>
      <div style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif' }}>
        {place.state_abbr}
      </div>
      <div>
        <TypeBadge type={place.type} />
      </div>
      <div style={{
        fontSize: 14,
        color: '#9CA3AF',
        fontFamily: 'JetBrains Mono, monospace',
        textAlign: 'right',
        letterSpacing: '-0.02em',
      }}>
        {fmtPop(place.population_2020)}
      </div>
      <div style={{
        fontSize: 14,
        color: '#6B7280',
        fontFamily: 'JetBrains Mono, monospace',
        textAlign: 'right',
        letterSpacing: '-0.02em',
      }}>
        {fmtArea(place.land_area_sqmi)}
      </div>
    </div>
  );
}

// ── FilterTag ──────────────────────────────────────────────────────────────────

function FilterTag({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(232,93,38,0.12)',
      border: '1px solid rgba(232,93,38,0.25)',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      color: '#F0A882',
      fontFamily: 'Space Grotesk, sans-serif',
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F0A882', padding: 0, fontSize: 14, lineHeight: 1 }}
      >&times;</button>
    </span>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, setPage, total }) {
  const pageNums = useMemo(() => {
    const pages = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      flexWrap: 'wrap', gap: 12,
    }}>
      <span style={{ color: '#6B7280', fontSize: 14, fontFamily: 'Space Grotesk, sans-serif' }}>
        Page {page} of {totalPages} &mdash; {total.toLocaleString()} results
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <PagBtn label="Prev" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
        {page > 3 && <><PagBtn label="1" onClick={() => setPage(1)} /><span style={{ color: '#374151', padding: '0 4px' }}>...</span></>}
        {pageNums.map(n => (
          <PagBtn key={n} label={String(n)} active={n === page} onClick={() => setPage(n)} />
        ))}
        {page < totalPages - 2 && <><span style={{ color: '#374151', padding: '0 4px' }}>...</span><PagBtn label={String(totalPages)} onClick={() => setPage(totalPages)} /></>}
        <PagBtn label="Next" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
      </div>
    </div>
  );
}

function PagBtn({ label, onClick, disabled, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? '#E85D26' : (hovered && !disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'),
        color: active ? '#fff' : (disabled ? '#374151' : '#9CA3AF'),
        border: `1px solid ${active ? '#E85D26' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 13,
        fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
