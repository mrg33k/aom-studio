import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../dashboard/lib/supabase.js';
import seedData from '../data/finance-seed.json';

const AUTH_KEY = 'aom-finance-auth';
const PASSWORD = 'aom2026';
const TABLE = 'finance_transactions';

const OWNER_OPTIONS = ['Patrik', 'Ash', 'AOM', 'Review', 'Revenue', 'Refund', 'Transfer'];

const OWNER_COLORS = {
  Patrik: { bg: 'rgba(59,130,246,0.10)', border: '#3B82F6', text: '#93C5FD', badge: '#3B82F6' },
  Ash: { bg: 'rgba(249,115,22,0.10)', border: '#F97316', text: '#FDBA74', badge: '#F97316' },
  AOM: { bg: 'rgba(34,197,94,0.10)', border: '#22C55E', text: '#86EFAC', badge: '#22C55E' },
  Review: { bg: 'rgba(234,179,8,0.10)', border: '#EAB308', text: '#FDE047', badge: '#EAB308' },
  Revenue: { bg: 'rgba(16,185,129,0.10)', border: '#10B981', text: '#6EE7B7', badge: '#10B981' },
  Refund: { bg: 'rgba(156,163,175,0.10)', border: '#9CA3AF', text: '#D1D5DB', badge: '#9CA3AF' },
  Transfer: { bg: 'rgba(156,163,175,0.08)', border: '#6B7280', text: '#9CA3AF', badge: '#6B7280' },
};

