import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const V = {
  bg:        '#0C0C0C',
  card:      '#141412',
  card2:     '#1A1A17',
  cardHov:   '#1F1F1C',
  orange:    '#E85D26',
  blue:      '#3B82F6',
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

// ─── Vertical config ──────────────────────────────────────────────────────────
const VERTICALS = [
  { key: 'all',           label: 'All Industries',  color: V.muted },
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

const EMP_RANGES = ['1-10', '11-50', '51-200', '200-500', '500-2000', '2000+'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function verticalColor(v) {
  return VERTICALS.find(x => x.key === v)?.color || V.muted;
}

function VerticalBadge({ vertical }) {
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

function TierBadge({ tier }) {
  const colors = {
    enterprise: { bg: 'rgba(232,93,38,0.12)', border: '#E85D26', text: '#FDBA74' },
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

function CertPill({ name }) {
  return (
    <span style={{
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${V.border}`,
      color: V.text, fontSize: 11, fontFamily: V.mono,
      padding: '2px 8px', borderRadius: 4,
    }}>
      {name}
    </span>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────
function CompanyCard({ company, certs }) {
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
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#1a1a17', flexShrink: 0 }}
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
              background: 'rgba(232,93,38,0.15)', border: '1px solid rgba(232,93,38,0.4)',
              color: '#E85D26', fontSize: 9, fontWeight: 700, fontFamily: V.mono,
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
            {topCerts.map(c => <CertPill key={c.id} name={c.cert_name} />)}
            {certs.length > 3 && (
              <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, alignSelf: 'center' }}>
                +{certs.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <VerticalBadge vertical={company.vertical} />
          <TierBadge tier={company.membership_tier} />
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
function SearchBar({ value, onChange, onSearch, loading }) {
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
          placeholder='Search companies, certifications, capabilities... (e.g. "ISO certified PCB manufacturer Phoenix")'
          style={{
            width: '100%', boxSizing: 'border-box',
            background: V.card2, border: `1px solid ${V.borderHov}`,
            color: V.text, borderRadius: 8, padding: '12px 46px 12px 16px',
            fontSize: 14, fontFamily: V.space, outline: 'none',
          }}
        />
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          color: V.muted, pointerEvents: 'none',
        }}>
          {loading ? (
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.orange}`, animation: 'spin 0.8s linear infinite' }} />
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
          background: V.orange, border: 'none', color: '#fff',
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SourcingDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [certs, setCerts] = useState({});  // { company_id: [cert, ...] }
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [vertical, setVertical] = useState(searchParams.get('v') || 'all');
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch companies and their certs
  const fetchCompanies = useCallback(async (q, v) => {
    if (!supabase) {
      // Dev fallback: empty state
      setLoading(false);
      return;
    }
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
        // Full-text search on name + description
        qb = qb.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: companies, error } = await qb.limit(100);
      if (error) throw error;

      setCompanies(companies || []);

      // Fetch certs for all returned companies
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

  // Client-side cert filter
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
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: #4A4540; }
        input:focus { border-color: rgba(232,93,38,0.5) !important; box-shadow: 0 0 0 2px rgba(232,93,38,0.1); }
      `}</style>

      {/* Nav */}
      <div style={{
        borderBottom: `1px solid ${V.border}`,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 20, height: 60,
        background: '#0A0A0A',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: V.syne, color: V.orange, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            AOM
          </span>
        </Link>
        <span style={{ color: V.dim, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: V.text, fontFamily: V.space }}>Sourcing Directory</span>
        <div style={{ flex: 1 }} />
        <Link
          to="/sourcing/signup"
          style={{
            background: V.orange, color: '#fff', textDecoration: 'none',
            borderRadius: 6, padding: '6px 14px', fontSize: 12,
            fontWeight: 700, fontFamily: V.space,
          }}
        >
          List Your Company
        </Link>
      </div>

      {/* Hero */}
      <div style={{ padding: '52px 24px 36px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.orange,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          sourcing.directory — Arizona
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, fontFamily: V.syne,
          color: V.text, lineHeight: 1.15, margin: '0 0 14px',
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
        />
      </div>

      {/* Vertical Tabs */}
      <div style={{
        padding: '0 24px 0', maxWidth: 900, margin: '0 auto',
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 0,
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
              background: showFilters ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: `1px solid ${showFilters ? V.borderHov : V.border}`,
              color: showFilters ? V.text : V.muted,
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
                background: V.orange, color: '#fff', borderRadius: 10,
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
                    background: selectedCerts.includes(cert) ? 'rgba(232,93,38,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedCerts.includes(cert) ? 'rgba(232,93,38,0.5)' : V.border}`,
                    color: selectedCerts.includes(cert) ? '#FDBA74' : V.muted,
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
                  color: V.orange, fontSize: 12, fontFamily: V.space,
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
        {/* Count + query summary */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: V.muted, fontFamily: V.space }}>
            {loading ? 'Searching...' : (
              <>
                <span style={{ color: V.text, fontWeight: 600 }}>{filteredCompanies.length}</span>
                {' '}compan{filteredCompanies.length === 1 ? 'y' : 'ies'} found
                {query && <> for <span style={{ color: V.orange }}>"{query}"</span></>}
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

        {/* No supabase configured */}
        {!supabase && (
          <div style={{
            background: 'rgba(232,93,38,0.08)', border: '1px solid rgba(232,93,38,0.2)',
            borderRadius: 8, padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ color: V.orange, fontFamily: V.mono, fontSize: 13, marginBottom: 8 }}>
              Supabase not configured
            </div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 12 }}>
              Run the migration (migrations/001_sourcing_directory.sql) in the Supabase SQL editor to activate this directory.
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && supabase && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                background: V.card, border: `1px solid ${V.border}`,
                borderRadius: 10, padding: '18px 20px', height: 160,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <style>{`@keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && filteredCompanies.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filteredCompanies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                certs={certs[company.id] || []}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
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
                background: V.orange, color: '#fff', textDecoration: 'none',
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
