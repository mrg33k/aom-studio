import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingNav } from './SourcingMarketplace.jsx';
import { SourcingThemeProvider, useSourcingTheme, getTokens } from './SourcingTheme.jsx';

// ─── Scout Answer Card (streaming AI response) ───────────────────────────────
function ScoutAnswerCard({ text, streaming, V }) {
  if (!text && !streaming) return null;
  return (
    <div style={{
      background: 'rgba(16,185,129,0.07)',
      border: `1px solid rgba(16,185,129,0.3)`,
      borderRadius: 10,
      padding: '14px 18px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: text ? 10 : 0 }}>
        <div style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 5, padding: '3px 8px',
          fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
          color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Scout · AI Answer
        </div>
        {streaming && (
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.3)', borderTop: '2px solid #10b981', animation: 'spin 0.8s linear infinite' }} />
        )}
      </div>
      {text && (
        <div style={{ fontSize: 13, color: V.text, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {text}
          {streaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: '#10b981', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse 1s ease-in-out infinite' }} />}
        </div>
      )}
    </div>
  );
}

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
function CompanyCard({ company, certs, V, tenantSlug }) {
  const [hovered, setHovered] = useState(false);
  const topCerts = (certs || []).slice(0, 3);

  return (
    <Link
      to={tenantSlug ? `/sourcing/${tenantSlug}/${company.slug}` : `/sourcing/${company.slug}`}
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

// ─── AI Summary Card ──────────────────────────────────────────────────────────
function AiSummaryCard({ aiResult, onSuggestionClick, V }) {
  if (!aiResult) return null;
  const { summary, filters_applied, suggestion } = aiResult;

  const filterChips = [];
  if (filters_applied.vertical) {
    const vInfo = VERTICALS.find(v => v.key === filters_applied.vertical);
    if (vInfo) filterChips.push({ label: vInfo.label, color: vInfo.color });
  }
  if (filters_applied.employee_range) {
    filterChips.push({ label: `${filters_applied.employee_range} employees`, color: V.blue });
  }
  if (filters_applied.certifications && filters_applied.certifications.length > 0) {
    filters_applied.certifications.forEach(c => {
      filterChips.push({ label: c, color: '#f59e0b' });
    });
  }
  if (filters_applied.location) {
    filterChips.push({ label: filters_applied.location, color: '#a78bfa' });
  }

  return (
    <div style={{
      background: 'rgba(16,185,129,0.07)',
      border: `1px solid rgba(16,185,129,0.3)`,
      borderRadius: 10,
      padding: '14px 18px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 5,
          padding: '3px 8px',
          fontSize: 10, fontWeight: 800, fontFamily: V.mono,
          color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Scout · AI Search
        </div>
        <div style={{
          marginLeft: 'auto',
          fontSize: 9, fontWeight: 700, fontFamily: V.mono,
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          powered by <span style={{ color: '#f97316', fontWeight: 800 }}>CORNER</span>
        </div>
        <div style={{ fontSize: 13, color: V.text, fontFamily: V.space, lineHeight: 1.4 }}>
          {summary}
        </div>
      </div>

      {filterChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: suggestion ? 8 : 0 }}>
          <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, alignSelf: 'center' }}>Filters:</span>
          {filterChips.map((chip, i) => (
            <span key={i} style={{
              background: `${chip.color}15`,
              border: `1px solid ${chip.color}40`,
              color: chip.color,
              fontSize: 11, fontFamily: V.mono, fontWeight: 600,
              padding: '2px 7px', borderRadius: 4,
            }}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {suggestion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          <span style={{ fontSize: 12, color: V.dim, fontFamily: V.space }}>
            {suggestion.startsWith('Try:') ? (
              <>
                Try:{' '}
                <button
                  onClick={() => onSuggestionClick(suggestion.replace(/^Try:\s*[""]?/, '').replace(/[""]$/, ''))}
                  style={{
                    background: 'none', border: 'none', color: '#10b981',
                    fontSize: 12, fontFamily: V.space, cursor: 'pointer',
                    textDecoration: 'underline', padding: 0,
                  }}
                >
                  {suggestion.replace(/^Try:\s*[""]?/, '').replace(/[""]$/, '')}
                </button>
              </>
            ) : suggestion}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
// EVERY search goes through Scout. No gate. No trigger words.
function SearchBar({ value, onChange, onSearch, loading, aiLoading, V }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') onSearch();
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Search: "space", "ITAR", "Intel", or "ITAR certified companies in Scottsdale"...'
            style={{
              width: '100%', boxSizing: 'border-box',
              background: V.card2,
              border: `1px solid ${value ? 'rgba(16,185,129,0.5)' : V.border}`,
              color: V.text, borderRadius: 8, padding: '12px 46px 12px 16px',
              fontSize: 14, fontFamily: V.space, outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <div style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            color: V.muted, pointerEvents: 'none',
          }}>
            {(loading || aiLoading) ? (
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
      {value && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#10b981', fontFamily: V.mono,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Scout is ready — understands any search
        </div>
      )}
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────
function SourcingDirectoryInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);
  const { tenantSlug } = useParams();

  // Tenant state
  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(!!tenantSlug);

  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [certs, setCerts] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [vertical, setVertical] = useState(searchParams.get('v') || 'all');
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  // For AI search results, we store companies separately so certs are already embedded
  const [aiCompanies, setAiCompanies] = useState(null);
  // Scout agent streaming answer (shown above the grid)
  const [scoutAnswer, setScoutAnswer] = useState('');
  const [scoutStreaming, setScoutStreaming] = useState(false);
  const scoutAbortRef = useRef(null);

  // Fetch tenant info
  useEffect(() => {
    if (!tenantSlug) { setTenantLoading(false); return; }
    async function loadTenant() {
      try {
        // Try API first
        try {
          const res = await fetch(`/api/sourcing/tenants?slug=${tenantSlug}`);
          if (res.ok) { setTenant(await res.json()); setTenantLoading(false); return; }
        } catch { /* fall through */ }
        // Direct Supabase
        if (supabase) {
          const { data } = await supabase.from('directory_tenants').select('*').eq('slug', tenantSlug).single();
          if (data) setTenant(data);
        }
      } catch (err) { console.error('Tenant fetch error:', err); }
      finally { setTenantLoading(false); }
    }
    loadTenant();
  }, [tenantSlug]);

  const fetchCompanies = useCallback(async (q, v) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    try {
      let qb = supabase
        .from('directory_companies')
        .select('*')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('membership_tier', { ascending: true })
        .order('name', { ascending: true });

      // Scope to tenant if available
      if (tenant?.id) qb = qb.eq('tenant_id', tenant.id);

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
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    // Wait for tenant to load if we have a slug, then fetch
    if (tenantSlug && tenantLoading) return;
    if (aiCompanies === null) {
      fetchCompanies(query, vertical);
    }
  }, [query, vertical, fetchCompanies, aiCompanies, tenantLoading, tenantSlug]);

  // Call Scout agent via SSE and stream the text answer
  const callScoutAgent = useCallback(async (q) => {
    // Cancel any in-flight request
    if (scoutAbortRef.current) scoutAbortRef.current = false;
    const token = {};
    scoutAbortRef.current = token;

    setScoutAnswer('');
    setScoutStreaming(true);

    try {
      const res = await fetch('/api/sourcing/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, mode: 'scout', tenantId: tenant?.id || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (token !== scoutAbortRef.current) break; // aborted
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'text') {
              setScoutAnswer(prev => prev + event.text);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (token === scoutAbortRef.current) {
        setScoutAnswer(`Scout couldn't search right now. Results below are from the directory.`);
      }
    } finally {
      if (token === scoutAbortRef.current) setScoutStreaming(false);
    }
  }, []);

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) {
      // Clear all search state and reset
      setAiResult(null);
      setAiCompanies(null);
      setScoutAnswer('');
      setScoutStreaming(false);
      setQuery('');
      setSearchParams({});
      return;
    }

    const params = {};
    if (q) params.q = q;
    if (vertical !== 'all') params.v = vertical;
    setSearchParams(params);

    // Run Scout agent (streaming text answer) + standard grid in parallel
    setAiResult(null);
    setAiCompanies(null);
    callScoutAgent(q); // fire and forget -- streams into scoutAnswer
    setQuery(q);
    fetchCompanies(q, vertical);
  };

  const handleSuggestionClick = (suggestionQuery) => {
    setSearchInput(suggestionQuery);
    setTimeout(() => {
      const q = suggestionQuery.trim();
      setAiResult(null);
      setAiCompanies(null);
      callScoutAgent(q);
      setQuery(q);
      fetchCompanies(q, vertical);
    }, 0);
  };

  const handleVerticalChange = (v) => {
    // Clear AI state when changing vertical
    setAiResult(null);
    setAiCompanies(null);
    setVertical(v);
    const params = {};
    if (searchInput) params.q = searchInput;
    if (v !== 'all') params.v = v;
    setSearchParams(params);
    setScoutAnswer('');
    setScoutStreaming(false);
  };

  const filteredCompanies = useMemo(() => {
    // Use AI results if available, otherwise use standard fetch results
    const source = aiCompanies !== null ? aiCompanies : companies;
    if (selectedCerts.length === 0) return source;
    return source.filter(c => {
      const companyCerts = (certs[c.id] || []).map(cert => cert.cert_name);
      return selectedCerts.every(sc => companyCerts.includes(sc));
    });
  }, [companies, aiCompanies, certs, selectedCerts]);

  const availableCerts = VERTICAL_CERTS[vertical] || [];

  const toggleCert = (cert) => {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text, overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: ${V.dim}; }
        input:focus { border-color: ${V.accent} !important; box-shadow: 0 0 0 2px ${V.accentDim}; }
      `}</style>

      <SourcingNav
        active="directory"
        tenantSlug={tenantSlug}
        tenantName={tenant?.nav_label || tenant?.name}
        features={tenant?.features}
        brandColor={tenant?.brand_color}
      />

      {/* Hero */}
      <div style={{ padding: '52px 24px 36px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: tenant?.brand_color || V.accent,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          {tenant ? (tenant.nav_label || tenant.name) : 'sourcing.directory — Arizona'}
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, fontFamily: V.syne,
          color: V.heading, lineHeight: 1.15, margin: '0 0 14px',
        }}>
          {tenant ? tenant.name : 'Find Certified Suppliers & Partners'}
        </h1>
        <p style={{
          fontSize: 16, color: V.muted, fontFamily: V.space,
          maxWidth: 580, margin: '0 auto 32px', lineHeight: 1.6,
        }}>
          {tenant?.hero_text || "Arizona's semiconductor, space, and advanced industry directory. Verified companies, certifications, and capabilities in one place."}
        </p>

        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          loading={loading}
          aiLoading={aiLoading}
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
        {/* Scout AI Answer Card -- streaming text response above the grid */}
        <ScoutAnswerCard text={scoutAnswer} streaming={scoutStreaming} V={V} />

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
            to={tenantSlug ? `/sourcing/${tenantSlug}/signup` : '/sourcing/signup'}
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

        {fetchError && (
          <div style={{
            background: V.card, border: `1px solid ${V.border}`,
            borderRadius: 8, padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
              No listings yet
            </div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 13 }}>
              The directory is coming soon. Check back shortly.
            </div>
          </div>
        )}

        {(loading && supabase && !fetchError && !aiLoading) && (
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
                tenantSlug={tenantSlug}
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
              to={tenantSlug ? `/sourcing/${tenantSlug}/signup` : '/sourcing/signup'}
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