// Auto-tag rules for new CSV uploads
function autoTagOwner(desc, amount, category) {
  const d = desc.toUpperCase();
  // Revenue
  if (d.includes('SQUARE INC') && amount > 0) return 'Revenue';
  if (d.includes('INCLUDED HEALTH') && amount > 0) return 'Revenue';
  if (d.includes('SQ *ID') && amount > 0) return 'Revenue';
  // Refund
  if ((category || '').toLowerCase() === 'refund') return 'Refund';
  if (d.startsWith('RBT ') && amount > 0 && amount < 50) return 'Refund';
  if (d.includes('ATM FEE REIMBURSEMENT')) return 'Refund';
  // Transfer
  if ((category || '').toLowerCase() === 'bank transfer') return 'Transfer';
  // Ash
  if (d.includes('NELLIS AUCTION')) return 'Ash';
  if (d.includes('WWW.MAC.BID')) return 'Ash';
  // AOM software/SaaS
  const saas = ['CLAUDE', 'ADOBE', 'VERCEL', 'FRAME.IO', 'DROPBOX', 'REPLIT', 'GOOGLE*WORKSPACE', 'GOOGLE WORKSPACE', 'BLACKMAGIC', 'ELEVENLABS', 'BONSAI', 'ANTHROPIC', 'NETFLIX', 'HELLOBONSAI', 'PROSP AI', 'CONTENTBUDDY'];
  for (const s of saas) { if (d.includes(s)) return 'AOM'; }
  // AOM rent
  if (d.includes('FRYS-MKTPLACE') && Math.abs(amount) > 500) return 'AOM';
  // AOM utilities
  if (d.includes('COX') && d.includes('COMM')) return 'AOM';
  if (d.includes('SRP')) return 'AOM';
  // AOM insurance
  if (d.includes('PROGRESSIVE')) return 'AOM';
  if (d.includes('SERVICELINE')) return 'AOM';
  // AOM people
  if (d.includes('KARL ASHLEY DE GUZMAN')) return 'AOM';
  // Default
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

    // Parse CSV respecting quotes
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

    // Convert date
    const parts = dateStr.split('-');
    let isoDate;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        isoDate = dateStr; // already YYYY-MM-DD
      } else {
        isoDate = `${parts[2]}-${parts[0]}-${parts[1]}`; // MM-DD-YYYY -> YYYY-MM-DD
      }
    } else {
      isoDate = dateStr;
    }

    let owner, notes;
    if (hasOwner) {
      owner = fields[4] || '';
      notes = fields[5] || '';
    } else {
      // Novo format: Date, Description, Amount, Note, Check Number, Category
      notes = fields[3] || '';
      // fields[4] = check number, fields[5] = category from Novo
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

// Password gate
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
    <div style={{ minHeight: '100vh', background: '#0A0F1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 32, color: '#fff', marginBottom: 8, letterSpacing: 2 }}>AOM FINANCE</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>Enter password to continue</p>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="Password"
          style={{
            background: '#141B2D', border: error ? '1px solid #EF4444' : '1px solid #1E293B', borderRadius: 8, padding: '12px 20px',
            color: '#fff', fontSize: 16, width: 260, outline: 'none', fontFamily: "'Inter', sans-serif"
          }}
        />
        <br />
        <button type="submit" style={{
          marginTop: 16, background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif"
        }}>Enter</button>
        {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>Wrong password</p>}
      </form>
    </div>
  );
}

// Stat card
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: '#141B2D', borderRadius: 12, padding: '18px 20px', flex: '1 1 160px', minWidth: 150,
      border: `1px solid ${color}22`, transition: 'transform 0.2s', cursor: 'default'
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>{label}</div>
      <div style={{ color: color, fontSize: 22, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}>{value}</div>
      {sub && <div style={{ color: '#4B5563', fontSize: 11, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{sub}</div>}
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
  const fileRef = useRef(null);

  // Fetch all transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    if (!supabase) {
      // Fallback: no Supabase configured (local dev)
      setTransactions(seedData);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Empty table: seed it
        const rows = seedData.map(t => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category || '',
          owner: t.owner || 'Review',
          notes: t.notes || '',
        }));
        const { error: insertErr } = await supabase.from(TABLE).upsert(rows, { onConflict: 'date,description,amount' });
        if (insertErr) console.error('Seed insert error:', insertErr);
        // Re-fetch after seeding
        const { data: seeded } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
        setTransactions(seeded || seedData);
      } else {
        setTransactions(data);
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setTransactions(seedData);
    }
    setLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    if (authed) fetchTransactions();
  }, [authed, fetchTransactions]);

  // Owner change: instant local update + async Supabase write
  const handleOwnerChange = useCallback((txn, newOwner) => {
    // Optimistic local update
    setTransactions(prev => prev.map(t =>
      t.id === txn.id ? { ...t, owner: newOwner } : t
    ));
    // Persist to Supabase
    if (supabase && txn.id) {
      supabase
        .from(TABLE)
        .update({ owner: newOwner })
        .eq('id', txn.id)
        .then(({ error }) => {
          if (error) console.error('Owner update error:', error);
        });
    }
  }, []);

  // CSV upload: upsert to Supabase, then refresh
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    const newTxns = parseNovoCSV(text);
    if (newTxns.length === 0) {
      setUploadMsg('No transactions found in file.');
      return;
    }

    if (!supabase) {
      // Fallback for local dev without Supabase
      const existing = new Set(transactions.map(t => `${t.date}|${t.description}|${t.amount}`));
      const unique = newTxns.filter(t => !existing.has(`${t.date}|${t.description}|${t.amount}`));
      if (unique.length > 0) {
        setTransactions(prev => [...prev, ...unique]);
        setUploadMsg(`Added ${unique.length} new transactions.`);
      } else {
        setUploadMsg(`All ${newTxns.length} transactions already exist.`);
      }
      return;
    }

    const rows = newTxns.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category || '',
      owner: t.owner || 'Review',
      notes: t.notes || '',
    }));

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'date,description,amount', ignoreDuplicates: true })
      .select();

    if (error) {
      console.error('Upload error:', error);
      setUploadMsg('Upload error: ' + error.message);
      return;
    }

    const inserted = data?.length || 0;
    const dupes = newTxns.length - inserted;
    setUploadMsg(
      inserted > 0
        ? `Added ${inserted} new transactions${dupes > 0 ? `, skipped ${dupes} duplicates` : ''}.`
        : `All ${newTxns.length} transactions already exist. Nothing added.`
    );

    // Refresh from Supabase
    await fetchTransactions();
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

  // Computed stats
  const stats = useMemo(() => {
    const revenue = transactions.filter(t => t.owner === 'Revenue').reduce((s, t) => s + t.amount, 0);
    const refunds = transactions.filter(t => t.owner === 'Refund').reduce((s, t) => s + t.amount, 0);
    const transfers = transactions.filter(t => t.owner === 'Transfer').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => !['Revenue', 'Refund', 'Transfer'].includes(t.owner)).reduce((s, t) => s + t.amount, 0);
    const patrikSpend = transactions.filter(t => t.owner === 'Patrik').reduce((s, t) => s + t.amount, 0);
    const ashSpend = transactions.filter(t => t.owner === 'Ash').reduce((s, t) => s + t.amount, 0);
    const aomSpend = transactions.filter(t => t.owner === 'AOM').reduce((s, t) => s + t.amount, 0);
    const net = revenue + refunds + expenses + transfers;

    // Fun stats
    const catTotals = {};
    transactions.filter(t => t.amount < 0 && !['Revenue', 'Refund', 'Transfer'].includes(t.owner)).forEach(t => {
      const cat = t.category || 'Uncategorized';
      catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
    });
    const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    const expenseTxns = transactions.filter(t => t.amount < 0 && !['Revenue', 'Refund', 'Transfer'].includes(t.owner));
    const biggestExpense = expenseTxns.length ? expenseTxns.reduce((max, t) => Math.abs(t.amount) > Math.abs(max.amount) ? t : max, expenseTxns[0]) : null;

    const meals = transactions.filter(t => (t.category || '').toLowerCase() === 'meals').reduce((s, t) => s + t.amount, 0);

    // Days span
    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d));
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
      dailySpend, biggestExpense, txnCount: transactions.length, monthlyBurn, meals
    };
  }, [transactions]);

  // Sort and filter
  const filtered = useMemo(() => {
    let list = [...transactions];

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
  }, [transactions, filterOwner, search, sortCol, sortDir]);

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

  // Clear data: delete all from Supabase and re-seed
  const clearData = useCallback(async () => {
    if (!window.confirm('Clear all finance data? This cannot be undone.')) return;
    if (supabase) {
      // Delete all rows (Supabase requires a filter, so use gte on created_at)
      await supabase.from(TABLE).delete().gte('created_at', '1970-01-01');
    }
    setTransactions([]);
    setUploadMsg('Data cleared. Reloading seed...');
    await fetchTransactions();
  }, [fetchTransactions]);

  // Refresh button handler
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchTransactions();
    setUploadMsg('Refreshed from server.');
    setTimeout(() => setUploadMsg(''), 3000);
  }, [fetchTransactions]);

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #1E293B', borderTop: '2px solid #3B82F6', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#6B7280', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Loading transactions...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const headerStyle = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 };
  const bodyFont = { fontFamily: "'Inter', sans-serif" };
  const thStyle = {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1, color: '#6B7280', borderBottom: '1px solid #1E293B', cursor: 'pointer',
    userSelect: 'none', whiteSpace: 'nowrap', ...bodyFont
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1C', color: '#E5E7EB', ...bodyFont }}>
      {/* Header */}
      <div style={{ padding: '32px 24px 0', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ ...headerStyle, fontSize: 36, color: '#fff', letterSpacing: 3, margin: 0 }}>AOM FINANCE</h1>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Q1 2026 Spending Tracker</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => fileRef.current?.click()} style={{
              background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', ...bodyFont
            }}>
              Upload CSV
            </button>
            <button onClick={exportCSV} style={{
              background: 'transparent', color: '#6B7280', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', ...bodyFont
            }}>
              Export CSV
            </button>
            <button onClick={handleRefresh} style={{
              background: 'transparent', color: '#6B7280', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', ...bodyFont
            }}>
              Refresh
            </button>
            <button onClick={clearData} style={{
              background: 'transparent', color: '#4B5563', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 16px',
              fontSize: 12, cursor: 'pointer', ...bodyFont
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
          <StatCard label="Revenue" value={formatCurrency(stats.revenue)} color="#10B981" />
          <StatCard label="Expenses" value={formatCurrency(stats.expenses)} color="#EF4444" />
          <StatCard label="Net" value={formatCurrency(stats.net)} color={stats.net >= 0 ? '#10B981' : '#EF4444'} />
          <StatCard label="Patrik" value={formatCurrency(stats.patrikSpend)} color="#3B82F6" />
          <StatCard label="Ash" value={formatCurrency(stats.ashSpend)} color="#F97316" />
          <StatCard label="AOM Business" value={formatCurrency(stats.aomSpend)} color="#22C55E" />
        </div>
      </div>

      {/* Fun stats */}
      <div style={{ padding: '0 24px 20px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Top Category" value={stats.topCategory ? stats.topCategory.name : '--'} color="#A78BFA"
            sub={stats.topCategory ? formatCurrency(-stats.topCategory.amount) : ''} />
          <StatCard label="Avg Daily Spend" value={formatCurrency(-stats.dailySpend)} color="#F472B6" />
          <StatCard label="Biggest Expense" value={stats.biggestExpense ? formatCurrency(stats.biggestExpense.amount) : '--'} color="#FB923C"
            sub={stats.biggestExpense ? stats.biggestExpense.description.slice(0, 30) : ''} />
          <StatCard label="Transactions" value={stats.txnCount.toString()} color="#60A5FA" />
          <StatCard label="Monthly Burn" value={formatCurrency(-stats.monthlyBurn)} color="#F87171" />
          <StatCard label="Meals Total" value={formatCurrency(stats.meals)} color="#FBBF24" />
        </div>
      </div>

      {/* Upload zone + message */}
      {uploadMsg && (
        <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto 12px' }}>
          <div style={{ background: '#141B2D', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 16px', color: '#86EFAC', fontSize: 13 }}>
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
            border: `2px dashed ${dragOver ? '#3B82F6' : '#1E293B'}`,
            borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(59,130,246,0.05)' : 'transparent',
            transition: 'all 0.2s'
          }}
        >
          <p style={{ color: '#4B5563', fontSize: 13, margin: 0 }}>
            Drop a CSV here or click to upload
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto 12px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {['All', ...OWNER_OPTIONS].map(o => (
            <button
              key={o}
              onClick={() => setFilterOwner(o)}
              style={{
                background: filterOwner === o ? (o === 'All' ? '#3B82F6' : OWNER_COLORS[o]?.badge || '#3B82F6') : '#141B2D',
                color: filterOwner === o ? '#fff' : '#6B7280',
                border: `1px solid ${filterOwner === o ? 'transparent' : '#1E293B'}`,
                borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...bodyFont
              }}
            >
              {o}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              style={{
                width: '100%', background: '#141B2D', border: '1px solid #1E293B', borderRadius: 6,
                padding: '8px 14px', color: '#E5E7EB', fontSize: 13, outline: 'none', ...bodyFont
              }}
            />
          </div>
          <span style={{ color: '#4B5563', fontSize: 12 }}>{filtered.length} results</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #1E293B' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0F1629' }}>
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
                return (
                  <tr key={t.id || `${t.date}-${t.description}-${t.amount}-${i}`}
                    style={{ background: oc.bg, borderBottom: '1px solid #1E293B10', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${oc.border}18`}
                    onMouseLeave={e => e.currentTarget.style.background = oc.bg}
                  >
                    <td style={{ padding: '8px 12px', color: '#9CA3AF', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(t.date)}</td>
                    <td style={{ padding: '8px 12px', color: '#E5E7EB', fontWeight: 500 }}>
                      {t.description}
                    </td>
                    <td style={{
                      padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, color: t.amount >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: 12 }}>{t.category}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={t.owner}
                        onChange={(e) => handleOwnerChange(t, e.target.value)}
                        style={{
                          background: `${oc.badge}22`, color: oc.text, border: `1px solid ${oc.badge}44`,
                          borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          outline: 'none', ...bodyFont, appearance: 'auto'
                        }}
                      >
                        {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#4B5563' }}>No transactions found.</div>
          )}
        </div>
      </div>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </div>
  );
}
