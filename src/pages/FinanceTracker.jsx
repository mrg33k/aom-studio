import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useConvexLive } from '../dashboard/lib/convex';
import { authFetch } from '../dashboard/lib/authFetch';
import seedData from '../data/finance-seed.json';

const AUTH_KEY = 'aom-finance-auth';
const PASSWORD = 'aom2026';
const API_URL = '/api/dashboard/finance';

const OWNER_OPTIONS = ['Patrik', 'Ash', 'AOM', 'Review', 'Revenue', 'Refund', 'Transfer'];

// Convex financeTransactions row -> the row shape this page reads. Keep in step
// with shapeRow in api/dashboard/finance.js.
function shapeConvexRow(r) {
  return {
    id: r._id,
    date: r.date,
    description: r.description || '',
    amount: Number(r.amount),
    category: r.category || '',
    owner: r.source || 'Review',
    notes: r.vendor || '',
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : null,
  };
}

const OWNER_COLORS = {
  Patrik: { bg: 'rgba(232,93,38,0.08)', border: '#E85D26', text: '#F0A882', badge: '#E85D26' },
  Ash: { bg: 'rgba(168,133,96,0.10)', border: '#A88560', text: '#D4B896', badge: '#A88560' },
  AOM: { bg: 'rgba(34,197,94,0.10)', border: '#22C55E', text: '#86EFAC', badge: '#22C55E' },
  Review: { bg: 'rgba(234,179,8,0.10)', border: '#EAB308', text: '#FDE047', badge: '#EAB308' },
  Revenue: { bg: 'rgba(34,197,94,0.10)', border: '#22C55E', text: '#86EFAC', badge: '#22C55E' },
  Refund: { bg: 'rgba(138,132,124,0.10)', border: '#8A847C', text: '#B8B2AA', badge: '#8A847C' },
  Transfer: { bg: 'rgba(138,132,124,0.06)', border: '#6B6560', text: '#8A847C', badge: '#6B6560' },
};

// Auto-tag rules for new CSV uploads
function autoTagOwner(desc, amount, category) {
  const d = desc.toUpperCase();
  if (d.includes('SQUARE INC') && amount > 0) return 'Revenue';
  if (d.includes('INCLUDED HEALTH') && amount > 0) return 'Revenue';
  if (d.includes('SQ *ID') && amount > 0) return 'Revenue';
  if ((category || '').toLowerCase() === 'refund') return 'Refund';
  if (d.startsWith('RBT ') && amount > 0 && amount < 50) return 'Refund';
  if (d.includes('ATM FEE REIMBURSEMENT')) return 'Refund';
  if ((category || '').toLowerCase() === 'bank transfer') return 'Transfer';
  if (d.includes('NELLIS AUCTION')) return 'Ash';
  if (d.includes('WWW.MAC.BID')) return 'Ash';
  const saas = ['CLAUDE', 'ADOBE', 'VERCEL', 'FRAME.IO', 'DROPBOX', 'REPLIT', 'GOOGLE*WORKSPACE', 'GOOGLE WORKSPACE', 'BLACKMAGIC', 'ELEVENLABS', 'BONSAI', 'ANTHROPIC', 'NETFLIX', 'HELLOBONSAI', 'PROSP AI', 'CONTENTBUDDY'];
  for (const s of saas) { if (d.includes(s)) return 'AOM'; }
  if (d.includes('FRYS-MKTPLACE') && Math.abs(amount) > 500) return 'AOM';
  if (d.includes('COX') && d.includes('COMM')) return 'AOM';
  if (d.includes('SRP')) return 'AOM';
  if (d.includes('PROGRESSIVE')) return 'AOM';
  if (d.includes('SERVICELINE')) return 'AOM';
  if (d.includes('KARL ASHLEY DE GUZMAN')) return 'AOM';
  return 'Patrik';
}

function parseNovoCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasOwner = header.includes('owner');

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',SUMMARY') || line.startsWith(',Total') || line.startsWith(',Net')) break;

    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    fields.push(current.trim());

    const dateStr = fields[0] || '';
    if (!dateStr || dateStr.startsWith(',')) continue;

    const desc = fields[1] || '';
    let amountStr = (fields[2] || '').replace(/[$,""]/g, '');
    const amount = parseFloat(amountStr) || 0;
    const category = fields[3] || '';

    const parts = dateStr.split('-');
    let isoDate;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        isoDate = dateStr;
      } else {
        isoDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
      }
    } else {
      isoDate = dateStr;
    }

    let owner, notes;
    if (hasOwner) {
      owner = fields[4] || '';
      notes = fields[5] || '';
    } else {
      notes = fields[3] || '';
      owner = autoTagOwner(desc, amount, fields[5] || category);
    }

    if (!owner) owner = autoTagOwner(desc, amount, category);

    results.push({ date: isoDate, description: desc, amount, category: hasOwner ? category : (fields[5] || category || ''), owner, notes });
  }
  return results;
}

function formatCurrency(n) {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

function formatDate(d) {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0].slice(2)}`;
  return d;
}

// AOM v4 brand tokens
const V4 = {
  bg: '#0C0C0C',
  card: '#151515',
  accent: '#E85D26',
  accentHover: '#D14E1C',
  textPrimary: '#F0ECE6',
  textSecondary: '#8A847C',
  border: 'rgba(255,255,255,0.10)',
  green: '#22c55e',
  red: '#ef4444',
  syne: "'Syne', sans-serif",
  space: "'Space Grotesk', sans-serif",
};

// Password gate (AOM v4 themed)
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      onAuth();
    } else {
      setError(true);
      setPw('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: V4.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: V4.syne, fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: '-0.02em' }}>
            AOM<span style={{ color: V4.accent }}>.</span>
          </span>
        </div>
        <h2 style={{ fontFamily: V4.syne, fontWeight: 700, fontSize: 20, color: V4.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>FINANCE</h2>
        <p style={{ color: V4.textSecondary, fontSize: 14, marginBottom: 24, fontFamily: V4.space }}>Enter password to continue</p>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="Password"
          style={{
            background: V4.card, border: error ? `1px solid ${V4.red}` : `1px solid ${V4.border}`, borderRadius: 10, padding: '12px 20px',
            color: V4.textPrimary, fontSize: 16, width: 260, outline: 'none', fontFamily: V4.space
          }}
        />
        <br />
        <button type="submit" style={{
          marginTop: 16, background: V4.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 32px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: V4.syne, textTransform: 'uppercase', letterSpacing: '0.1em'
        }}>Enter</button>
        {error && <p style={{ color: V4.red, fontSize: 13, marginTop: 12, fontFamily: V4.space }}>Wrong password</p>}
      </form>
    </div>
  );
}

// Stat card (AOM v4)
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: V4.card, borderRadius: 16, padding: '18px 20px', flex: '1 1 160px', minWidth: 150,
      border: `1px solid ${V4.border}`, transition: 'all 0.25s ease', cursor: 'default', position: 'relative', overflow: 'hidden'
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 0 20px ${color}18`;
        e.currentTarget.style.borderColor = `${color}33`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = V4.border;
      }}
    >
      <div style={{ color: V4.textSecondary, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6, fontFamily: V4.space }}>{label}</div>
      <div style={{ color: color, fontSize: 22, fontWeight: 700, fontFamily: V4.syne, letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ color: V4.textSecondary, fontSize: 12, marginTop: 4, fontFamily: V4.space }}>{sub}</div>}
    </div>
  );
}

