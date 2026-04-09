import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';

export default function GlobalSignup() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isError = !!error;
  const [hovered, setHovered] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function fetchTenants() {
    setIsLoading(true);
    setError(null);
    try {
      // Try dedicated API endpoint first
      try {
        const res = await fetch('/api/dashboard/sourcing-tenants');
        if (res.ok) {
          const data = await res.json();
          setTenants(data);
          setIsLoading(false);
          return;
        }
      } catch { /* fall through */ }

      // Fall back to direct Supabase query
      if (!supabase) {
        setError('Supabase not configured.');
        setIsLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('directory_tenants')
        .select('id, slug, name, logo_url, brand_color, tagline, vertical, hero_text')
        .eq('status', 'active')
        .order('sort_order', { ascending: true, nullsFirst: false });
      if (err) {
        setError(err.message);
      } else {
        setTenants(data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load organizations.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  function handleTenantClick(tenant) {
    console.log('Tenant card clicked!', tenant.slug);
    navigate(`/${tenant.slug}/signup`);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: viewportWidth <= 768 ? '40px 16px' : '64px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
    }}>
      <div style={{ maxWidth: 960, width: '100%' }}>
        <h1 style={{
          color: '#fff',
          fontSize: viewportWidth <= 768 ? 22 : 28,
          fontWeight: 600,
          letterSpacing: '-0.5px',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Sign Up
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 15,
          textAlign: 'center',
          marginBottom: 40,
        }}>
          Choose your organization to get started.
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 32 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTop: '2px solid #E85D26',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</span>
          </div>
        )}

        {isError && (
          <div style={{
            background: 'rgba(232,93,38,0.1)',
            border: '1px solid rgba(232,93,38,0.3)',
            borderRadius: 8,
            padding: '16px 20px',
            color: '#E85D26',
            fontSize: 14,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
            <span>Error: {error}</span>
            <button
              onClick={fetchTenants}
              style={{
                background: 'rgba(232,93,38,0.2)',
                border: '1px solid rgba(232,93,38,0.4)',
                borderRadius: 6,
                color: '#E85D26',
                fontSize: 13,
                fontWeight: 500,
                padding: '6px 16px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && tenants.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: 14 }}>
            No organizations available.
          </p>
        )}

        {!isLoading && !isError && tenants.length > 0 && (
          <ul style={viewportWidth > 768 ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          } : {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}>
            {tenants.map((tenant) => {
              const accent = tenant.brand_color || '#E85D26';
              const isHovered = hovered === tenant.id;
              const tenantType = tenant.vertical || null;
              return (
                <li
                  key={tenant.id}
                  onClick={() => handleTenantClick(tenant)}
                  onMouseEnter={() => setHovered(tenant.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    maxWidth: viewportWidth <= 768 ? 480 : undefined,
                    minWidth: 0,
                    background: isHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isHovered ? `${accent}55` : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 14,
                    padding: '24px 20px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isHovered ? `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}20` : '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Logo or placeholder */}
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={`${tenant.name} logo`}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        objectFit: 'contain',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: 6,
                        marginBottom: 16,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: `${accent}22`,
                      border: `1px solid ${accent}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: accent,
                      fontSize: 22,
                      fontWeight: 700,
                      marginBottom: 16,
                    }}>
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <div style={{
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.2px',
                    marginBottom: 6,
                    lineHeight: 1.3,
                  }}>
                    {tenant.name}
                  </div>

                  {/* Type badge */}
                  {tenantType && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: accent,
                      background: `${accent}18`,
                      border: `1px solid ${accent}35`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      textTransform: 'capitalize',
                      marginBottom: 8,
                    }}>
                      {tenantType}
                    </span>
                  )}

                  {/* Tagline */}
                  {(tenant.tagline || tenant.hero_text) && (
                    <div style={{
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      marginTop: 'auto',
                      paddingTop: 8,
                    }}>
                      {tenant.tagline || tenant.hero_text}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
