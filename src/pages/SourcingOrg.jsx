import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingNav } from './SourcingMarketplace.jsx';

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

const VERTICAL_COLORS = {
  semiconductor: '#29B6F6',
  space:         '#7C3AED',
  biotech:       '#22C55E',
  defense:       '#EF4444',
};

const TIER_COLORS = {
  enterprise: { bg: 'rgba(232,93,38,0.12)', border: '#E85D26', text: '#FDBA74' },
  pro:        { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: '#93C5FD' },
  basic:      { bg: 'rgba(34,197,94,0.12)', border: '#22C55E', text: '#86EFAC' },
  free:       { bg: 'rgba(138,132,124,0.1)', border: '#8A847C', text: '#8A847C' },
};

function TierBadge({ tier }) {
  const c = TIER_COLORS[tier] || TIER_COLORS.free;
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

// ─── Membership Tier Card ─────────────────────────────────────────────────────
function TierCard({ tier, orgSlug, isPopular }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: isPopular ? 'rgba(232,93,38,0.06)' : V.card,
      border: `1px solid ${isPopular ? 'rgba(232,93,38,0.35)' : V.border}`,
      borderRadius: 12, padding: '24px 22px',
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
          background: V.orange, color: '#fff',
          fontSize: 10, fontWeight: 800, fontFamily: V.mono,
          padding: '3px 12px', borderRadius: '0 0 6px 6px',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: V.syne, color: V.text, marginBottom: 6 }}>
          {tier.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, fontFamily: V.mono, color: V.text }}>
            ${tier.price_yearly ? tier.price_yearly.toLocaleString() : '0'}
          </span>
          <span style={{ fontSize: 13, color: V.muted, fontFamily: V.space }}>/year</span>
        </div>
      </div>
      {tier.benefits && tier.benefits.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tier.benefits.map((benefit, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: V.green, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: V.muted, fontFamily: V.space, lineHeight: 1.4 }}>{benefit}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => navigate(`/sourcing/checkout?org=${orgSlug}&tier=${encodeURIComponent(tier.name)}&price=${tier.price_yearly || 0}`)}
        style={{
          width: '100%', background: isPopular ? V.orange : 'transparent',
          border: `1px solid ${isPopular ? V.orange : V.borderHov}`,
          color: isPopular ? '#fff' : V.text,
          borderRadius: 8, padding: '11px 0', fontSize: 14,
          fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        Select Plan
      </button>
    </div>
  );
}

