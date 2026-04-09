import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VERTICAL_IMAGES = {
  semiconductor: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  space:         'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80',
  biotech:       'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
  defense:       'https://images.unsplash.com/photo-1580752300992-559f8e0734e0?w=800&q=80',
  default:       'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
};

function getBgImage(vertical) {
  return VERTICAL_IMAGES[vertical] || VERTICAL_IMAGES.default;
}

function TenantCard({ tenant, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const accent = tenant.brand_color || '#3B82F6';
  const bgImage = getBgImage(tenant.vertical);

  return (
    <div
      onClick={() => onSelect(tenant.slug)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundImage: `linear-gradient(to top, #0f1419 0%, rgba(15,20,25,0.92) 12%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.18) 100%), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `1px solid ${hovered ? `${accent}60` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        padding: '24px 22px',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: hovered
          ? `0 0 0 1px ${accent}30, 0 12px 32px rgba(0,0,0,0.3)`
          : '0 4px 16px rgba(0,0,0,0.15)',
        minHeight: 180,
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {tenant.logo_url && (
        <img
          src={tenant.logo_url}
          alt={tenant.name}
          style={{ height: 32, objectFit: 'contain', objectPosition: 'left' }}
        />
      )}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
          {tenant.name}
        </div>
        {tenant.description && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.4 }}>
            {tenant.description}
          </div>
        )}
      </div>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: accent,
        fontSize: 13,
        fontWeight: 500,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}>
        Sign up &rarr;
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/get-directory-tenants')
      .then(r => r.json())
      .then(data => {
        setTenants(data.tenants || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleSelect(slug) {
    navigate(`/${slug}/signup`);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: viewportWidth <= 768 ? '32px 16px' : '40px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: viewportWidth > 768 ? 960 : 640, width: '100%' }}>
        <h1 style={{
          color: '#fff',
          fontSize: viewportWidth <= 768 ? 22 : 28,
          fontWeight: 700,
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Choose your community
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 15,
          textAlign: 'center',
          marginBottom: 40,
        }}>
          Select the directory you want to join.
        </p>

        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 14 }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && tenants.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            No communities available.
          </div>
        )}

        <div style={viewportWidth > 768 ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        } : {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          {tenants.map(tenant => (
            <div key={tenant.slug} style={{ width: '100%', maxWidth: viewportWidth <= 768 ? 480 : undefined }}>
              <TenantCard tenant={tenant} onSelect={handleSelect} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
