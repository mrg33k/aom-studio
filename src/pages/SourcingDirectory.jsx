import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingNav } from './SourcingMarketplace.jsx';
import { SourcingThemeProvider, useSourcingTheme, getTokens } from './SourcingTheme.jsx';

// ─── Vertical config ──────────────────────────────────────────────────────────
const VERTICALS = [
  { key: 'all',           label: 'All Industries',  color: '#9ca3af' },
  { key: 'semiconductor', label: 'Semiconductor',    color: '#29B6F6' },
  { key: 'space',         label: 'Space & Aerospace',color: '#7C3AED' },
  { key: 'biotech',       label: 'Biotech',          color: '#22C55E' },
  { key: 'defense',       label: 'Defense',          color: '#EF4444' },
];

const VERTICAL_CERTS = {
  semiconductor: ['ISO 9001', 'ISO 14001', 'ISO 45001', 'ITAR Registered', 'AS9100D', 'ANSI/ESD S20.20', 'AEC-Q100', 'IPC-7711/7721'],
  space:         ['AS9100D', 'AS9120B', 'ITAR Registered', 'ISO 9001', 'MIL-STD-810', 'NADCAP', 'FAA FAR Part 145', 'DoD Secret Cleared'],
  biotech:       ['ISO 13485', 'ISO 9001', 'cGMP', 'FDA 21 CFR Part 820', 'ISO 14155', 'CE Marked', 'ICH Q10'],
  defense:       ['ITAR Registered', 'ISO 9001', 'AS9100D', 'CMMC Level 2', 'MIL-STD-810', 'DoD Secret Cleared', 'NIST 800-171'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function verticalColor(v) {
  return VERTICALS.find(x => x.key === v)?.color || '#9ca3af';
}

function VerticalBadge({ vertical, V }) {
  const color = verticalColor(vertical);
  const label = VERTICALS.find(x => x.key === vertical)?.label || vertical;
  return (
    <span style={{
      background: `${color}18`,
      border: `1px solid ${color}50`,
      color,
      fontSize: 10, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function TierBadge({ tier, V }) {
  const colors = {
    enterprise: { bg: `${V.accent}18`, border: V.accent, text: V.accent },
    pro:        { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: '#93C5FD' },
    basic:      { bg: 'rgba(34,197,94,0.12)', border: '#22C55E', text: '#86EFAC' },
    free:       { bg: 'rgba(138,132,124,0.1)', border: '#8A847C', text: '#8A847C' },
  };
  const c = colors[tier] || colors.free;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: 10, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {tier}
    </span>
  );
}

function CertPill({ name, V }) {
  return (
    <span style={{
      background: V.accentDim,
      border: `1px solid ${V.accentBrd}`,
      color: V.muted, fontSize: 11, fontFamily: V.mono,
      padding: '2px 8px', borderRadius: 4,
    }}>
      {name}
    </span>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────
function CompanyCard({ company, certs, V }) {
  const [hovered, setHovered] = useState(false);
  const topCerts = (certs || []).slice(0, 3);

  return (
    <Link
      to={`/sourcing/${company.slug}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background: hovered ? V.cardHov : V.card,
        border: `1px solid ${hovered ? V.borderHov : V.border}`,
        borderRadius: 10,
        padding: '18px 20px',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: hovered ? `0 0 0 1px ${V.accent}20` : 'none',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: V.card2, flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: `${verticalColor(company.vertical)}20`,
              border: `1px solid ${verticalColor(company.vertical)}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, fontFamily: V.syne,
              color: verticalColor(company.vertical), flexShrink: 0,
            }}>
              {company.name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, fontFamily: V.syne,
              color: V.text, lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {company.name}
            </div>
            <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginTop: 2 }}>
              {[company.city, company.state].filter(Boolean).join(', ')}
              {company.year_founded && ` · Est. ${company.year_founded}`}
            </div>
          </div>
          {company.featured && (
            <div style={{
              background: V.accentDim, border: `1px solid ${V.accentBrd}`,
              color: V.accent, fontSize: 9, fontWeight: 700, fontFamily: V.mono,
              padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase',
              letterSpacing: '0.1em', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Featured
            </div>
          )}
        </div>

        {/* Description */}
        {company.description && (
          <div style={{
            fontSize: 13, color: V.muted, fontFamily: V.space,
            lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {company.description}
          </div>
        )}

        {/* Certs */}
        {topCerts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {topCerts.map(c => <CertPill key={c.id} name={c.cert_name} V={V} />)}
            {certs.length > 3 && (
              <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, alignSelf: 'center' }}>
                +{certs.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <VerticalBadge vertical={company.vertical} V={V} />
          <TierBadge tier={company.membership_tier} V={V} />
          {company.employee_count && (
            <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
              {company.employee_count} employees
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onSearch, loading, V }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') onSearch();
  };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Search companies, certifications, capabilities...'
          style={{
            width: '100%', boxSizing: 'border-box',
            background: V.card2, border: `1px solid ${V.border}`,
            color: V.text, borderRadius: 8, padding: '12px 46px 12px 16px',
            fontSize: 14, fontFamily: V.space, outline: 'none',
          }}
        />
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          color: V.muted, pointerEvents: 'none',
        }}>
          {loading ? (
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.accent}`, animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
        </div>
      </div>
      <button
        onClick={onSearch}
        style={{
          background: V.accent, border: 'none', color: '#fff',
          borderRadius: 8, padding: '0 20px', fontSize: 14,
          fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Search
      </button>
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────
function SourcingDirectoryInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);

  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [certs, setCerts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [vertical, setVertical] = useState(searchParams.get('v') || 'all');
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchCompanies = useCallback(async (q, v) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      let qb = supabase
        .from('directory_companies')
        .select('*')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('membership_tier', { ascending: true })
        .order('name', { ascending: true });

      if (v && v !== 'all') qb = qb.eq('vertical', v);
      if (q && q.trim()) {
        qb = qb.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: companies, error } = await qb.limit(100);
      if (error) throw error;

      setCompanies(companies || []);

      if (companies && companies.length > 0) {
        const ids = companies.map(c => c.id);
        const { data: certsData } = await supabase
          .from('directory_certifications')
          .select('*')
          .in('company_id', ids);

        const certsMap = {};
        (certsData || []).forEach(cert => {
          if (!certsMap[cert.company_id]) certsMap[cert.company_id] = [];
          certsMap[cert.company_id].push(cert);
        });
        setCerts(certsMap);
      } else {
        setCerts({});
      }
    } catch (err) {
      console.error('Sourcing directory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies(query, vertical);
  }, [query, vertical, fetchCompanies]);

  const handleSearch = () => {
    const q = searchInput.trim();
    setQuery(q);
    const params = {};
    if (q) params.q = q;
    if (vertical !== 'all') params.v = vertical;
    setSearchParams(params);
  };

  const handleVerticalChange = (v) => {
    setVertical(v);
    const params = {};
    if (query) params.q = query;
    if (v !== 'all') params.v = v;
    setSearchParams(params);
  };

  const filteredCompanies = useMemo(() => {
    if (selectedCerts.length === 0) return companies;
    return companies.filter(c => {
      const companyCerts = (certs[c.id] || []).map(cert => cert.cert_name);
      return selectedCerts.every(sc => companyCerts.includes(sc));
    });
  }, [companies, certs, selectedCerts]);

  const availableCerts = VERTICAL_CERTS[vertical] || [];

  const toggleCert = (cert) => {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: ${V.dim}; }
        input:focus { border-color: ${V.accent} !important; box-shadow: 0 0 0 2px ${V.accentDim}; }
      `}</style>

      <SourcingNav active="directory" />

      {/* Hero */}
      <div style={{ padding: '52px 24px 36px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.accent,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          sourcing.directory — Arizona
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, fontFamily: V.syne,
          color: V.heading, lineHeight: 1.15, margin: '0 0 14px',
        }}>
          Find Certified Suppliers & Partners
        </h1>
        <p style={{
          fontSize: 16, color: V.muted, fontFamily: V.space,
          maxWidth: 580, margin: '0 auto 32px', lineHeight: 1.6,
        }}>
          Arizona's semiconductor, space, and advanced industry directory. Verified companies, certifications, and capabilities in one place.
        </p>

        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          loading={loading}
          V={V}
        />
      </div>

      {/* Vertical Tabs */}
      <div style={{
        padding: '0 24px 0', maxWidth: 900, margin: '0 auto',
        display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        {VERTICALS.map(v => (
          <button
            key={v.key}
            onClick={() => handleVerticalChange(v.key)}
            style={{
              background: vertical === v.key ? `${v.color}20` : 'transparent',
              border: `1px solid ${vertical === v.key ? v.color : V.border}`,
              color: vertical === v.key ? v.color : V.muted,
              borderRadius: 6, padding: '7px 14px', fontSize: 12,
              fontWeight: 600, fontFamily: V.space, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {v.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {availableCerts.length > 0 && (
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              background: showFilters ? V.accentDim : 'transparent',
              border: `1px solid ${showFilters ? V.accentBrd : V.border}`,
              color: showFilters ? V.accent : V.muted,
              borderRadius: 6, padding: '7px 14px', fontSize: 12,
              fontWeight: 600, fontFamily: V.space, cursor: 'pointer',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {selectedCerts.length > 0 && (
              <span style={{
                background: V.accent, color: '#fff', borderRadius: 10,
                fontSize: 9, fontWeight: 800, padding: '1px 5px',
              }}>
                {selectedCerts.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Cert Filters */}
      {showFilters && availableCerts.length > 0 && (
        <div style={{ padding: '14px 24px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            background: V.card, border: `1px solid ${V.border}`,
            borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: V.muted, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700 }}>
              Filter by Certification
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableCerts.map(cert => (
                <button
                  key={cert}
                  onClick={() => toggleCert(cert)}
                  style={{
                    background: selectedCerts.includes(cert) ? V.accentDim : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedCerts.includes(cert) ? V.accentBrd : V.border}`,
                    color: selectedCerts.includes(cert) ? V.accent : V.muted,
                    borderRadius: 4, padding: '5px 10px', fontSize: 11,
                    fontFamily: V.mono, cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {selectedCerts.includes(cert) && '✓ '}{cert}
                </button>
              ))}
            </div>
            {selectedCerts.length > 0 && (
              <button
                onClick={() => setSelectedCerts([])}
                style={{
                  marginTop: 10, background: 'none', border: 'none',
                  color: V.accent, fontSize: 12, fontFamily: V.space,
                  cursor: 'pointer', padding: 0,
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div style={{ padding: '20px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: V.muted, fontFamily: V.space }}>
            {loading ? 'Searching...' : (
              <>
                <span style={{ color: V.text, fontWeight: 600 }}>{filteredCompanies.length}</span>
                {' '}compan{filteredCompanies.length === 1 ? 'y' : 'ies'} found
                {query && <> for <span style={{ color: V.accent }}>"{query}"</span></>}
              </>
            )}
          </div>
          <Link
            to="/sourcing/signup"
            style={{
              fontSize: 12, color: V.muted, fontFamily: V.space,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add your company
          </Link>
        </div>

        {!supabase && (
          <div style={{
            background: V.accentDim, border: `1px solid ${V.accentBrd}`,
            borderRadius: 8, padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ color: V.accent, fontFamily: V.mono, fontSize: 13, marginBottom: 8 }}>
              Supabase not configured
            </div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 12 }}>
              Run the migration (migrations/001_sourcing_directory.sql) in the Supabase SQL editor to activate this directory.
            </div>
          </div>
        )}

        {loading && supabase && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                background: V.card, border: `1px solid ${V.border}`,
                borderRadius: 10, padding: '18px 20px', height: 160,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {!loading && filteredCompanies.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filteredCompanies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                certs={certs[company.id] || []}
                V={V}
              />
            ))}
          </div>
        )}

        {!loading && supabase && filteredCompanies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
              No companies found
            </div>
            <div style={{ fontSize: 14, color: V.muted, fontFamily: V.space, marginBottom: 24 }}>
              {query ? `No results for "${query}". Try different keywords.` : 'No companies in this vertical yet.'}
            </div>
            <Link
              to="/sourcing/signup"
              style={{
                background: V.accent, color: '#fff', textDecoration: 'none',
                borderRadius: 7, padding: '10px 20px', fontSize: 13,
                fontWeight: 700, fontFamily: V.space, display: 'inline-block',
              }}
            >
              Add Your Company
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function SourcingDirectory() {
  return (
    <SourcingThemeProvider>
      <SourcingDirectoryInner />
    </SourcingThemeProvider>
  );
}
