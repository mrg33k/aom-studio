import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  red:       '#EF4444',
  syne:      "'Syne', sans-serif",
  space:     "'Space Grotesk', sans-serif",
  mono:      "'JetBrains Mono', monospace",
};

// Same password pattern as the AOM dashboard
const ADMIN_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'admin';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: V.card, border: `1px solid ${V.border}`,
      borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: V.syne, color: color || V.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: V.dim, fontFamily: V.space, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function AdminSection({ title, children, action }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${V.border}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: V.syne, color: V.text }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const colors = {
    active:  { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.4)',   text: '#86EFAC' },
    pending: { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.4)',   text: '#FDE68A' },
    expired: { bg: 'rgba(138,132,124,0.1)', border: 'rgba(138,132,124,0.4)', text: '#8A847C' },
    inactive:{ bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.4)',   text: '#FCA5A5' },
    sold:    { bg: 'rgba(138,132,124,0.1)', border: 'rgba(138,132,124,0.4)', text: '#8A847C' },
  };
  const c = colors[status] || colors.inactive;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: 10, fontWeight: 700, fontFamily: V.mono,
      padding: '2px 7px', borderRadius: 3,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {status}
    </span>
  );
}

// ─── Company Row ──────────────────────────────────────────────────────────────
function CompanyRow({ company, onAction, refreshing }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px',
      gap: 12, padding: '12px 16px', alignItems: 'center',
      borderBottom: `1px solid ${V.border}`,
      opacity: refreshing ? 0.5 : 1,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: V.space, color: V.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {company.name}
        </div>
        <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
          {company.vertical} · {[company.city, company.state].filter(Boolean).join(', ')}
        </div>
      </div>
      <div><StatusPill status={company.status} /></div>
      <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>{company.membership_tier}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {company.status === 'pending' && (
          <button onClick={() => onAction(company.id, 'approve')} style={{
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
            color: '#86EFAC', borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Approve
          </button>
        )}
        {company.status === 'active' && (
          <button onClick={() => onAction(company.id, 'deactivate')} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5', borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Deactivate
          </button>
        )}
        {!company.featured && company.status === 'active' && (
          <button onClick={() => onAction(company.id, 'feature')} style={{
            background: 'rgba(232,93,38,0.1)', border: '1px solid rgba(232,93,38,0.3)',
            color: '#FDBA74', borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Feature
          </button>
        )}
        {company.featured && (
          <button onClick={() => onAction(company.id, 'unfeature')} style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${V.border}`,
            color: V.muted, borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 600, fontFamily: V.space, cursor: 'pointer',
          }}>
            Unfeature
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Listing Row ──────────────────────────────────────────────────────────────
function ListingRow({ listing, company, onToggle }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 80px 70px 80px',
      gap: 12, padding: '10px 16px', alignItems: 'center',
      borderBottom: `1px solid ${V.border}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: V.space, color: V.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.title}
        </div>
        <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>{company?.name || 'Unknown'} · {listing.category}</div>
      </div>
      <div><StatusPill status={listing.status} /></div>
      <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
        {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      <div>
        {listing.status === 'active' ? (
          <button onClick={() => onToggle(listing.id, 'deactivate')} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5', borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Remove
          </button>
        ) : (
          <button onClick={() => onToggle(listing.id, 'activate')} style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#86EFAC', borderRadius: 5, padding: '4px 8px', fontSize: 11,
            fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
          }}>
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function SourcingAdmin() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [activeTab, setActiveTab] = useState('stats');

  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [listings, setListings] = useState([]);
  const [companyMap, setCompanyMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState({});
  const [exportStatus, setExportStatus] = useState('');
  const [listingFilter, setListingFilter] = useState('all');

  const handleLogin = (e) => {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setPwError('Incorrect password.');
    }
  };

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [compRes, orgsRes, listingsRes] = await Promise.all([
        supabase.from('directory_companies').select('*').order('created_at', { ascending: false }),
        supabase.from('directory_organizations').select('*').order('name'),
        supabase.from('directory_listings').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const allCompanies = compRes.data || [];
      const allListings = listingsRes.data || [];

      setCompanies(allCompanies);
      setOrgs(orgsRes.data || []);
      setListings(allListings);

      const map = {};
      allCompanies.forEach(c => { map[c.id] = c; });
      setCompanyMap(map);

      // Compute stats
      const byVertical = {};
      allCompanies.forEach(c => {
        if (!byVertical[c.vertical]) byVertical[c.vertical] = 0;
        byVertical[c.vertical]++;
      });
      const byCategory = {};
      allListings.forEach(l => {
        if (!byCategory[l.category]) byCategory[l.category] = 0;
        byCategory[l.category]++;
      });

      setStats({
        totalCompanies: allCompanies.length,
        pendingCompanies: allCompanies.filter(c => c.status === 'pending').length,
        activeCompanies: allCompanies.filter(c => c.status === 'active').length,
        totalListings: allListings.length,
        activeListings: allListings.filter(l => l.status === 'active').length,
        byVertical,
        byCategory,
        totalOrgs: orgsRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  const handleCompanyAction = async (id, action) => {
    if (!supabase) return;
    setRefreshing(prev => ({ ...prev, [id]: true }));
    try {
      const updates = {
        approve:    { status: 'active' },
        deactivate: { status: 'inactive' },
        feature:    { featured: true },
        unfeature:  { featured: false },
      };
      await supabase.from('directory_companies').update(updates[action]).eq('id', id);
      await fetchData();
    } catch (err) {
      console.error('Company action error:', err);
    } finally {
      setRefreshing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleApproveAll = async () => {
    if (!supabase) return;
    const pending = companies.filter(c => c.status === 'pending').map(c => c.id);
    if (pending.length === 0) return;
    await Promise.all(pending.map(id =>
      supabase.from('directory_companies').update({ status: 'active' }).eq('id', id)
    ));
    await fetchData();
  };

  const handleListingToggle = async (id, action) => {
    if (!supabase) return;
    const status = action === 'activate' ? 'active' : 'expired';
    await supabase.from('directory_listings').update({ status }).eq('id', id);
    await fetchData();
  };

  const handleExportCSV = () => {
    const rows = [['Name', 'Email', 'Phone', 'Vertical', 'City', 'State', 'Tier', 'Status']];
    companies.forEach(c => {
      rows.push([c.name, c.email || '', c.phone || '', c.vertical, c.city || '', c.state || '', c.membership_tier, c.status]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sourcing-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded');
    setTimeout(() => setExportStatus(''), 3000);
  };

  const filteredListings = listingFilter === 'all'
    ? listings
    : listings.filter(l => l.category === listingFilter);

  const pendingCompanies = companies.filter(c => c.status === 'pending');

  // ─── Login gate ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: V.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{`* { box-sizing: border-box; } input::placeholder { color: #3A3530; } input:focus { border-color: rgba(232,93,38,0.5) !important; outline: none; }`}</style>
        <div style={{
          background: V.card, border: `1px solid ${V.border}`,
          borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 380,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: V.orange, fontFamily: V.mono, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              sourcing.directory
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: V.syne, color: V.text }}>Admin Panel</div>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, color: V.muted, fontFamily: V.space, fontWeight: 600 }}>Password</label>
              <input
                type="password"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                placeholder="Admin password"
                autoFocus
                style={{
                  background: V.card2, border: `1px solid ${V.border}`,
                  color: V.text, borderRadius: 7, padding: '10px 12px',
                  fontSize: 14, fontFamily: V.mono, width: '100%',
                }}
              />
            </div>
            {pwError && <div style={{ color: '#EF4444', fontSize: 13, fontFamily: V.space }}>{pwError}</div>}
            <button type="submit" style={{
              background: V.orange, border: 'none', color: '#fff',
              borderRadius: 8, padding: '12px 0', fontSize: 14,
              fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
            }}>
              Enter Admin
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/sourcing" style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textDecoration: 'none' }}>
              ← Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Dashboard ──────────────────────────────────────────────────────
  const TABS = [
    { key: 'stats',     label: 'Stats' },
    { key: 'companies', label: `Companies${pendingCompanies.length > 0 ? ` (${pendingCompanies.length} pending)` : ''}` },
    { key: 'orgs',      label: 'Organizations' },
    { key: 'listings',  label: 'Listings' },
    { key: 'actions',   label: 'Quick Actions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: V.bg, color: V.text }}>
      <style>{`* { box-sizing: border-box; } a { color: inherit; }`}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${V.border}`, background: '#0A0A0A',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: V.syne, color: V.orange, letterSpacing: '0.12em', textTransform: 'uppercase' }}>AOM</span>
        </Link>
        <span style={{ color: V.dim, fontSize: 13 }}>/</span>
        <Link to="/sourcing" style={{ textDecoration: 'none', fontSize: 13, color: V.muted, fontFamily: V.space }}>
          Sourcing Directory
        </Link>
        <span style={{ color: V.dim, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: V.text, fontFamily: V.space }}>Admin</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setAuthed(false)}
          style={{
            background: 'transparent', border: `1px solid ${V.border}`,
            color: V.muted, borderRadius: 6, padding: '5px 12px',
            fontSize: 12, fontFamily: V.space, cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '0 24px', borderBottom: `1px solid ${V.border}`, background: '#0A0A0A', display: 'flex', gap: 0 }}>
        {TABS.map(tab => {
          const isActive = tab.key === activeTab;
          const isPending = tab.key === 'companies' && pendingCompanies.length > 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none', border: 'none',
                padding: '12px 16px', fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: V.space,
                color: isActive ? V.orange : isPending ? '#FDBA74' : V.muted,
                borderBottom: isActive ? `2px solid ${V.orange}` : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: V.muted, fontFamily: V.space }}>Loading...</div>
        )}

        {!loading && !supabase && (
          <div style={{ background: 'rgba(232,93,38,0.08)', border: '1px solid rgba(232,93,38,0.2)', borderRadius: 8, padding: '24px', textAlign: 'center' }}>
            <div style={{ color: V.orange, fontFamily: V.mono, fontSize: 13, marginBottom: 8 }}>Supabase not configured</div>
            <div style={{ color: V.muted, fontFamily: V.space, fontSize: 12 }}>Run migrations 001-003 in Supabase SQL editor to activate the admin panel.</div>
          </div>
        )}

        {/* Stats */}
        {!loading && activeTab === 'stats' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
              <StatCard label="Total Companies" value={stats.totalCompanies} />
              <StatCard label="Active Companies" value={stats.activeCompanies} color={V.green} />
              <StatCard label="Pending Approval" value={stats.pendingCompanies} color={stats.pendingCompanies > 0 ? '#FDBA74' : V.muted} />
              <StatCard label="Organizations" value={stats.totalOrgs} color={V.blue} />
              <StatCard label="Total Listings" value={stats.totalListings} />
              <StatCard label="Active Listings" value={stats.activeListings} color={V.green} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* By vertical */}
              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Companies by Vertical</div>
                {Object.entries(stats.byVertical).map(([v, count]) => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${V.border}` }}>
                    <span style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textTransform: 'capitalize' }}>{v}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: V.mono, color: V.text }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* By listing category */}
              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: V.mono, color: V.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Listings by Category</div>
                {Object.entries(stats.byCategory).length === 0 && (
                  <div style={{ fontSize: 13, color: V.dim, fontFamily: V.space }}>No listings yet.</div>
                )}
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${V.border}` }}>
                    <span style={{ fontSize: 13, color: V.muted, fontFamily: V.space, textTransform: 'capitalize' }}>{cat}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: V.mono, color: V.text }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Companies */}
        {!loading && activeTab === 'companies' && (
          <AdminSection
            title="Companies"
            action={
              pendingCompanies.length > 0 && (
                <button onClick={handleApproveAll} style={{
                  background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                  color: '#86EFAC', borderRadius: 6, padding: '6px 14px',
                  fontSize: 12, fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
                }}>
                  Approve All Pending ({pendingCompanies.length})
                </button>
              )
            }
          >
            {/* Pending first */}
            {pendingCompanies.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#FDBA74', fontFamily: V.mono, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Pending Approval
                </div>
                <div style={{ background: V.card, border: `1px solid rgba(234,179,8,0.2)`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px', gap: 12, padding: '8px 16px', background: V.card2 }}>
                    {['Company', 'Status', 'Tier', 'Actions'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: V.mono, color: V.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                    ))}
                  </div>
                  {pendingCompanies.map(c => (
                    <CompanyRow key={c.id} company={c} onAction={handleCompanyAction} refreshing={refreshing[c.id]} />
                  ))}
                </div>
              </div>
            )}

            {/* All companies */}
            <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px', gap: 12, padding: '8px 16px', background: V.card2 }}>
                {['Company', 'Status', 'Tier', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: V.mono, color: V.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {companies.filter(c => c.status !== 'pending').map(c => (
                <CompanyRow key={c.id} company={c} onAction={handleCompanyAction} refreshing={refreshing[c.id]} />
              ))}
              {companies.filter(c => c.status !== 'pending').length === 0 && (
                <div style={{ padding: '24px 16px', color: V.dim, fontSize: 13, fontFamily: V.space }}>No companies yet.</div>
              )}
            </div>
          </AdminSection>
        )}

        {/* Organizations */}
        {!loading && activeTab === 'orgs' && (
          <AdminSection title="Organizations">
            <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 12, padding: '8px 16px', background: V.card2 }}>
                {['Organization', 'Vertical', 'Tiers'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: V.mono, color: V.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {orgs.map(org => {
                const tiers = Array.isArray(org.membership_tiers) ? org.membership_tiers : [];
                const memberCount = companies.filter(c => c.organization_id === org.id).length;
                return (
                  <div key={org.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 100px',
                    gap: 12, padding: '12px 16px', alignItems: 'center',
                    borderBottom: `1px solid ${V.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: V.space, color: V.text }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: V.dim, fontFamily: V.mono }}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                        {org.website && <> · <a href={org.website} target="_blank" rel="noreferrer" style={{ color: V.blue, textDecoration: 'none' }}>site</a></>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: V.muted, fontFamily: V.mono, textTransform: 'capitalize' }}>{org.vertical}</div>
                    <div style={{ fontSize: 12, color: V.muted, fontFamily: V.mono }}>{tiers.length} tier{tiers.length !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
              {orgs.length === 0 && (
                <div style={{ padding: '24px 16px', color: V.dim, fontSize: 13, fontFamily: V.space }}>No organizations yet.</div>
              )}
            </div>
          </AdminSection>
        )}

        {/* Listings */}
        {!loading && activeTab === 'listings' && (
          <AdminSection title="Listings">
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', 'equipment', 'job', 'event', 'article'].map(cat => (
                <button key={cat} onClick={() => setListingFilter(cat)} style={{
                  background: listingFilter === cat ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: `1px solid ${listingFilter === cat ? V.borderHov : V.border}`,
                  color: listingFilter === cat ? V.text : V.muted,
                  borderRadius: 6, padding: '5px 12px', fontSize: 12,
                  fontWeight: 600, fontFamily: V.space, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}>
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 80px', gap: 12, padding: '8px 16px', background: V.card2 }}>
                {['Listing', 'Status', 'Posted', 'Action'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, fontFamily: V.mono, color: V.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {filteredListings.slice(0, 50).map(listing => (
                <ListingRow key={listing.id} listing={listing} company={companyMap[listing.company_id]} onToggle={handleListingToggle} />
              ))}
              {filteredListings.length === 0 && (
                <div style={{ padding: '24px 16px', color: V.dim, fontSize: 13, fontFamily: V.space }}>No listings.</div>
              )}
              {filteredListings.length > 50 && (
                <div style={{ padding: '12px 16px', color: V.dim, fontSize: 12, fontFamily: V.mono, textAlign: 'center' }}>
                  Showing 50 of {filteredListings.length}
                </div>
              )}
            </div>
          </AdminSection>
        )}

        {/* Quick Actions */}
        {!loading && activeTab === 'actions' && (
          <AdminSection title="Quick Actions">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {pendingCompanies.length > 0 && (
                <div style={{ background: V.card, border: `1px solid rgba(234,179,8,0.25)`, borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
                    Approve Pending ({pendingCompanies.length})
                  </div>
                  <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginBottom: 14 }}>
                    Approve all companies waiting for review.
                  </div>
                  <button onClick={handleApproveAll} style={{
                    width: '100%', background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.4)', color: '#86EFAC',
                    borderRadius: 7, padding: '9px 0', fontSize: 13,
                    fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
                  }}>
                    Approve All
                  </button>
                </div>
              )}

              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
                  Export Contacts CSV
                </div>
                <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginBottom: 14 }}>
                  Download all company contacts as CSV.
                </div>
                <button onClick={handleExportCSV} style={{
                  width: '100%', background: V.orange,
                  border: 'none', color: '#fff',
                  borderRadius: 7, padding: '9px 0', fontSize: 13,
                  fontWeight: 700, fontFamily: V.space, cursor: 'pointer',
                }}>
                  {exportStatus || 'Export CSV'}
                </button>
              </div>

              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
                  Add Organization
                </div>
                <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginBottom: 14 }}>
                  Create a new industry org (Space Rising, SC3, etc.)
                </div>
                <div style={{ fontSize: 12, color: V.dim, fontFamily: V.space }}>
                  Coming soon — use Supabase dashboard for now.
                </div>
              </div>

              <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: V.syne, color: V.text, marginBottom: 8 }}>
                  Refresh Data
                </div>
                <div style={{ fontSize: 12, color: V.muted, fontFamily: V.space, marginBottom: 14 }}>
                  Reload all data from Supabase.
                </div>
                <button onClick={fetchData} style={{
                  width: '100%', background: 'transparent',
                  border: `1px solid ${V.borderHov}`, color: V.text,
                  borderRadius: 7, padding: '9px 0', fontSize: 13,
                  fontWeight: 600, fontFamily: V.space, cursor: 'pointer',
                }}>
                  Refresh
                </button>
              </div>
            </div>
          </AdminSection>
        )}
      </div>
    </div>
  );
}