// ─── Member Company Card ──────────────────────────────────────────────────────
function MemberCard({ company }) {
  const [hovered, setHovered] = useState(false);
  const vColor = VERTICAL_COLORS[company.vertical] || V.muted;
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
        borderRadius: 10, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s ease', cursor: 'pointer',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8, flexShrink: 0,
          background: company.logo_url ? 'transparent' : `${vColor}20`,
          border: `1px solid ${company.logo_url ? V.border : `${vColor}40`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {company.logo_url
            ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: 18, fontWeight: 800, fontFamily: V.syne, color: vColor }}>{company.name.charAt(0)}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginTop: 2 }}>
            {[company.city, company.state].filter(Boolean).join(', ')}
          </div>
        </div>
        <TierBadge tier={company.membership_tier} />
      </div>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, fontFamily: V.mono,
      color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${V.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {title}
      {count !== undefined && (
        <span style={{
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${V.border}`,
          color: V.dim, fontSize: 10, fontFamily: V.mono,
          padding: '1px 7px', borderRadius: 3,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SourcingOrg() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgListings, setOrgListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      try {
        // Fetch org
        const { data: orgData, error: orgErr } = await supabase
          .from('directory_organizations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (orgErr || !orgData) { setNotFound(true); setLoading(false); return; }
        setOrg(orgData);

        // Parallel: member companies + org's listings (from member companies)
        const [membersRes] = await Promise.all([
          supabase
            .from('directory_companies')
            .select('*')
            .eq('organization_id', orgData.id)
            .eq('status', 'active')
            .order('featured', { ascending: false })
            .order('membership_tier', { ascending: true })
            .order('name'),
        ]);

        const memberList = membersRes.data || [];
        setMembers(memberList);

        // Fetch listings from member companies
        if (memberList.length > 0) {
          const memberIds = memberList.map(m => m.id);
          const { data: listingsData } = await supabase
            .from('directory_listings')
            .select('*')
            .in('company_id', memberIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20);
          setOrgListings(listingsData || []);
        }
      } catch (err) {
        console.error('Org fetch error:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.orange}`, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48, color: V.dim }}>404</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.text }}>Organization not found</div>
        <Link to="/sourcing" style={{ color: V.orange, fontFamily: V.space, fontSize: 14 }}>Back to directory</Link>
      </div>
    );
  }

  const tiers = Array.isArray(org.membership_tiers) ? org.membership_tiers : [];
  const vColor = VERTICAL_COLORS[org.vertical] || V.muted;

  const jobs = orgListings.filter(l => l.category === 'job');
  const events = orgListings.filter(l => l.category === 'event');
  const articles = orgListings.filter(l => l.category === 'article');

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`* { box-sizing: border-box; } a { color: inherit; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <SourcingNav active="directory" />

      {/* Org Hero */}
      <div style={{
        borderBottom: `1px solid ${V.border}`,
        background: `linear-gradient(180deg, ${vColor}08 0%, transparent 100%)`,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Logo */}
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                style={{ width: 80, height: 80, borderRadius: 14, objectFit: 'contain', background: '#1a1a17', border: `1px solid ${V.border}`, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 14, flexShrink: 0,
                background: `${vColor}18`, border: `1px solid ${vColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 800, fontFamily: V.syne, color: vColor,
              }}>
                {org.name.charAt(0)}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, fontFamily: V.syne, color: V.text, margin: 0, lineHeight: 1.1 }}>
                  {org.name}
                </h1>
                <span style={{
                  background: `${vColor}18`, border: `1px solid ${vColor}50`, color: vColor,
                  fontSize: 10, fontWeight: 700, fontFamily: V.mono,
                  padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {org.vertical}
                </span>
              </div>
              {org.description && (
                <p style={{ fontSize: 15, color: V.muted, fontFamily: V.space, lineHeight: 1.6, margin: '0 0 16px', maxWidth: 600 }}>
                  {org.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {org.website && (
                  <a href={org.website} target="_blank" rel="noreferrer" style={{
                    background: V.orange, color: '#fff', textDecoration: 'none',
                    borderRadius: 7, padding: '8px 16px', fontSize: 13,
                    fontWeight: 700, fontFamily: V.space,
                  }}>
                    Visit Website
                  </a>
                )}
                <Link
                  to={`/sourcing/signup?org=${org.id}&vertical=${org.vertical}`}
                  style={{
                    background: 'transparent', color: V.text, textDecoration: 'none',
                    border: `1px solid ${V.borderHov}`, borderRadius: 7, padding: '8px 16px',
                    fontSize: 13, fontWeight: 600, fontFamily: V.space,
                  }}
                >
                  Join This Organization
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: V.syne, color: V.text }}>{members.length}</div>
                <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Members</div>
              </div>
              {tiers.length > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: V.syne, color: V.text }}>{tiers.length}</div>
                  <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tiers</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 60px' }}>
        {/* Membership Tiers */}
        {tiers.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <SectionHeader title="Membership Tiers" />
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: 16 }}>
              {tiers.map((tier, i) => (
                <TierCard
                  key={i}
                  tier={tier}
                  orgSlug={org.slug}
                  isPopular={i === 1 && tiers.length > 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Member Directory */}
        {members.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <SectionHeader title="Member Companies" count={members.length} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {members.map(company => (
                <MemberCard key={company.id} company={company} />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', marginBottom: 40 }}>
            <div style={{ fontSize: 14, color: V.dim, fontFamily: V.space }}>No member companies yet.</div>
            <Link
              to={`/sourcing/signup?org=${org.id}&vertical=${org.vertical}`}
              style={{ color: V.orange, fontFamily: V.space, fontSize: 14, textDecoration: 'none', display: 'block', marginTop: 10 }}
            >
              Be the first to join
            </Link>
          </div>
        )}

        {/* Org Events */}
        {events.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <SectionHeader title="Upcoming Events" count={events.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.slice(0, 5).map(ev => (
                <div key={ev.id} style={{
                  background: V.card, border: `1px solid ${V.border}`,
                  borderRadius: 8, padding: '14px 16px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(232,93,38,0.12)', border: '1px solid rgba(232,93,38,0.3)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {ev.event_date ? (
                      <>
                        <div style={{ fontSize: 9, fontWeight: 700, color: V.orange, fontFamily: V.mono, textTransform: 'uppercase' }}>
                          {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: V.text, fontFamily: V.syne, lineHeight: 1 }}>
                          {new Date(ev.event_date).getDate()}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 18 }}>📅</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 3 }}>{ev.title}</div>
                    {ev.event_location && <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space }}>{ev.event_location}</div>}
                  </div>
                  <Link to="/sourcing/events" style={{
                    fontSize: 11, color: V.orange, fontFamily: V.space,
                    textDecoration: 'none', fontWeight: 600, flexShrink: 0,
                  }}>
                    Details
                  </Link>
                </div>
              ))}
              {events.length > 5 && (
                <Link to="/sourcing/events" style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textDecoration: 'none', textAlign: 'center', padding: '8px 0' }}>
                  View all {events.length} events →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Org Jobs */}
        {jobs.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <SectionHeader title="Open Positions" count={jobs.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} style={{
                  background: V.card, border: `1px solid ${V.border}`,
                  borderRadius: 8, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text }}>{job.title}</div>
                    {job.location && <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space }}>{job.location}</div>}
                  </div>
                  <Link to="/sourcing/jobs" style={{
                    fontSize: 11, color: V.orange, fontFamily: V.space,
                    textDecoration: 'none', fontWeight: 600, flexShrink: 0,
                  }}>
                    Apply
                  </Link>
                </div>
              ))}
              {jobs.length > 5 && (
                <Link to="/sourcing/jobs" style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textDecoration: 'none', textAlign: 'center', padding: '8px 0' }}>
                  View all {jobs.length} jobs →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Org Articles */}
        {articles.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <SectionHeader title="Recent Articles" count={articles.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {articles.slice(0, 4).map(article => (
                <div key={article.id} style={{
                  background: V.card, border: `1px solid ${V.border}`,
                  borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 4 }}>{article.title}</div>
                  {article.excerpt && <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, lineHeight: 1.4 }}>{article.excerpt}</div>}
                  <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono, marginTop: 8 }}>
                    {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {article.read_time_min && ` · ${article.read_time_min} min read`}
                  </div>
                </div>
              ))}
              {articles.length > 4 && (
                <Link to="/sourcing/articles" style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textDecoration: 'none', textAlign: 'center', padding: '8px 0' }}>
                  View all {articles.length} articles →
                </Link>
              )}
            </div>
          </div>
        )}

        <Link
          to="/sourcing"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: V.muted, textDecoration: 'none', fontSize: 13, fontFamily: V.space,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Directory
        </Link>
      </div>
    </div>
  );
}
