import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingThemeProvider, useSourcingTheme, getTokens } from './SourcingTheme.jsx';

const VERTICALS = {
  semiconductor: { label: 'Semiconductor', color: '#29B6F6' },
  space:         { label: 'Space & Aerospace', color: '#7C3AED' },
  biotech:       { label: 'Biotech', color: '#22C55E' },
  defense:       { label: 'Defense', color: '#EF4444' },
};

const LISTING_ICONS = {
  equipment: '🔧',
  job:       '💼',
  event:     '📅',
  article:   '📄',
};

function verticalColor(v) {
  return VERTICALS[v]?.color || '#9ca3af';
}

function Chip({ children, color, V }) {
  return (
    <span style={{
      background: `${color || V.muted}15`,
      border: `1px solid ${color || V.muted}40`,
      color: color || V.muted,
      fontSize: 11, fontWeight: 600, fontFamily: V.mono,
      padding: '3px 9px', borderRadius: 4,
      textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {children}
    </span>
  );
}

function CertGrid({ certs, V }) {
  if (!certs || certs.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {certs.map(cert => (
        <div key={cert.id} style={{
          background: V.accentDim,
          border: `1px solid ${V.accentBrd}`,
          borderRadius: 6, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: `${V.accent}20`,
            border: `1px solid ${V.accent}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: V.accent, flexShrink: 0,
          }}>
            ✓
          </div>
          <span style={{ fontSize: 12, color: V.text, fontFamily: V.mono }}>
            {cert.cert_name}
          </span>
        </div>
      ))}
    </div>
  );
}

function ListingCard({ listing, V }) {
  const icon = LISTING_ICONS[listing.category] || '📋';
  const isExpired = listing.expires_at && new Date(listing.expires_at) < new Date();

  return (
    <div style={{
      background: V.card2, border: `1px solid ${V.border}`,
      borderRadius: 8, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      opacity: isExpired ? 0.5 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: V.accentDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: V.space, color: V.text, marginBottom: 4 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Chip color={V.muted} V={V}>{listing.category}</Chip>
          {listing.price && (
            <span style={{ fontSize: 13, fontWeight: 700, color: V.accent, fontFamily: V.mono }}>
              ${listing.price.toLocaleString()}
            </span>
          )}
          {isExpired && <Chip color="#EF4444" V={V}>Expired</Chip>}
        </div>
      </div>
      {listing.contact_email && (
        <a
          href={`mailto:${listing.contact_email}`}
          style={{
            background: V.accent, color: '#fff', textDecoration: 'none',
            borderRadius: 5, padding: '5px 10px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, flexShrink: 0,
          }}
        >
          Contact
        </a>
      )}
    </div>
  );
}

function Section({ title, children, action, V }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${V.border}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: V.mono,
          color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────
function SourcingProfileInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);
  const { slug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [certs, setCerts] = useState([]);
  const [listings, setListings] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('directory_companies')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .single();

        if (error || !data) { setNotFound(true); setLoading(false); return; }

        setCompany(data);

        const [certsRes, listingsRes, orgRes] = await Promise.all([
          supabase.from('directory_certifications').select('*').eq('company_id', data.id),
          supabase.from('directory_listings').select('*').eq('company_id', data.id).eq('status', 'active').order('created_at', { ascending: false }),
          data.organization_id
            ? supabase.from('directory_organizations').select('*').eq('id', data.organization_id).single()
            : Promise.resolve({ data: null }),
        ]);

        setCerts(certsRes.data || []);
        setListings(listingsRes.data || []);
        setOrg(orgRes.data || null);
      } catch (err) {
        console.error('Profile fetch error:', err);
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
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${V.dim}`, borderTop: `2px solid ${V.accent}`, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !company) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48, color: V.text }}>404</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.text }}>Company not found</div>
        <Link to="/sourcing" style={{ color: V.accent, fontFamily: V.space, fontSize: 14 }}>Back to directory</Link>
      </div>
    );
  }

  const vColor = verticalColor(company.vertical);
  const vLabel = VERTICALS[company.vertical]?.label || company.vertical;
  const tierColors = {
    enterprise: { bg: `${V.accent}18`, border: V.accent, text: V.accent },
    pro:        { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: '#93C5FD' },
    basic:      { bg: 'rgba(34,197,94,0.12)', border: '#22C55E', text: '#86EFAC' },
    free:       { bg: 'rgba(138,132,124,0.1)', border: '#8A847C', text: '#8A847C' },
  };
  const tierColor = tierColors[company.membership_tier] || tierColors.free;

  const listingsByCategory = listings.reduce((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`* { box-sizing: border-box; } a { color: inherit; }`}</style>

      {/* Nav */}
      <div style={{
        borderBottom: `1px solid ${V.border}`,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 16, height: 60,
        background: V.navBg,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: V.syne, color: V.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            AOM
          </span>
        </Link>
        <span style={{ color: V.dim, fontSize: 13 }}>/</span>
        <Link to="/sourcing" style={{ textDecoration: 'none', fontSize: 13, color: V.muted, fontFamily: V.space }}>
          Sourcing Directory
        </Link>
        <span style={{ color: V.dim, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: V.text, fontFamily: V.space }}>
          {company.name}
        </span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
        {/* Profile Hero */}
        <div style={{
          padding: '36px 0 28px',
          borderBottom: `1px solid ${V.border}`,
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                style={{
                  width: 80, height: 80, borderRadius: 14,
                  objectFit: 'contain', background: V.card2,
                  border: `1px solid ${V.border}`, flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 14, flexShrink: 0,
                background: `${vColor}18`,
                border: `1px solid ${vColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 800, fontFamily: V.syne, color: vColor,
              }}>
                {company.name.charAt(0)}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, fontFamily: V.syne, color: V.heading, margin: 0, lineHeight: 1.1 }}>
                  {company.name}
                </h1>
                {company.featured && (
                  <span style={{
                    background: V.accentDim, border: `1px solid ${V.accentBrd}`,
                    color: V.accent, fontSize: 10, fontWeight: 700, fontFamily: V.mono,
                    padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    Featured
                  </span>
                )}
              </div>

              <div style={{ fontSize: 14, color: V.muted, fontFamily: V.space, marginBottom: 12, lineHeight: 1.5 }}>
                {[company.city, company.state, company.country !== 'US' ? company.country : null].filter(Boolean).join(', ')}
                {company.year_founded && ` · Founded ${company.year_founded}`}
                {company.employee_count && ` · ${company.employee_count} employees`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Chip color={vColor} V={V}>{vLabel}</Chip>
                <span style={{
                  background: tierColor.bg, border: `1px solid ${tierColor.border}`,
                  color: tierColor.text, fontSize: 10, fontWeight: 700,
                  fontFamily: V.mono, padding: '3px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  {company.membership_tier} member
                </span>
                {org && (
                  <span style={{ fontSize: 12, color: V.muted, fontFamily: V.space }}>
                    via {org.name}
                  </span>
                )}
              </div>
            </div>

            {/* Contact CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: V.accent, color: '#fff', textDecoration: 'none',
                    borderRadius: 7, padding: '8px 16px', fontSize: 13,
                    fontWeight: 700, fontFamily: V.space, textAlign: 'center',
                  }}
                >
                  Visit Website
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  style={{
                    background: 'transparent', color: V.muted, textDecoration: 'none',
                    border: `1px solid ${V.border}`, borderRadius: 7, padding: '7px 16px',
                    fontSize: 13, fontWeight: 600, fontFamily: V.space, textAlign: 'center',
                  }}
                >
                  Send Email
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {company.description && (
              <Section title="About" V={V}>
                <p style={{ fontSize: 15, color: V.muted, fontFamily: V.space, lineHeight: 1.7, margin: 0 }}>
                  {company.description}
                </p>
              </Section>
            )}

            {certs.length > 0 && (
              <Section title={`Certifications (${certs.length})`} V={V}>
                <CertGrid certs={certs} V={V} />
              </Section>
            )}

            {Object.entries(listingsByCategory).map(([category, items]) => (
              <Section key={category} title={`${category.charAt(0).toUpperCase() + category.slice(1)}s (${items.length})`} V={V}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(l => <ListingCard key={l.id} listing={l} V={V} />)}
                </div>
              </Section>
            ))}

            {listings.length === 0 && (
              <Section title="Listings" V={V}>
                <div style={{
                  textAlign: 'center', padding: '28px 0',
                  color: V.dim, fontSize: 13, fontFamily: V.space,
                }}>
                  No active listings yet.
                </div>
              </Section>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Contact info */}
            <div style={{
              background: V.card, border: `1px solid ${V.border}`,
              borderRadius: 10, padding: '18px 16px',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
              }}>
                Contact
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {company.phone && (
                  <a href={`tel:${company.phone}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📞</span>
                    <span style={{ fontSize: 13, color: V.text, fontFamily: V.mono }}>{company.phone}</span>
                  </a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>✉️</span>
                    <span style={{ fontSize: 13, color: V.blue, fontFamily: V.mono, wordBreak: 'break-all' }}>{company.email}</span>
                  </a>
                )}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🌐</span>
                    <span style={{ fontSize: 13, color: V.blue, fontFamily: V.mono, wordBreak: 'break-all' }}>
                      {company.website.replace(/^https?:\/\//, '')}
                    </span>
                  </a>
                )}
                {!company.phone && !company.email && !company.website && (
                  <span style={{ fontSize: 12, color: V.dim, fontFamily: V.space }}>No contact info listed.</span>
                )}
              </div>
            </div>

            {/* Company details */}
            <div style={{
              background: V.card, border: `1px solid ${V.border}`,
              borderRadius: 10, padding: '18px 16px',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
              }}>
                Company Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Industry', value: vLabel },
                  { label: 'Location', value: [company.city, company.state].filter(Boolean).join(', ') || 'N/A' },
                  { label: 'Founded', value: company.year_founded || 'N/A' },
                  { label: 'Employees', value: company.employee_count || 'N/A' },
                  { label: 'Member Since', value: new Date(company.created_at).getFullYear() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: V.dim, fontFamily: V.space }}>{label}</span>
                    <span style={{ fontSize: 12, color: V.text, fontFamily: V.space, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {org && (
              <div style={{
                background: `${vColor}10`,
                border: `1px solid ${vColor}30`,
                borderRadius: 10, padding: '16px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Member Organization
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 4 }}>
                  {org.name}
                </div>
                {org.description && (
                  <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, lineHeight: 1.5, marginBottom: 10 }}>
                    {org.description.slice(0, 120)}{org.description.length > 120 ? '...' : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link
                    to={`/sourcing/org/${org.slug}`}
                    style={{ fontSize: 12, color: vColor, fontFamily: V.space, textDecoration: 'none', fontWeight: 600 }}
                  >
                    View Organization →
                  </Link>
                  {org.website && (
                    <a
                      href={org.website} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: V.muted, fontFamily: V.space, textDecoration: 'none', fontWeight: 600 }}
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            <Link
              to="/sourcing"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: V.muted, textDecoration: 'none', fontSize: 13,
                fontFamily: V.space, padding: '12px 0',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Directory
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}

export default function SourcingProfile() {
  return (
    <SourcingThemeProvider>
      <SourcingProfileInner />
    </SourcingThemeProvider>
  );
}
