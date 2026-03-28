import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const VERTICALS = [
  { key: 'all',           label: 'All Industries',   color: V.muted },
  { key: 'semiconductor', label: 'Semiconductor',     color: '#29B6F6' },
  { key: 'space',         label: 'Space & Aerospace', color: '#7C3AED' },
  { key: 'biotech',       label: 'Biotech',           color: '#22C55E' },
  { key: 'defense',       label: 'Defense',           color: '#EF4444' },
];

const CONDITIONS = [
  { key: 'all',          label: 'All Conditions' },
  { key: 'new',          label: 'New' },
  { key: 'used',         label: 'Used' },
  { key: 'refurbished',  label: 'Refurbished' },
];

const PRICE_RANGES = [
  { key: 'all',    label: 'Any Price',     min: null,   max: null },
  { key: 'under5', label: 'Under $5k',     min: null,   max: 5000 },
  { key: '5-25',   label: '$5k – $25k',    min: 5000,   max: 25000 },
  { key: '25-100', label: '$25k – $100k',  min: 25000,  max: 100000 },
  { key: 'over100',label: 'Over $100k',    min: 100000, max: null },
];

const CONDITION_COLORS = {
  new:          { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.4)',   text: '#86EFAC' },
  used:         { bg: 'rgba(138,132,124,0.1)', border: 'rgba(138,132,124,0.4)', text: '#8A847C' },
  refurbished:  { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.4)',  text: '#93C5FD' },
};

