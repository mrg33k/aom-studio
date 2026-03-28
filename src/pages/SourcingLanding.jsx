import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingThemeProvider, useSourcingTheme, getTokens, ThemeToggle } from './SourcingTheme.jsx';

// ─── Tenant Card ──────────────────────────────────────────────────────────────
function TenantCard({ tenant, V }) {
  const [hovered, setHovered] = useState(false);
  const brandColor = tenant.brand_color || V.accent;

  return (
    <Link
      to={`/sourcing/${tenant.slug}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background: hovered ? V.cardHov : V.card,
        border: `1px solid ${hovered ? `${brandColor}60` : V.border}`,
        borderRadius: 12,
        padding: '24px 22px',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: hovered ? `0 0 0 1px ${brandColor}20, 0 8px 24px rgba(0,0,0,0.15)` : 'none',
        minHeight: 180,
      }}>
        {/* Header: logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: V.card2, flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: `${brandColor}18`,
              border: `1px solid ${brandColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif",
              color: brandColor, flexShrink: 0,
            }}>
              {tenant.name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 17, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              color: V.heading, lineHeight: 1.2,
            }}>
              {tenant.nav_label || tenant.name}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              color: brandColor, textTransform: 'uppercase', letterSpacing: '0.08em',
              marginTop: 3,
            }}>
              {tenant.vertical}
            </div>
          </div>
        </div>

        {/* Description */}
        {tenant.description && (
          <div style={{
            fontSize: 13, color: V.muted, fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {tenant.description}
          </div>
        )}

        {/* Footer: stats */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" fill="none" stroke={brandColor} strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span style={{
              fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: V.text,
            }}>
              {tenant.company_count || 0}
            </span>
            <span style={{ fontSize: 12, color: V.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
              companies
            </span>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              background: `${brandColor}15`,
              border: `1px solid ${brandColor}35`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: brandColor, textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              Explore
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────
function SourcingLandingInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenants() {
      try {
        // Try API first (works on Vercel), fall back to direct Supabase
        try {
          const res = await fetch('/api/sourcing/tenants');
          if (res.ok) {
            const data = await res.json();
            setTenants(data);
            setLoading(false);
            return;
          }
        } catch { /* fall through to direct query */ }

        // Direct Supabase query (local dev)
        if (supabase) {
          const { data: tenantRows } = await supabase
            .from('directory_tenants')
            .select('*')
            .eq('status', 'active')
            .order('name');

          const results = [];
          for (const t of (tenantRows || [])) {
            const { count } = await supabase
              .from('directory_companies')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', t.id);
            results.push({ ...t, company_count: count || 0 });
          }
          setTenants(results);
        }
      } catch (err) {
        console.error('Failed to load tenants:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTenants();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        .sourcing-landing-nav::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${V.border}`, background: V.navBg }}>
        <div style={{
          padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
          className="sourcing-landing-nav"
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontSize: 13, fontWeight: 800, fontFamily: "'Syne', sans-serif",
              color: V.accent, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              AOM
            </span>
          </Link>
          <span style={{ color: V.dim, fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: V.text, fontFamily: "'Space Grotesk', sans-serif" }}>Sourcing</span>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <Link
            to="/sourcing/admin"
            style={{
              fontSize: 11, color: V.muted, fontFamily: "'JetBrains Mono', monospace",
              textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Admin
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '60px 24px 44px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          color: V.accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        }}>
          sourcing.directory
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800,
          fontFamily: "'Syne', sans-serif",
          color: V.heading, lineHeight: 1.15, margin: '0 0 14px',
        }}>
          Arizona Industry Directories
        </h1>
        <p style={{
          fontSize: 16, color: V.muted, fontFamily: "'Space Grotesk', sans-serif",
          maxWidth: 580, margin: '0 auto', lineHeight: 1.6,
        }}>
          Verified supplier directories for Arizona's advanced industries. Find certified companies, explore job boards, marketplaces, and events.
        </p>
      </div>

      {/* Tenant Grid */}
      <div style={{ padding: '0 24px 80px', maxWidth: 900, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                background: V.card, border: `1px solid ${V.border}`,
                borderRadius: 12, height: 200,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : tenants.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {tenants.map(tenant => (
              <TenantCard key={tenant.id} tenant={tenant} V={V} />
            ))}
          </div>
        ) : (
          <div style={{
            background: V.card, border: `1px solid ${V.border}`,
            borderRadius: 12, padding: '60px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: V.text, marginBottom: 8 }}>
              No directories yet
            </div>
            <div style={{ fontSize: 14, color: V.muted, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 24 }}>
              Run the migration to create tenant directories, or use Scout admin to create one.
            </div>
            <Link
              to="/sourcing/admin"
              style={{
                background: V.accent, color: '#fff', textDecoration: 'none',
                borderRadius: 7, padding: '10px 20px', fontSize: 13,
                fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", display: 'inline-block',
              }}
            >
              Open Admin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function SourcingLanding() {
  return (
    <SourcingThemeProvider>
      <SourcingLandingInner />
    </SourcingThemeProvider>
  );
}
