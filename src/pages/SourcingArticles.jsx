import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingNav } from './SourcingMarketplace.jsx';
import { SourcingThemeProvider, useSourcingTheme, getTokens } from './SourcingTheme.jsx';

const VERTICALS = [
  { key: 'all',           label: 'All Industries',   color: null },
  { key: 'semiconductor', label: 'Semiconductor',     color: '#29B6F6' },
  { key: 'space',         label: 'Space & Aerospace', color: '#7C3AED' },
  { key: 'biotech',       label: 'Biotech',           color: '#22C55E' },
  { key: 'defense',       label: 'Defense',           color: '#EF4444' },
];

function VerticalBadge({ vertical, V }) {
  const v = VERTICALS.find(x => x.key === vertical);
  if (!v || v.key === 'all') return null;
  const col = v.color || V.accent;
  return (
    <span style={{
      background: `${col}18`, border: `1px solid ${col}50`, color: col,
      fontSize: 10, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {v.label}
    </span>
  );
}

function TagPill({ tag, V }) {
  return (
    <span style={{
      background: V.accentDim,
      border: `1px solid ${V.border}`,
      color: V.muted, fontSize: 10, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
    }}>
      {tag}
    </span>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ listing, company, V }) {
  const [hovered, setHovered] = useState(false);
  const tags = Array.isArray(listing.tags) ? listing.tags : [];
  const postedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Link
      to={`/sourcing/articles/${listing.id}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background: hovered ? V.cardHov : V.card,
        border: `1px solid ${hovered ? V.accentBrd : V.border}`,
        borderRadius: 10, overflow: 'hidden',
        cursor: 'pointer', transition: 'all 0.15s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: hovered ? `0 0 0 1px ${V.accent}20` : 'none',
      }}>
        {/* Cover image */}
        {listing.cover_image_url && (
          <div style={{ width: '100%', height: 160, overflow: 'hidden', flexShrink: 0 }}>
            <img
              src={listing.cover_image_url}
              alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, fontFamily: V.syne,
            color: V.heading, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {listing.title}
          </div>

          {listing.excerpt && (
            <div style={{
              fontSize: 13, color: V.muted, fontFamily: V.space, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {listing.excerpt}
            </div>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tags.slice(0, 3).map(tag => <TagPill key={tag} tag={tag} V={V} />)}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: `1px solid ${V.border}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: V.text, fontFamily: V.space, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {company?.name || 'Unknown Company'}
              </div>
              <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
                {postedDate}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <VerticalBadge vertical={listing.vertical} V={V} />
              {listing.read_time_min && (
                <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, whiteSpace: 'nowrap' }}>
                  {listing.read_time_min} min read
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Article Full View ────────────────────────────────────────────────────────
function ArticleView({ listing, company, onClose, V }) {
  const tags = Array.isArray(listing.tags) ? listing.tags : [];
  const postedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

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
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: V.card, border: `1px solid ${V.border}`,
          borderRadius: 12, maxWidth: 740, width: '100%',
          marginTop: 24, marginBottom: 24,
        }}
      >
        {listing.cover_image_url && (
          <div style={{ width: '100%', height: 280, overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
            <img src={listing.cover_image_url} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: V.syne, color: V.heading, margin: 0, lineHeight: 1.2, flex: 1 }}>
              {listing.title}
            </h1>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: V.muted, cursor: 'pointer', fontSize: 22, flexShrink: 0, padding: 0 }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${V.border}` }}>
            <div style={{ fontSize: 13, color: V.text, fontFamily: V.space, fontWeight: 600 }}>
              {company?.name || 'Unknown Company'}
            </div>
            <span style={{ color: V.dim, fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: V.dim, fontFamily: V.mono }}>{postedDate}</span>
            {listing.read_time_min && (
              <>
                <span style={{ color: V.dim, fontSize: 12 }}>·</span>
                <span style={{ fontSize: 12, color: V.dim, fontFamily: V.mono }}>{listing.read_time_min} min read</span>
              </>
            )}
            <VerticalBadge vertical={listing.vertical} V={V} />
          </div>

          {listing.excerpt && (
            <p style={{ fontSize: 16, color: V.text, fontFamily: V.space, lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic' }}>
              {listing.excerpt}
            </p>
          )}

          {listing.body && (
            <div style={{ fontSize: 15, color: V.muted, fontFamily: V.space, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {listing.body}
            </div>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${V.border}` }}>
              <span style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'center' }}>Tags:</span>
              {tags.map(tag => <TagPill key={tag} tag={tag} V={V} />)}
            </div>
          )}

          {company && (
            <div style={{
              background: V.card2, border: `1px solid ${V.border}`,
              borderRadius: 8, padding: '16px', marginTop: 28,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                background: V.accentDim, border: `1px solid ${V.accentBrd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, fontFamily: V.syne, color: V.accent,
              }}>
                {company.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.heading }}>{company.name}</div>
                <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space }}>{[company.city, company.state].filter(Boolean).join(', ')}</div>
              </div>
              <Link to={`/sourcing/${company.slug}`} style={{
                background: 'transparent', color: V.accent,
                border: `1px solid ${V.accentBrd}`, textDecoration: 'none',
                borderRadius: 6, padding: '6px 14px', fontSize: 12,
                fontWeight: 700, fontFamily: V.space, flexShrink: 0,
              }}>
                View Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inner Component ──────────────────────────────────────────────────────────
function SourcingArticlesInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);

  const [listings, setListings] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchListings = useCallback(async (q, v) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      let qb = supabase
        .from('directory_listings')
        .select('*')
        .eq('category', 'article')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (v && v !== 'all') qb = qb.eq('vertical', v);
      if (q && q.trim()) qb = qb.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

      const { data, error } = await qb.limit(50);
      if (error) throw error;
      setListings(data || []);

      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(l => l.company_id))];
        const { data: compData } = await supabase
          .from('directory_companies').select('*').in('id', companyIds);
        const map = {};
        (compData || []).forEach(c => { map[c.id] = c; });
        setCompanies(map);
      } else {
        setCompanies({});
      }
    } catch (err) {
      console.error('Articles fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(query, vertical);
  }, [query, vertical, fetchListings]);

  const handleSearch = () => setQuery(searchInput.trim());

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: ${V.dim}; }
        input:focus { border-color: ${V.accentBrd} !important; box-shadow: 0 0 0 2px ${V.accentDim}; }
      `}</style>

      <SourcingNav active="articles" />

      {/* Hero */}
      <div style={{ padding: '40px 24px 28px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
          Industry Articles
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, fontFamily: V.syne, color: V.heading, margin: '0 0 6px', lineHeight: 1.15 }}>
              News & Insights
            </h1>
            <p style={{ fontSize: 14, color: V.muted, fontFamily: V.space, margin: 0 }}>
              Articles and industry news from Arizona's advanced tech companies.
            </p>
          </div>
          <Link
            to="/sourcing/articles/post"
            style={{
              background: V.accent, color: '#fff', textDecoration: 'none',
              borderRadius: 7, padding: '9px 18px', fontSize: 13,
              fontWeight: 700, fontFamily: V.space, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            + Post an Article
          </Link>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search articles, topics, companies..."
              style={{
                width: '100%',
                background: V.card2, border: `1px solid ${V.border}`,
                color: V.text, borderRadius: 8, padding: '10px 42px 10px 14px',
                fontSize: 14, fontFamily: V.space, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: V.muted }}>
              {loading
                ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.accent}`, animation: 'spin 0.8s linear infinite' }} />
                : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              }
            </div>
          </div>
          <button onClick={handleSearch} style={{
            background: V.accent, border: 'none', color: '#fff',
            borderRadius: 8, padding: '0 18px', fontSize: 13,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Search
          </button>
        </div>

        {/* Vertical filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VERTICALS.map(vf => {
            const col = vf.key === 'all' ? V.accent : (vf.color || V.accent);
            const isActive = vertical === vf.key;
            return (
              <button key={vf.key} onClick={() => setVertical(vf.key)} style={{
                background: isActive ? `${col}20` : 'transparent',
                border: `1px solid ${isActive ? col : V.border}`,
                color: isActive ? col : V.muted,
                borderRadius: 6, padding: '6px 12px', fontSize: 12,
                fontWeight: 600, fontFamily: V.space, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}>
                {vf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: V.muted, fontFamily: V.space, marginBottom: 16 }}>
          {loading ? 'Loading...' : (
            <>
              <span style={{ color: V.text, fontWeight: 600 }}>{listings.length}</span>
              {' '}article{listings.length !== 1 ? 's' : ''}
              {query && <> for <span style={{ color: V.accent }}>"{query}"</span></>}
            </>
          )}
        </div>

        {!supabase && (
          <div style={{ background: V.accentDim, border: `1px solid ${V.accentBrd}`, borderRadius: 8, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ color: V.accent, fontFamily: V.mono, fontSize: 13, marginBottom: 8 }}>Supabase not configured</div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 12 }}>Run migrations 001-003 in Supabase SQL editor to activate.</div>
          </div>
        )}

        {loading && supabase && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, height: 320, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {listings.map(listing => (
              <ArticleCard
                key={listing.id}
                listing={listing}
                company={companies[listing.company_id]}
                V={V}
              />
            ))}
          </div>
        )}

        {!loading && supabase && listings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.heading, marginBottom: 8 }}>
              No articles found
            </div>
            <div style={{ fontSize: 14, color: V.muted, fontFamily: V.space, marginBottom: 24 }}>
              {query ? `No results for "${query}". Try different keywords.` : 'No articles published yet.'}
            </div>
            <Link
              to="/sourcing/articles/post"
              style={{
                background: V.accent, color: '#fff', textDecoration: 'none',
                borderRadius: 7, padding: '10px 20px', fontSize: 13,
                fontWeight: 700, fontFamily: V.space, display: 'inline-block',
              }}
            >
              Post an Article
            </Link>
          </div>
        )}
      </div>

      {selected && (
        <ArticleView
          listing={selected}
          company={companies[selected.company_id]}
          onClose={() => setSelected(null)}
          V={V}
        />
      )}
    </div>
  );
}

export default function SourcingArticles() {
  return (
    <SourcingThemeProvider>
      <SourcingArticlesInner />
    </SourcingThemeProvider>
  );
}