// ─── Sourcing Nav ─────────────────────────────────────────────────────────────
export function SourcingNav({ active }) {
  const tabs = [
    { key: 'directory',   label: 'Directory',    href: '/sourcing' },
    { key: 'marketplace', label: 'Marketplace',  href: '/sourcing/marketplace' },
    { key: 'jobs',        label: 'Jobs',         href: '/sourcing/jobs' },
    { key: 'events',      label: 'Events',       href: '/sourcing/events' },
  ];
  return (
    <div style={{
      borderBottom: `1px solid ${V.border}`,
      background: '#0A0A0A',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 56,
        borderBottom: `1px solid ${V.border}`,
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
      {/* Section tabs */}
      <div style={{ padding: '0 24px', display: 'flex', gap: 0 }}>
        {tabs.map(tab => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              to={tab.href}
              style={{
                textDecoration: 'none',
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: V.space,
                color: isActive ? V.orange : V.muted,
                borderBottom: isActive ? `2px solid ${V.orange}` : '2px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Condition Badge ──────────────────────────────────────────────────────────
function ConditionBadge({ condition }) {
  if (!condition) return null;
  const c = CONDITION_COLORS[condition] || CONDITION_COLORS.used;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: 10, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {condition}
    </span>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ listing, company, onClick }) {
  const [hovered, setHovered] = useState(false);
  const photos = Array.isArray(listing.photo_urls) ? listing.photo_urls : [];
  const hasPhoto = photos.length > 0 || listing.image_url;
  const photoSrc = photos[0] || listing.image_url;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? V.cardHov : V.card,
        border: `1px solid ${hovered ? V.borderHov : V.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Photo */}
      <div style={{
        width: '100%', height: 160,
        background: hasPhoto ? 'transparent' : V.card2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {hasPhoto ? (
          <img
            src={photoSrc}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontSize: 40, opacity: 0.3 }}>⚙️</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, fontFamily: V.syne,
          color: V.text, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {listing.title}
        </div>

        {listing.description && (
          <div style={{
            fontSize: 12, color: V.muted, fontFamily: V.space, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {listing.description}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <ConditionBadge condition={listing.condition} />
          {listing.price && (
            <span style={{ fontSize: 16, fontWeight: 800, color: V.green, fontFamily: V.mono }}>
              ${listing.price >= 1000 ? `${(listing.price / 1000).toFixed(listing.price % 1000 === 0 ? 0 : 1)}k` : listing.price.toLocaleString()}
            </span>
          )}
        </div>

        {company && (
          <div style={{ fontSize: 11, color: V.dim, fontFamily: V.space }}>
            {company.name} · {[company.city, company.state].filter(Boolean).join(', ')}
          </div>
        )}

        <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
          {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

// ─── Listing Detail Modal ─────────────────────────────────────────────────────
function ListingModal({ listing, company, onClose }) {
  const photos = Array.isArray(listing.photo_urls) ? listing.photo_urls : [];
  const hasPhoto = photos.length > 0 || listing.image_url;
  const photoSrc = photos[0] || listing.image_url;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: V.card, border: `1px solid ${V.border}`,
          borderRadius: 12, maxWidth: 640, width: '100%',
          maxHeight: '85vh', overflow: 'auto',
        }}
      >
        {hasPhoto && (
          <div style={{ width: '100%', height: 240, overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
            <img src={photoSrc} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: V.syne, color: V.text, margin: 0, lineHeight: 1.2 }}>
              {listing.title}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 20, flexShrink: 0, padding: 0 }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <ConditionBadge condition={listing.condition} />
            {listing.price && (
              <span style={{ fontSize: 22, fontWeight: 800, color: V.green, fontFamily: V.mono }}>
                ${listing.price.toLocaleString()}
              </span>
            )}
          </div>

          {listing.description && (
            <p style={{ fontSize: 14, color: V.muted, fontFamily: V.space, lineHeight: 1.7, margin: '0 0 20px' }}>
              {listing.description}
            </p>
          )}

          {company && (
            <div style={{
              background: V.card2, border: `1px solid ${V.border}`,
              borderRadius: 8, padding: '14px 16px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>
                Seller
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 2 }}>
                {company.name}
              </div>
              <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space }}>
                {[company.city, company.state].filter(Boolean).join(', ')}
              </div>
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: V.blue, fontFamily: V.space, textDecoration: 'none', display: 'block', marginTop: 4 }}>
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          )}

          {listing.contact_email && (
            <a
              href={`mailto:${listing.contact_email}?subject=Inquiry: ${encodeURIComponent(listing.title)}`}
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: V.orange, color: '#fff', textDecoration: 'none',
                borderRadius: 8, padding: '12px', fontSize: 14,
                fontWeight: 700, fontFamily: V.space, textAlign: 'center',
              }}
            >
              Contact Seller
            </a>
          )}

          <div style={{ marginTop: 12, fontSize: 11, color: V.dim, fontFamily: V.mono, textAlign: 'center' }}>
            Posted {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SourcingMarketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState('all');
  const [condition, setCondition] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchListings = useCallback(async (q, v, cond, price) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      let qb = supabase
        .from('directory_listings')
        .select('*')
        .eq('category', 'equipment')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (v && v !== 'all') qb = qb.eq('vertical', v);
      if (cond && cond !== 'all') qb = qb.eq('condition', cond);

      const pr = PRICE_RANGES.find(r => r.key === price);
      if (pr) {
        if (pr.min !== null) qb = qb.gte('price', pr.min);
        if (pr.max !== null) qb = qb.lte('price', pr.max);
      }

      if (q && q.trim()) {
        qb = qb.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await qb.limit(100);
      if (error) throw error;
      setListings(data || []);

      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(l => l.company_id))];
        const { data: compData } = await supabase
          .from('directory_companies')
          .select('*')
          .in('id', companyIds);
        const map = {};
        (compData || []).forEach(c => { map[c.id] = c; });
        setCompanies(map);
      } else {
        setCompanies({});
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(query, vertical, condition, priceRange);
  }, [query, vertical, condition, priceRange, fetchListings]);

  const handleSearch = () => setQuery(searchInput.trim());

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: #4A4540; }
        input:focus { border-color: rgba(232,93,38,0.5) !important; box-shadow: 0 0 0 2px rgba(232,93,38,0.1); }
      `}</style>

      <SourcingNav active="marketplace" />

      {/* Hero */}
      <div style={{ padding: '40px 24px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.orange,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          Equipment Marketplace
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, fontFamily: V.syne, color: V.text, margin: '0 0 6px', lineHeight: 1.15 }}>
              Equipment, Parts & Materials
            </h1>
            <p style={{ fontSize: 14, color: V.muted, fontFamily: V.space, margin: 0 }}>
              Industrial equipment and parts from verified Arizona companies.
            </p>
          </div>
          <Link
            to="/sourcing/marketplace/post"
            style={{
              background: V.orange, color: '#fff', textDecoration: 'none',
              borderRadius: 7, padding: '9px 18px', fontSize: 13,
              fontWeight: 700, fontFamily: V.space, whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + Post a Listing
          </Link>
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search equipment, parts, materials..."
              style={{
                width: '100%',
                background: V.card2, border: `1px solid ${V.borderHov}`,
                color: V.text, borderRadius: 8, padding: '10px 42px 10px 14px',
                fontSize: 14, fontFamily: V.space, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: V.muted }}>
              {loading
                ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.orange}`, animation: 'spin 0.8s linear infinite' }} />
                : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              }
            </div>
          </div>
          <button onClick={handleSearch} style={{
            background: V.orange, border: 'none', color: '#fff',
            borderRadius: 8, padding: '0 18px', fontSize: 13,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Search
          </button>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Vertical */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {VERTICALS.map(v => (
              <button key={v.key} onClick={() => setVertical(v.key)} style={{
                background: vertical === v.key ? `${v.color}20` : 'transparent',
                border: `1px solid ${vertical === v.key ? v.color : V.border}`,
                color: vertical === v.key ? v.color : V.muted,
                borderRadius: 6, padding: '6px 12px', fontSize: 12,
                fontWeight: 600, fontFamily: V.space, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, background: V.border, margin: '4px 0' }} />

          {/* Condition */}
          {CONDITIONS.map(c => (
            <button key={c.key} onClick={() => setCondition(c.key)} style={{
              background: condition === c.key ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${condition === c.key ? V.borderHov : V.border}`,
              color: condition === c.key ? V.text : V.muted,
              borderRadius: 6, padding: '6px 12px', fontSize: 12,
              fontWeight: 600, fontFamily: V.space, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}>
              {c.label}
            </button>
          ))}

          <div style={{ width: 1, background: V.border, margin: '4px 0' }} />

          {/* Price */}
          {PRICE_RANGES.map(r => (
            <button key={r.key} onClick={() => setPriceRange(r.key)} style={{
              background: priceRange === r.key ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${priceRange === r.key ? V.borderHov : V.border}`,
              color: priceRange === r.key ? V.text : V.muted,
              borderRadius: 6, padding: '6px 12px', fontSize: 12,
              fontWeight: 600, fontFamily: V.space, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: V.muted, fontFamily: V.space }}>
            {loading ? 'Loading...' : (
              <>
                <span style={{ color: V.text, fontWeight: 600 }}>{listings.length}</span>
                {' '}listing{listings.length !== 1 ? 's' : ''}
                {query && <> for <span style={{ color: V.orange }}>"{query}"</span></>}
              </>
            )}
          </div>
        </div>

        {!supabase && (
          <div style={{ background: 'rgba(232,93,38,0.08)', border: '1px solid rgba(232,93,38,0.2)', borderRadius: 8, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ color: V.orange, fontFamily: V.mono, fontSize: 13, marginBottom: 8 }}>Supabase not configured</div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 12 }}>Run migration 001 + 002 in Supabase SQL editor to activate.</div>
          </div>
        )}

        {loading && supabase && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, height: 320, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                company={companies[listing.company_id]}
                onClick={() => setSelected(listing)}
              />
            ))}
          </div>
        )}

        {!loading && supabase && listings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚙️</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
              No listings found
            </div>
            <div style={{ fontSize: 14, color: V.muted, fontFamily: V.space, marginBottom: 24 }}>
              {query ? `No results for "${query}". Try different filters.` : 'No equipment listed yet.'}
            </div>
            <Link
              to="/sourcing/marketplace/post"
              style={{
                background: V.orange, color: '#fff', textDecoration: 'none',
                borderRadius: 7, padding: '10px 20px', fontSize: 13,
                fontWeight: 700, fontFamily: V.space, display: 'inline-block',
              }}
            >
              Post a Listing
            </Link>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <ListingModal
          listing={selected}
          company={companies[selected.company_id]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