export default function FinanceTracker() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === 'true');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterOwner, setFilterOwner] = useState('All');
  const [search, setSearch] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const fileRef = useRef(null);

  // Load AOM v4 fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Fetch all transactions via API
  const fetchTransactions = useCallback(async () => {
    try {
      const resp = await authFetch(API_URL);
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();

      if (!data.transactions || data.transactions.length === 0) {
        // Empty table: seed it via API upsert
        const rows = seedData.map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category || '',
          owner: t.owner || 'Review',
          notes: t.notes || '',
        }));
        await authFetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upsert', transactions: rows }),
        });
        // Re-fetch after seeding
        const resp2 = await authFetch(API_URL);
        const data2 = await resp2.json();
        setTransactions(data2.transactions || seedData);
      } else {
        setTransactions(data.transactions);
      }
    } catch (err) {
      // Denied (not the super-admin) or network error: never fall back to the
      // bundled seed, which contains real transactions. Show an empty table.
      console.error('Finance API fetch error:', err);
      setTransactions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchTransactions();
  }, [authed, fetchTransactions]);

  // Live sync when either user edits (corner:retire-supabase): a Convex
  // subscription on finance:list pushes the whole list on every change. The
  // rows are mapped the same way api/dashboard/finance.js maps them
  // (source -> owner, vendor -> notes), so the table never sees two shapes.
  const live = useConvexLive('finance:list', authed ? { limit: 2000 } : null);
  useEffect(() => {
    if (!authed || !Array.isArray(live.value)) return;
    if (live.value.length === 0) return; // the seed path in fetchTransactions owns the empty case
    setTransactions(live.value.map(shapeConvexRow));
  }, [authed, live.value]);

  // Owner change: optimistic local update + API persist
  const handleOwnerChange = useCallback((txn, newOwner) => {
    setTransactions(prev => prev.map(t =>
      t.id === txn.id ? { ...t, owner: newOwner } : t
    ));
    if (txn.id) {
      authFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-owner', id: txn.id, owner: newOwner }),
      }).then(r => {
        if (!r.ok) console.error('Owner update error');
      });
    }
  }, []);

  // CSV upload via API
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    const newTxns = parseNovoCSV(text);
    if (newTxns.length === 0) {
      setUploadMsg('No transactions found in file.');
      return;
    }

    try {
      const resp = await authFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', transactions: newTxns }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setUploadMsg('Upload error: ' + (data.error || 'Unknown'));
        return;
      }

      const inserted = data.inserted || 0;
      const dupes = newTxns.length - inserted;
      setUploadMsg(
        inserted > 0
          ? `Added ${inserted} new transactions${dupes > 0 ? `, skipped ${dupes} duplicates` : ''}.`
          : `All ${newTxns.length} transactions already exist. Nothing added.`
      );

      await fetchTransactions();
    } catch (err) {
      // Fallback for local dev without API
      const existing = new Set(transactions.map(t => `${t.date}|${t.description}|${t.amount}`));
      const unique = newTxns.filter(t => !existing.has(`${t.date}|${t.description}|${t.amount}`));
      if (unique.length > 0) {
        setTransactions(prev => [...prev, ...unique]);
        setUploadMsg(`Added ${unique.length} new transactions (local).`);
      } else {
        setUploadMsg(`All ${newTxns.length} transactions already exist.`);
      }
    }
  }, [transactions, fetchTransactions]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const header = 'Date,Description,Amount,Category,Owner,Notes\n';
    const rows = transactions.map(t =>
      `${t.date},"${t.description}",${t.amount},"${t.category}","${t.owner}","${t.notes || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aom-finance-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  // Date-filtered base (used by stats + full filter)
  const dateFiltered = useMemo(() => {
    let list = transactions;
    if (dateFrom) list = list.filter(t => t.date >= dateFrom);
    if (dateTo) list = list.filter(t => t.date <= dateTo);
    return list;
  }, [transactions, dateFrom, dateTo]);

  // Computed stats (react to date range)
  const stats = useMemo(() => {
    const src = dateFiltered;
    const revenue = src.filter(t => t.owner === 'Revenue').reduce((s, t) => s + t.amount, 0);
    const refunds = src.filter(t => t.owner === 'Refund').reduce((s, t) => s + t.amount, 0);
    const transfers = src.filter(t => t.owner === 'Transfer').reduce((s, t) => s + t.amount, 0);
    const expenses = src.filter(t => !['Revenue', 'Refund', 'Transfer'].includes(t.owner)).reduce((s, t) => s + t.amount, 0);
    const patrikSpend = src.filter(t => t.owner === 'Patrik').reduce((s, t) => s + t.amount, 0);
    const ashSpend = src.filter(t => t.owner === 'Ash').reduce((s, t) => s + t.amount, 0);
    const aomSpend = src.filter(t => t.owner === 'AOM').reduce((s, t) => s + t.amount, 0);
    const net = revenue + refunds + expenses + transfers;

    const catTotals = {};
    src.filter(t => t.amount < 0 && !['Revenue', 'Refund', 'Transfer'].includes(t.owner)).forEach(t => {
      const cat = t.category || 'Uncategorized';
      catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
    });
    const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    const expenseTxns = src.filter(t => t.amount < 0 && !['Revenue', 'Refund', 'Transfer'].includes(t.owner));
    const biggestExpense = expenseTxns.length ? expenseTxns.reduce((max, t) => Math.abs(t.amount) > Math.abs(max.amount) ? t : max, expenseTxns[0]) : null;

    const meals = src.filter(t => (t.category || '').toLowerCase() === 'meals').reduce((s, t) => s + t.amount, 0);

    const dates = src.map(t => new Date(t.date)).filter(d => !isNaN(d));
    let days = 1;
    if (dates.length > 1) {
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      days = Math.max(1, Math.round((max - min) / 86400000));
    }
    const dailySpend = Math.abs(expenses) / days;
    const monthlyBurn = dailySpend * 30;

    return {
      revenue, expenses, net, patrikSpend, ashSpend, aomSpend, refunds, transfers,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      dailySpend, biggestExpense, txnCount: src.length, monthlyBurn, meals
    };
  }, [dateFiltered]);

  // Sort and filter
  const filtered = useMemo(() => {
    let list = [...dateFiltered];

    if (filterOwner !== 'All') {
      list = list.filter(t => t.owner === filterOwner);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let va, vb;
      if (sortCol === 'date') { va = a.date; vb = b.date; }
      else if (sortCol === 'amount') { va = a.amount; vb = b.amount; }
      else if (sortCol === 'description') { va = a.description.toLowerCase(); vb = b.description.toLowerCase(); }
      else if (sortCol === 'category') { va = (a.category || '').toLowerCase(); vb = (b.category || '').toLowerCase(); }
      else if (sortCol === 'owner') { va = a.owner; vb = b.owner; }
      else { va = a[sortCol]; vb = b[sortCol]; }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [dateFiltered, filterOwner, search, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'date' ? 'desc' : 'asc');
    }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  // Clear data via API
  const clearData = useCallback(async () => {
    if (!window.confirm('Clear all finance data? This cannot be undone.')) return;
    try {
      await authFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-all' }),
      });
    } catch (err) {
      console.error('Clear error:', err);
    }
    setTransactions([]);
    setUploadMsg('Data cleared. Reloading seed...');
    await fetchTransactions();
  }, [fetchTransactions]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchTransactions();
    setUploadMsg('Refreshed from server.');
    setTimeout(() => setUploadMsg(''), 3000);
  }, [fetchTransactions]);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: V4.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${V4.card}`, borderTop: `2px solid ${V4.accent}`, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: V4.textSecondary, fontSize: 14, fontFamily: V4.space }}>Loading transactions...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.15em', color: V4.textSecondary, borderBottom: `1px solid ${V4.border}`, cursor: 'pointer',
    userSelect: 'none', whiteSpace: 'nowrap', fontFamily: V4.space
  };

  return (
    <div style={{ minHeight: '100vh', background: V4.bg, color: V4.textPrimary, fontFamily: V4.space, overflowX: 'hidden', maxWidth: '100vw', boxSizing: 'border-box', width: '100%' }}>
      {/* Header with diagonal pattern */}
      <div style={{
        padding: '32px 24px 24px', maxWidth: 1400, margin: '0 auto', position: 'relative',
        background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.04) 5px, rgba(232,93,38,0.04) 6px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
              <span style={{ fontFamily: V4.syne, fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
                AOM<span style={{ color: V4.accent }}>.</span>
              </span>
              <h1 style={{ fontFamily: V4.syne, fontWeight: 800, fontSize: 36, color: '#fff', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>FINANCE</h1>
            </div>
            <p style={{ color: V4.textSecondary, fontSize: 13, margin: '4px 0 0', fontFamily: V4.space, letterSpacing: '0.05em' }}>Q1 2026 Spending Tracker</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => fileRef.current?.click()} style={{
              background: V4.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: V4.syne, textTransform: 'uppercase', letterSpacing: '0.1em',
              transition: 'background 0.2s', minHeight: 44
            }}
              onMouseEnter={e => e.currentTarget.style.background = V4.accentHover}
              onMouseLeave={e => e.currentTarget.style.background = V4.accent}
            >
              Upload CSV
            </button>
            <button onClick={exportCSV} style={{
              background: 'transparent', color: V4.textSecondary, border: `1px solid ${V4.border}`, borderRadius: 10, padding: '10px 20px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: V4.space, letterSpacing: '0.05em',
              transition: 'border-color 0.2s', minHeight: 44
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = V4.accent + '55'}
              onMouseLeave={e => e.currentTarget.style.borderColor = V4.border}
            >
              Export CSV
            </button>
            <button onClick={handleRefresh} style={{
              background: 'transparent', color: V4.textSecondary, border: `1px solid ${V4.border}`, borderRadius: 10, padding: '10px 20px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: V4.space, letterSpacing: '0.05em', minHeight: 44
            }}>
              Refresh
            </button>
            <button onClick={clearData} style={{
              background: 'transparent', color: V4.textSecondary, border: `1px solid ${V4.border}`, borderRadius: 10, padding: '10px 16px',
              fontSize: 12, cursor: 'pointer', fontFamily: V4.space, opacity: 0.5, minHeight: 44
            }}>
              Reset
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Revenue" value={formatCurrency(stats.revenue)} color={V4.green} />
          <StatCard label="Expenses" value={formatCurrency(stats.expenses)} color={V4.red} />
          <StatCard label="Net" value={formatCurrency(stats.net)} color={stats.net >= 0 ? V4.green : V4.red} />
          <StatCard label="Patrik" value={formatCurrency(stats.patrikSpend)} color={V4.accent} />
          <StatCard label="Ash" value={formatCurrency(stats.ashSpend)} color="#A88560" />
          <StatCard label="AOM Business" value={formatCurrency(stats.aomSpend)} color={V4.green} />
        </div>
      </div>

      {/* Fun stats */}
      <div style={{ padding: '0 24px 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Top Category" value={stats.topCategory ? stats.topCategory.name : '--'} color="#A78BFA"
            sub={stats.topCategory ? formatCurrency(-stats.topCategory.amount) : ''} />
          <StatCard label="Avg Daily Spend" value={formatCurrency(-stats.dailySpend)} color="#F472B6" />
          <StatCard label="Biggest Expense" value={stats.biggestExpense ? formatCurrency(stats.biggestExpense.amount) : '--'} color={V4.accent}
            sub={stats.biggestExpense ? stats.biggestExpense.description.slice(0, 30) : ''} />
          <StatCard label="Transactions" value={stats.txnCount.toString()} color={V4.textPrimary} />
          <StatCard label="Monthly Burn" value={formatCurrency(-stats.monthlyBurn)} color={V4.red} />
          <StatCard label="Meals Total" value={formatCurrency(stats.meals)} color="#FBBF24" />
        </div>
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto 12px' }}>
          <div style={{ background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 10, padding: '10px 16px', color: V4.green, fontSize: 13, fontFamily: V4.space }}>
            {uploadMsg}
          </div>
        </div>
      )}

      {/* Drag and drop zone */}
      <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto 16px' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? V4.accent : V4.border}`,
            borderRadius: 14, padding: '20px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(232,93,38,0.05)' : 'transparent',
            transition: 'all 0.2s'
          }}
        >
          <p style={{ color: V4.textSecondary, fontSize: 13, margin: 0, fontFamily: V4.space }}>
            Drop a CSV here or click to upload
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto 12px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
          {['All', ...OWNER_OPTIONS].map(o => {
            const isActive = filterOwner === o;
            const badgeColor = o === 'All' ? V4.accent : (OWNER_COLORS[o]?.badge || V4.accent);
            return (
              <button
                key={o}
                onClick={() => setFilterOwner(o)}
                style={{
                  background: isActive ? badgeColor : V4.card,
                  color: isActive ? '#fff' : V4.textSecondary,
                  border: `1px solid ${isActive ? 'transparent' : V4.border}`,
                  borderRadius: 8, padding: '10px 14px', minHeight: 44, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: V4.space, textTransform: 'uppercase', letterSpacing: '0.1em',
                  transition: 'all 0.15s'
                }}
              >
                {o}
              </button>
            );
          })}
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              style={{
                width: '100%', background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 8,
                padding: '8px 14px', color: V4.textPrimary, fontSize: 13, outline: 'none', fontFamily: V4.space
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 8,
                padding: '6px 10px', color: V4.textPrimary, fontSize: 12, outline: 'none',
                fontFamily: V4.space, colorScheme: 'dark'
              }}
            />
            <span style={{ color: V4.textSecondary, fontSize: 12 }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                background: V4.card, border: `1px solid ${V4.border}`, borderRadius: 8,
                padding: '6px 10px', color: V4.textPrimary, fontSize: 12, outline: 'none',
                fontFamily: V4.space, colorScheme: 'dark'
              }}
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{
                  background: 'transparent', border: 'none', color: V4.accent,
                  fontSize: 12, cursor: 'pointer', fontFamily: V4.space, fontWeight: 600,
                  padding: '4px 8px'
                }}
              >
                CLEAR
              </button>
            )}
          </div>
          <span style={{ color: V4.textSecondary, fontSize: 12, fontFamily: V4.space, letterSpacing: '0.1em' }}>{filtered.length} RESULTS</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ overflowX: 'auto', borderRadius: 14, border: `1px solid ${V4.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: V4.card }}>
                <th onClick={() => handleSort('date')} style={{ ...thStyle, width: 100 }}>Date{sortArrow('date')}</th>
                <th onClick={() => handleSort('description')} style={{ ...thStyle, minWidth: 200 }}>Description{sortArrow('description')}</th>
                <th onClick={() => handleSort('amount')} style={{ ...thStyle, width: 110, textAlign: 'right' }}>Amount{sortArrow('amount')}</th>
                <th onClick={() => handleSort('category')} style={{ ...thStyle, width: 160 }}>Category{sortArrow('category')}</th>
                <th onClick={() => handleSort('owner')} style={{ ...thStyle, width: 130 }}>Owner{sortArrow('owner')}</th>
                <th style={{ ...thStyle, cursor: 'default', minWidth: 120 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const oc = OWNER_COLORS[t.owner] || OWNER_COLORS.Patrik;
                const rowBg = i % 2 === 0 ? V4.bg : V4.card;
                return (
                  <tr key={t.id || `${t.date}-${t.description}-${t.amount}-${i}`}
                    style={{ background: rowBg, borderBottom: `1px solid ${V4.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${oc.border}12`}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    <td style={{ padding: '8px 12px', color: V4.textSecondary, whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(t.date)}</td>
                    <td style={{ padding: '8px 12px', color: V4.textPrimary, fontWeight: 500 }}>
                      {t.description}
                    </td>
                    <td style={{
                      padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: V4.syne,
                      fontSize: 14, color: t.amount >= 0 ? V4.green : V4.red
                    }}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td style={{ padding: '8px 12px', color: V4.textSecondary, fontSize: 12 }}>{t.category}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={t.owner}
                        onChange={(e) => handleOwnerChange(t, e.target.value)}
                        style={{
                          background: `${oc.badge}18`, color: oc.text, border: `1px solid ${oc.badge}33`,
                          borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          outline: 'none', fontFamily: V4.space, appearance: 'auto', letterSpacing: '0.05em'
                        }}
                      >
                        {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', color: V4.textSecondary, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: V4.textSecondary, fontFamily: V4.space }}>No transactions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
