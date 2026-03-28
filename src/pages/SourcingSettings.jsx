import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../dashboard/lib/supabase.js';
import { SourcingNav } from './SourcingMarketplace.jsx';
import { SourcingThemeProvider, useSourcingTheme, getTokens } from './SourcingTheme.jsx';

// ─── Vertical options ────────────────────────────────────────────────────────
const VERTICALS = [
  { key: 'semiconductor', label: 'Semiconductor' },
  { key: 'space',         label: 'Space & Aerospace' },
  { key: 'biotech',       label: 'Biotech & Life Sciences' },
  { key: 'defense',       label: 'Defense & Security' },
];

// ─── Shared input styles ─────────────────────────────────────────────────────
function inputStyle(V) {
  return {
    width: '100%',
    background: V.card,
    border: `1px solid ${V.border}`,
    borderRadius: 8,
    padding: '14px 16px',
    fontSize: 15,
    fontFamily: V.space,
    color: V.text,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
}

function labelStyle(V) {
  return {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: V.mono,
    color: V.muted,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 10,
    display: 'block',
  };
}

// ─── Toggle switch ───────────────────────────────────────────────────────────
function ToggleSwitch({ on, onToggle, V, accent }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 44, height: 24,
        borderRadius: 12,
        border: 'none',
        background: on ? accent : V.border,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: on ? 23 : 3,
        transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// ─── Inner component ─────────────────────────────────────────────────────────
function SourcingSettingsInner() {
  const { dark } = useSourcingTheme();
  const V = getTokens(dark);
  const { tenantSlug } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [navLabel, setNavLabel] = useState('');
  const [description, setDescription] = useState('');
  const [heroText, setHeroText] = useState('');
  const [vertical, setVertical] = useState('');
  const [brandColor, setBrandColor] = useState('#1B5E20');
  const [website, setWebsite] = useState('');
  const [features, setFeatures] = useState({ jobs: true, marketplace: true, events: true, articles: true, signup: true });

  const accent = brandColor || V.accent;

  // Load tenant
  useEffect(() => {
    if (!tenantSlug) { setLoading(false); return; }
    async function loadTenant() {
      try {
        // Try API
        try {
          const res = await fetch(`/api/sourcing/tenants?slug=${tenantSlug}`);
          if (res.ok) {
            const data = await res.json();
            populateForm(data);
            setTenant(data);
            setLoading(false);
            return;
          }
        } catch { /* fall through */ }
        // Direct Supabase
        if (supabase) {
          const { data } = await supabase.from('directory_tenants').select('*').eq('slug', tenantSlug).single();
          if (data) {
            populateForm(data);
            setTenant(data);
          }
        }
      } catch (err) {
        console.error('Failed to load tenant:', err);
        setError('Could not load directory settings.');
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, [tenantSlug]);

  const populateForm = (t) => {
    setName(t.name || '');
    setNavLabel(t.nav_label || '');
    setDescription(t.description || '');
    setHeroText(t.hero_text || '');
    setVertical(t.vertical || '');
    setBrandColor(t.brand_color || '#1B5E20');
    setWebsite(t.website || '');
    setFeatures(t.features || { jobs: true, marketplace: true, events: true, articles: true, signup: true });
  };

  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (saving || !tenant) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      name: name.trim(),
      nav_label: navLabel.trim() || null,
      description: description.trim() || null,
      hero_text: heroText.trim() || null,
      vertical: vertical.trim(),
      brand_color: brandColor,
      website: website.trim() || null,
      features,
    };

    try {
      if (supabase) {
        const { error: updateErr } = await supabase
          .from('directory_tenants')
          .update(payload)
          .eq('id', tenant.id);
        if (updateErr) throw new Error(updateErr.message);
      } else {
        throw new Error('Supabase not configured');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (archiving || !tenant) return;
    setArchiving(true);
    setError(null);

    try {
      if (supabase) {
        const { error: archiveErr } = await supabase
          .from('directory_tenants')
          .update({ status: 'archived' })
          .eq('id', tenant.id);
        if (archiveErr) throw new Error(archiveErr.message);
      } else {
        throw new Error('Supabase not configured');
      }
      navigate('/sourcing');
    } catch (err) {
      setError(err.message);
      setArchiving(false);
    }
  };

  const featureLabels = {
    jobs: 'Job Board',
    marketplace: 'Marketplace',
    events: 'Events Calendar',
    articles: 'Articles & News',
    signup: 'Company Signup',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `2px solid ${V.border}`, borderTop: `2px solid ${V.accent}`,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
        <SourcingNav active="settings" tenantSlug={tenantSlug} />
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
            Directory not found
          </div>
          <Link to="/sourcing" style={{ color: V.accent, fontFamily: V.space, fontSize: 14 }}>
            Back to directories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input:focus, textarea:focus { border-color: ${accent} !important; box-shadow: 0 0 0 2px rgba(16,185,129,0.12); }
        input::placeholder, textarea::placeholder { color: ${V.dim}; }
        input[type="color"] { -webkit-appearance: none; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 6px; }
      `}</style>

      <SourcingNav
        active="settings"
        tenantSlug={tenantSlug}
        tenantName={tenant.nav_label || tenant.name}
        features={tenant.features}
        brandColor={tenant.brand_color}
      />

      {/* Page content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, fontFamily: V.syne,
          color: V.heading, margin: '0 0 8px',
        }}>
          Directory Settings
        </h1>
        <p style={{ fontSize: 14, color: V.muted, fontFamily: V.space, margin: '0 0 40px' }}>
          Configure {tenant.name}
        </p>

        {/* ── General section ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, fontFamily: V.mono,
            color: V.accent, letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            General
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={labelStyle(V)}>Directory Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle(V)}
              />
            </div>

            <div>
              <label style={labelStyle(V)}>Nav Label (optional override)</label>
              <input
                type="text"
                value={navLabel}
                onChange={e => setNavLabel(e.target.value)}
                placeholder="Shorter name for navigation"
                style={inputStyle(V)}
              />
            </div>

            <div>
              <label style={labelStyle(V)}>Vertical</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {VERTICALS.map(v => {
                  const selected = vertical === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVertical(v.key)}
                      style={{
                        background: selected ? `${accent}18` : V.card,
                        border: `1px solid ${selected ? accent : V.border}`,
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontFamily: V.space,
                        fontWeight: selected ? 700 : 500,
                        color: selected ? accent : V.muted,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
              {/* If vertical doesn't match any preset, show custom input */}
              {vertical && !VERTICALS.find(v => v.key === vertical) && (
                <input
                  type="text"
                  value={vertical}
                  onChange={e => setVertical(e.target.value)}
                  placeholder="Custom vertical"
                  style={{ ...inputStyle(V), marginTop: 10 }}
                />
              )}
            </div>

            <div>
              <label style={labelStyle(V)}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle(V), resize: 'vertical', minHeight: 80, lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={labelStyle(V)}>Hero Text</label>
              <textarea
                value={heroText}
                onChange={e => setHeroText(e.target.value)}
                placeholder="Custom tagline shown on the directory landing"
                rows={2}
                style={{ ...inputStyle(V), resize: 'vertical', minHeight: 60, lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={labelStyle(V)}>Website</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://example.com"
                style={inputStyle(V)}
              />
            </div>
          </div>
        </div>

        {/* ── Branding section ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, fontFamily: V.mono,
            color: V.accent, letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Branding
          </div>

          <div>
            <label style={labelStyle(V)}>Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                style={{
                  width: 48, height: 48,
                  border: `2px solid ${V.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: 2,
                }}
              />
              <input
                type="text"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                style={{ ...inputStyle(V), width: 140, fontFamily: V.mono }}
              />
              <div style={{
                width: 80, height: 48, borderRadius: 8,
                background: brandColor,
                border: `1px solid ${V.border}`,
                transition: 'background 0.2s',
              }} />
            </div>
          </div>
        </div>

        {/* ── Features section ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, fontFamily: V.mono,
            color: V.accent, letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Features
          </div>

          <div style={{
            background: V.card, border: `1px solid ${V.border}`,
            borderRadius: 10, overflow: 'hidden',
          }}>
            {Object.keys(featureLabels).map((key, i) => (
              <div
                key={key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderTop: i > 0 ? `1px solid ${V.border}` : 'none',
                }}
              >
                <span style={{ fontSize: 15, fontFamily: V.space, color: V.text }}>
                  {featureLabels[key]}
                </span>
                <ToggleSwitch on={features[key]} onToggle={() => toggleFeature(key)} V={V} accent={accent} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 60,
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              background: saving ? V.border : accent,
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              fontSize: 14,
              fontFamily: V.space,
              fontWeight: 700,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Saving...
              </>
            ) : 'Save Changes'}
          </button>

          {saved && (
            <span style={{
              fontSize: 13, fontFamily: V.space, color: V.green, fontWeight: 600,
              animation: 'fadeIn 0.2s ease',
            }}>
              Saved
            </span>
          )}

          {error && (
            <span style={{
              fontSize: 13, fontFamily: V.space, color: '#f87171',
            }}>
              {error}
            </span>
          )}
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid rgba(239,68,68,0.2)',
          paddingTop: 32,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, fontFamily: V.mono,
            color: '#EF4444', letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Danger Zone
          </div>

          <div style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: V.space, color: V.text, marginBottom: 4 }}>
                Archive this directory
              </div>
              <div style={{ fontSize: 13, fontFamily: V.space, color: V.muted }}>
                Hides the directory from public view. Companies and data are preserved.
              </div>
            </div>

            {!confirmArchive ? (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontFamily: V.space,
                  fontWeight: 700,
                  color: '#EF4444',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Archive Directory
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${V.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontFamily: V.space,
                    fontWeight: 600,
                    color: V.muted,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  style={{
                    background: '#EF4444',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontSize: 13,
                    fontFamily: V.space,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: archiving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {archiving ? (
                    <>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Archiving...
                    </>
                  ) : 'Confirm Archive'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function SourcingSettings() {
  return (
    <SourcingThemeProvider>
      <SourcingSettingsInner />
    </SourcingThemeProvider>
  );
}
