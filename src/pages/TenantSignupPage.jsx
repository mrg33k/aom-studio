import React from 'react';
import { useParams } from 'react-router-dom';

export default function TenantSignupPage() {
  const { tenantSlug } = useParams();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '2.5rem 3rem',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: '#FFFFFF',
          fontSize: '1.5rem',
          fontWeight: 700,
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Tenant Signup
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.75rem',
          margin: '0 0 1.25rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Tenant ID: <span style={{ color: '#E85D26', fontWeight: 600, letterSpacing: 0 }}>{tenantSlug}</span>
        </p>
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.06)',
          margin: '0 0 1.25rem',
        }} />
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.8125rem',
          margin: 0,
        }}>
          Create your account for <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{tenantSlug}</strong>.
        </p>
      </div>
    </div>
  );
}
