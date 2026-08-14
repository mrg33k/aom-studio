// Campaign — the Email > Campaign tool (corner:campaign-tool R6).
//
// Mission control, today-first: the health strip answers "is it running?" in
// two seconds and every problem carries exactly ONE tap to fix it. Pipeline
// and city detail sit one tap deeper. Nothing here touches the chat bridge.
//
// Design gate: CV6 shell language — ink ground, hairline ink-850 cards, amber
// = waiting-on-you (same meaning as the nav needs badge), green dot = live,
// Support's segmented-tab idiom. Font: var(--font-sans).
import React, { useEffect, useMemo, useState } from 'react';
import {
  useCampaignList, useCampaignDetail, useCampaignHealth, useCampaignContacts,
  useCityDetail, useCampaignActivity, useCampaignActions,
} from './data/useCampaign.js';
import { authFetch } from '../lib/authFetch';
import { CornerLogoLoader } from '../cv6kit/FullscreenLoading.jsx';

const STAGE_LABELS = {
  to_contact: 'To contact', contacted: 'Contacted', replied: 'Replied',
  call_set: 'Call set', won: 'Won', lost: 'Lost', bounced: 'Bounced', noise: 'Auto-replies',
};
const PIPE_ORDER = ['to_contact', 'contacted', 'replied', 'call_set', 'won', 'bounced'];
const LIGHT_COLORS = {
  running: 'var(--green-500, #34D399)',
  waiting: 'var(--warn, #FBBF24)',
  paused: 'var(--warn, #FBBF24)',
  problem: '#F87171',
};

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const nowD = new Date();
  const sameDay = d.toDateString() === nowD.toDateString();
  const tmr = new Date(nowD.getTime() + 864e5);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
  if (sameDay) return `today ${time}`;
  if (d.toDateString() === tmr.toDateString()) return `tomorrow ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function StatusLight({ status, size = 10 }) {
  const pulse = status === 'waiting' || status === 'problem';
  return (
    <span
      className={pulse ? 'campaign-light-pulse' : undefined}
      style={{
        width: size, height: size, borderRadius: size / 2, flexShrink: 0,
        display: 'inline-block', background: LIGHT_COLORS[status] || 'var(--faint)',
      }}
    />
  );
}

function healthLine(health) {
  if (!health) return 'Checking…';
  if (health.status === 'running') {
    const last = health.lastRun
      ? `Last batch ${fmtWhen(health.lastRun.at)}${health.lastRun.sent != null ? ` (${health.lastRun.sent} emails)` : ''}.`
      : 'No batches sent yet.';
    const next = health.nextRun ? ` Next: ${fmtWhen(health.nextRun.at)}.` : ' Nothing scheduled.';
    return `Running. ${last}${next}`;
  }
  if (health.problem) return health.problem.label;
  return 'Checking…';
}

const card = {
  background: 'var(--surface)', border: '1px solid var(--hair)',
  borderRadius: 14, padding: 16,
};
const btnPrimary = (danger) => ({
  height: 44, minWidth: 110, padding: '0 22px', borderRadius: 22, border: 'none',
  background: danger ? '#F87171' : 'var(--accent)', color: '#fff',
  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
});
const btnGhost = {
  height: 32, padding: '0 14px', borderRadius: 16, border: '1px solid var(--hair)',
  background: 'transparent', color: 'var(--muted)', fontSize: 12.5, fontWeight: 500,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

// ---------------------------------------------------------------- health ---

function HealthStrip({ health, act, busy }) {
  const status = health?.status || 'unknown';
  const action = health?.action || null;
  const onFix = () => {
    if (!action) return;
    if (action.type === 'reconnect_email') {
      window.open('/api/integrations/oauth/start?slug=gmail', '_blank');
      return;
    }
    const op = action.type === 'resume' ? 'resume'
      : action.type === 'approve_batch' ? 'approve_batch'
      : action.type === 'retry_batch' ? 'retry_batch'
      : action.type === 'run_now' ? 'run_now' : null;
    if (op) act(op);
  };
  const isProblem = status === 'problem';
  const needsYou = status === 'waiting' || status === 'paused';
  // waiting-on-approval keeps ONE obvious tap: the TODAY batch card right
  // below carries the Send button, so the strip stays a status line.
  const showFix = action && (isProblem || status === 'paused');
  return (
    <div style={{ ...card, padding: 18, borderColor: isProblem ? 'rgba(248,113,113,.4)' : needsYou ? 'rgba(251,191,36,.35)' : 'var(--hair)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusLight status={status} size={12} />
        <div style={{ flex: 1, fontSize: 14.5, lineHeight: 1.45, color: 'var(--fg)', fontWeight: 500 }}>
          {healthLine(health)}
        </div>
      </div>
      {showFix && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{ ...btnPrimary(isProblem), flex: '1 1 auto', maxWidth: 340, height: 48 }}
            disabled={!!busy}
            onClick={onFix}
          >
            {busy ? 'Working…' : action.label}
          </button>
        </div>
      )}
      {health?.autopilot === false && status === 'running' && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--faint)' }}>
          Autopilot is off: each day's batch waits for your tap.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ goal ---

function GoalStrip({ campaign, stats }) {
  const target = campaign?.goal_target || 0;
  const won = stats?.won || 0;
  const pct = target ? Math.min(100, Math.round((won / target) * 100)) : 0;
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {target > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
              {won} / {target} {campaign?.goal_unit || 'won'}
            </span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-500, #34D399)', borderRadius: 3 }} />
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
 <span><b style={{ color: 'var(--fg)', fontSize: 15 }}>{stats?.sent ?? ', '}</b> sent</span>
 <span><b style={{ color: 'var(--fg)', fontSize: 15 }}>{stats?.replies ?? ', '}</b> replies</span>
 <span><b style={{ color: 'var(--fg)', fontSize: 15 }}>{stats?.calls ?? ', '}</b> calls</span>
 <span><b style={{ color: 'var(--fg)', fontSize: 15 }}>{stats?.won ?? ', '}</b> won</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- today ---

function TodayCards({ detail, act, busy, onOpenCity, onReviewFlagged, blocked }) {
  const today = detail?.today || {};
  const replies = today.newReplies || [];
  const batch = today.batch;
  const follow = today.followUpsDue || [];
  const flagged = today.flaggedCount || 0;
  const batchWaiting = batch && batch.status === 'awaiting_approval';
  const empty = !replies.length && !batchWaiting && !follow.length && !flagged;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--faint)' }}>TODAY</div>
      {batchWaiting && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, borderColor: 'rgba(251,191,36,.35)' }}>
          <StatusLight status="waiting" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              Batch ready: {batch.contact_count} emails
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Goes out the moment you approve.
            </div>
          </div>
          {blocked ? (
            <span style={{ fontSize: 12, color: 'var(--faint)', maxWidth: 120, textAlign: 'right' }}>
              fix the problem above first
            </span>
          ) : (
            <button style={{ ...btnPrimary(false), height: 44 }} disabled={!!busy} onClick={() => act('approve_batch', { batch_id: batch.id })}>
              {busy === 'approve_batch' ? 'Sending…' : 'Send'}
            </button>
          )}
        </div>
      )}
      {replies.map((r) => (
        <button key={r.id} onClick={() => onOpenCity(r.id)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ fontSize: 16 }}>✉</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              Reply: {(r.merge_fields && r.merge_fields.city) || r.name || r.email}
              {r.merge_fields?.state ? `, ${r.merge_fields.state}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{fmtWhen(r.last_reply_at)}</div>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>Read</span>
        </button>
      ))}
      {follow.map((f) => (
        <button key={f.id} onClick={() => onOpenCity(f.id)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, border: '2px solid var(--warn, #FBBF24)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
              Follow up: {(f.merge_fields && f.merge_fields.city) || f.name || f.email}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>due {fmtWhen(f.follow_up_due_at)}</div>
          </div>
        </button>
      ))}
      {flagged > 0 && (
        <button onClick={onReviewFlagged} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ fontSize: 15 }}>⚑</span>
          <div style={{ flex: 1, fontSize: 13.5, color: 'var(--fg)' }}>
            {flagged} contacts held by safety checks
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Review</span>
        </button>
      )}
      {empty && (
        <div style={{ ...card, fontSize: 13, color: 'var(--muted)' }}>
          Nothing needs you right now. Next batch goes out on schedule.
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- pipeline ---

function PipelineBar({ pipeline, active, onStage }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
      {PIPE_ORDER.map((s) => (
        <button
          key={s}
          onClick={() => onStage(active === s ? null : s)}
          style={{
            ...btnGhost, height: 34, flexShrink: 0,
            background: active === s ? 'var(--surface-2)' : 'transparent',
            color: active === s ? 'var(--fg)' : 'var(--muted)',
            borderColor: active === s ? 'var(--accent)' : 'var(--hair)',
          }}
        >
          {STAGE_LABELS[s]} <b style={{ marginLeft: 5 }}>{(pipeline && pipeline[s]) ?? 0}</b>
        </button>
      ))}
    </div>
  );
}

function StageList({ campaignId, worldId, stage, flagged, onOpenCity }) {
  const { rows, total, hasMore, more } = useCampaignContacts(campaignId, worldId, { stage, flagged });
  if (!rows) return <CornerLogoLoader inline compact label="Loading…" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--faint)' }}>
        {total.toLocaleString()} {flagged ? 'held by checks' : STAGE_LABELS[stage]?.toLowerCase()}
      </div>
      {rows.map((r) => (
        <button key={r.id} onClick={() => onOpenCity(r.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left', width: '100%',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(r.merge_fields && r.merge_fields.city) || r.name || r.email || 'contact'}
              {r.merge_fields?.state ? `, ${r.merge_fields.state}` : ''}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.hygiene_flag || r.email || 'no email yet'}
              {r.merge_fields?.population ? ` · pop ${Number(r.merge_fields.population).toLocaleString()}` : ''}
            </div>
          </div>
          {r.last_reply_at && <span style={{ fontSize: 11, color: 'var(--green-500, #34D399)' }}>replied</span>}
        </button>
      ))}
      {hasMore && (
        <button style={{ ...btnGhost, alignSelf: 'center', marginTop: 6 }} onClick={more}>Load more</button>
      )}
    </div>
  );
}

// ------------------------------------------------------------ city detail ---

function CityDetail({ campaignId, worldId, contactId, onClose, onOpenInbox, act, busy }) {
  const data = useCityDetail(campaignId, worldId, contactId);
  const ct = data?.contact;
  const mf = ct?.merge_fields || {};
  const replies = (data?.events || []).filter((e) => e.kind === 'replied');
  // the send ledger is part of the story: historical sends have no event row
  const timeline = [
    ...(data?.events || []),
    ...(data?.sends || []).map((s) => ({
      id: `send-${s.sent_at}`, kind: 'sent', summary: 'Email sent', created_at: s.sent_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
  const NEXT = { contacted: ['replied', 'call_set'], replied: ['call_set', 'won', 'lost'], call_set: ['won', 'lost'], noise: ['replied'] };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ ...btnGhost, height: 34 }}>‹ Back</button>
        <div style={{ flex: 1 }} />
        {ct?.reply_thread_id && (
          <button style={{ ...btnGhost, height: 34 }} onClick={onOpenInbox}>Open in Inbox</button>
        )}
      </div>
      {!ct ? (
        <CornerLogoLoader inline compact label="Loading…" />
      ) : (
        <>
          <div style={card}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>
              {mf.city || ct.name || ct.email}{mf.state ? `, ${mf.state}` : ''}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {ct.name && <span>{ct.name}</span>}
              {ct.email && <span>{ct.email}</span>}
              {mf.population && <span>Population {Number(mf.population).toLocaleString()}</span>}
              <span>Stage: <b style={{ color: 'var(--fg)' }}>{STAGE_LABELS[ct.stage] || ct.stage}</b></span>
              {ct.hygiene_flag && <span style={{ color: 'var(--warn, #FBBF24)' }}>Held: {ct.hygiene_flag}</span>}
            </div>
            {(NEXT[ct.stage] || []).length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {(NEXT[ct.stage] || []).map((s) => (
                  <button key={s} style={btnGhost} disabled={!!busy}
                    onClick={() => act('set_stage', { contact_id: ct.id, stage: s })}>
                    Mark {STAGE_LABELS[s].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          {replies.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 8 }}>REPLY</div>
              {replies.slice(0, 3).map((e) => (
                <div key={e.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtWhen(e.created_at)} · {e.details?.subject || ''}</div>
                  {e.details?.snippet && (
                    <div style={{ fontSize: 13.5, color: 'var(--fg)', marginTop: 4, lineHeight: 1.5 }}>{e.details.snippet}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 8 }}>HISTORY</div>
            {timeline.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>No touches yet.</div>}
            {timeline.map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--muted)', padding: '5px 0', borderBottom: '1px solid var(--divider)' }}>
                <span style={{ color: 'var(--faint)', flexShrink: 0, width: 88 }}>{fmtWhen(e.created_at)}</span>
                <span style={{ color: 'var(--fg)' }}>{e.summary}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------- activity ---

function ActivityFeed({ campaignId, worldId }) {
  const { feed } = useCampaignActivity(campaignId, worldId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--faint)' }}>RECENT</div>
      {!feed && <CornerLogoLoader inline compact label="Loading…" />}
      {feed && feed.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>No activity yet.</div>}
      {(feed || []).slice(0, 20).map((e) => (
        <div key={e.id} style={{ display: 'flex', gap: 10, fontSize: 12.5, padding: '4px 0' }}>
          <span style={{ color: 'var(--faint)', flexShrink: 0, width: 92 }}>{fmtWhen(e.created_at)}</span>
          <span style={{ color: 'var(--muted)' }}>{e.summary}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- wizard ---

const W_STEPS = ['Name', 'Audience', 'Message', 'Schedule', 'Launch'];
const PRESET = {
  name: '', goal_target: '', goal_unit: 'signed',
  template_subject: '', template_body: '',
  send_hour_local: 7, daily_cap: 50, autopilot: false,
};

function CreateWizard({ worldId, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ ...PRESET });
  const [audType, setAudType] = useState('csv'); // csv | dataset
  const [csvText, setCsvText] = useState('');
  const [csvInfo, setCsvInfo] = useState(null);
  const [dsFilters, setDsFilters] = useState({ states: '', pop_min: '', pop_max: '' });
  const [dsPreview, setDsPreview] = useState(null);
  const [connections, setConnections] = useState([]);
  const [connId, setConnId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    authFetch('/api/dashboard/mail/connections', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const list = d.connections || [];
        setConnections(list);
        if (list.length === 1) setConnId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const post = async (url, body) => {
    const r = await authFetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ world: worldId, ...body }),
    });
    return r.json();
  };

  const previewCsv = async (text) => {
    setCsvText(text);
    setCsvInfo(null);
    if (!text.trim()) return;
    const d = await post('/api/dashboard/campaign-audience', { op: 'parse_csv', csv: text });
    setCsvInfo(d.ok ? d : { error: d.error });
  };

  const previewDataset = async () => {
    const filters = {
      states: dsFilters.states.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean),
      pop_min: dsFilters.pop_min || null, pop_max: dsFilters.pop_max || null,
    };
    const d = await post('/api/dashboard/campaign-audience', { op: 'preview_dataset', dataset: 'us-municipalities', filters });
    setDsPreview(d.ok ? d : { error: d.error });
  };

  const launch = async () => {
    setBusy(true);
    setError('');
    const conn = connections.find((c) => c.id === connId);
    const audience = audType === 'csv'
      ? { source: 'csv_upload', csv: csvText, mapping: csvInfo?.mapping || {}, meta: { rows: csvInfo?.valid } }
      : {
          source: 'dataset', dataset: 'us-municipalities',
          filters: {
            states: dsFilters.states.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean),
            pop_min: dsFilters.pop_min || null, pop_max: dsFilters.pop_max || null,
          },
          meta: { dataset: 'us-municipalities' },
        };
    try {
      const d = await post('/api/dashboard/campaigns', {
        name: f.name, goal_target: f.goal_target || null, goal_unit: f.goal_unit,
        template_subject: f.template_subject, template_body: f.template_body,
        daily_cap: f.daily_cap, send_hour_local: f.send_hour_local, autopilot: f.autopilot,
        sending_connection_id: connId, sending_email: conn?.email || conn?.address || '',
        audience,
      });
      if (d.ok) onCreated(d.campaign);
      else setError(d.error || 'create failed');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const input = {
    width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
    border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)',
    fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
  };
  const label = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' };
  const canNext =
    step === 0 ? !!f.name.trim()
    : step === 1 ? (audType === 'csv' ? !!csvInfo?.valid : !!dsPreview?.count)
    : step === 2 ? !!(f.template_subject.trim() && f.template_body.trim())
    : step === 3 ? !!connId
    : true;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }}>
      <div style={{
        width: 'min(560px, 100%)', maxHeight: '92vh', overflow: 'auto',
        background: 'var(--ground)', border: '1px solid var(--hair)', borderRadius: 18, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>New campaign</div>
          <button onClick={onClose} style={btnGhost}>Close</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {W_STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'var(--surface-2)',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>
          {step + 1}. {W_STEPS[step]}
        </div>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={label}>Campaign name</span>
              <input style={input} value={f.name} placeholder="e.g. Spring city outreach" onChange={(e) => set('name', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={label}>Goal (number)</span>
                <input style={input} type="number" value={f.goal_target} placeholder="6" onChange={(e) => set('goal_target', e.target.value)} />
              </div>
              <div style={{ flex: 2 }}>
                <span style={label}>Goal unit</span>
                <input style={input} value={f.goal_unit} placeholder="cities signed" onChange={(e) => set('goal_unit', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btnGhost, background: audType === 'csv' ? 'var(--surface-2)' : 'transparent', color: audType === 'csv' ? 'var(--fg)' : 'var(--muted)' }} onClick={() => setAudType('csv')}>Upload CSV</button>
              <button style={{ ...btnGhost, background: audType === 'dataset' ? 'var(--surface-2)' : 'transparent', color: audType === 'dataset' ? 'var(--fg)' : 'var(--muted)' }} onClick={() => setAudType('dataset')}>US cities directory</button>
            </div>
            {audType === 'csv' ? (
              <div>
                <span style={label}>Contact list (CSV with an email column)</span>
                <input type="file" accept=".csv,text/csv" onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const rd = new FileReader();
                  rd.onload = () => previewCsv(String(rd.result || ''));
                  rd.readAsText(file);
                }} style={{ color: 'var(--muted)', fontSize: 13 }} />
                {csvInfo && !csvInfo.error && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>
                    <b style={{ color: 'var(--green-500, #34D399)' }}>{csvInfo.valid}</b> usable contacts
                    {' · '}{csvInfo.skipped.noEmail + csvInfo.skipped.badEmail + csvInfo.skipped.dupes} skipped
                    (no email {csvInfo.skipped.noEmail}, bad {csvInfo.skipped.badEmail}, duplicate {csvInfo.skipped.dupes})
                  </div>
                )}
                {csvInfo?.error && <div style={{ marginTop: 10, fontSize: 12.5, color: '#F87171' }}>{csvInfo.error}</div>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={label}>States (comma separated, blank = all)</span>
                  <input style={input} value={dsFilters.states} placeholder="AZ, TX, NM" onChange={(e) => setDsFilters((p) => ({ ...p, states: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span style={label}>Min population</span>
                    <input style={input} type="number" value={dsFilters.pop_min} placeholder="5000" onChange={(e) => setDsFilters((p) => ({ ...p, pop_min: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={label}>Max population</span>
                    <input style={input} type="number" value={dsFilters.pop_max} placeholder="500000" onChange={(e) => setDsFilters((p) => ({ ...p, pop_max: e.target.value }))} />
                  </div>
                </div>
                <button style={{ ...btnGhost, alignSelf: 'flex-start' }} onClick={previewDataset}>Preview count</button>
                {dsPreview && !dsPreview.error && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    <b style={{ color: 'var(--fg)' }}>{Number(dsPreview.count).toLocaleString()}</b> places match
                    {' · '}{dsPreview.withEmail} already have a contact email
                  </div>
                )}
                {dsPreview?.error && <div style={{ fontSize: 12.5, color: '#F87171' }}>{dsPreview.error}</div>}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={label}>Subject (merge fields: {'{{first_name}} {{city}} {{state}}'})</span>
              <input style={input} value={f.template_subject} placeholder="A note for {{city}}" onChange={(e) => set('template_subject', e.target.value)} />
            </div>
            <div>
              <span style={label}>Body</span>
              <textarea
                style={{ ...input, height: 180, padding: 12, lineHeight: 1.5, resize: 'vertical' }}
                value={f.template_body}
                placeholder={'Dear {{first_name}},\n\n…'}
                onChange={(e) => set('template_body', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <span style={label}>Send from</span>
              <select style={input} value={connId} onChange={(e) => setConnId(e.target.value)}>
                <option value="">Pick an email account…</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.email || c.address || c.id}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={label}>Daily cap</span>
                <input style={input} type="number" value={f.daily_cap} onChange={(e) => set('daily_cap', +e.target.value || 50)} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={label}>Send hour (local)</span>
                <input style={input} type="number" min="0" max="23" value={f.send_hour_local} onChange={(e) => set('send_hour_local', +e.target.value || 7)} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--fg)', cursor: 'pointer' }}>
              <input type="checkbox" checked={f.autopilot} onChange={(e) => set('autopilot', e.target.checked)} />
              Autopilot: send each day's batch without waiting for approval
            </label>
            {!f.autopilot && (
              <div style={{ fontSize: 12, color: 'var(--faint)' }}>
                Recommended: leave off. Each batch waits for your one-tap approve.
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: 'var(--fg)' }}>
 <div><b>{f.name}</b>{f.goal_target ? `, goal ${f.goal_target} ${f.goal_unit}` : ''}</div>
            <div style={{ color: 'var(--muted)' }}>
              Audience: {audType === 'csv'
                ? `${csvInfo?.valid || 0} contacts from CSV`
                : `${Number(dsPreview?.count || 0).toLocaleString()} US cities`}
            </div>
            <div style={{ color: 'var(--muted)' }}>Subject: {f.template_subject}</div>
            <div style={{ color: 'var(--muted)' }}>
              {f.daily_cap}/day at {f.send_hour_local}:00 · {f.autopilot ? 'autopilot ON' : 'approve each batch'}
            </div>
            <div style={{ color: 'var(--muted)' }}>
 From: {connections.find((c) => c.id === connId)?.email || '·'}
            </div>
            {error && <div style={{ color: '#F87171', fontSize: 12.5 }}>{error}</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {step > 0 && <button style={btnGhost} onClick={() => setStep(step - 1)}>Back</button>}
          <div style={{ flex: 1 }} />
          {step < 4 && (
            <button style={{ ...btnPrimary(false), opacity: canNext ? 1 : 0.4 }} disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
          {step === 4 && (
            <button style={btnPrimary(false)} disabled={busy} onClick={launch}>
              {busy ? 'Creating…' : 'Launch'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- message ---

// Mirror of the engine's render() in scripts/campaign-send.py — the preview
// must show EXACTLY what goes out: {{field}} fills from the contact's
// merge_fields, first_name falls back to the first word of the name or
// "there", and an unknown tag stays literal so a typo is visible, never
// silently blank.
function renderTemplate(template, contact) {
  const mf = { ...((contact && contact.merge_fields) || {}) };
  if (!mf.first_name) {
    const nm = String((contact && contact.name) || '').trim();
    mf.first_name = nm ? nm.split(/\s+/)[0] : 'there';
  }
  return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k) => String(mf[k] ?? '') || m);
}

const msgInput = {
  width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
  border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)',
  fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
};
const msgLabel = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' };

function MessageCard({ campaign, worldId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | error
  // One real recipient from the list keeps the preview honest — no invented data.
  const { rows } = useCampaignContacts(campaign?.id, worldId, { stage: 'to_contact', limit: 1 });
  const sample = (rows && rows[0]) || null;

  useEffect(() => { setEditing(false); setSaveState('idle'); }, [campaign?.id]);

  if (!campaign) return null;

  const draftSubject = editing ? subject : (campaign.template_subject || '');
  const draftBody = editing ? body : (campaign.template_body || '');
  const previewSubject = renderTemplate(draftSubject, sample);
  const previewBody = renderTemplate(draftBody, sample);
  const sampleCity = sample?.merge_fields?.city
    ? `${sample.merge_fields.city}${sample.merge_fields.state ? `, ${sample.merge_fields.state}` : ''}`
    : (sample?.name || sample?.email || null);

  const startEdit = () => {
    setSubject(campaign.template_subject || '');
    setBody(campaign.template_body || '');
    setEditing(true); setSaveState('idle');
  };
  const save = async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      const r = await authFetch('/api/dashboard/campaigns', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ world: worldId, id: campaign.id, template_subject: subject, template_body: body }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `save failed ${r.status}`);
      setEditing(false); setSaveState('idle');
      if (onSaved) onSaved();
    } catch {
      setSaveState('error');
    }
  };

  const hairRow = { display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--divider)', fontSize: 12.5 };
  const hairKey = { color: 'var(--faint)', width: 52, flexShrink: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--faint)', flex: 1 }}>MESSAGE</div>
        {!editing && <button style={btnGhost} onClick={startEdit}>Edit message</button>}
      </div>

      {editing && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={msgLabel}>Subject</span>
            <input style={msgInput} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <span style={msgLabel}>Body</span>
            <textarea
              style={{ ...msgInput, height: 200, padding: 12, lineHeight: 1.5, resize: 'vertical' }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {Array.isArray(campaign.merge_fields) && campaign.merge_fields.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Fills in per contact:</span>
              {campaign.merge_fields.map((f) => (
                <code key={f} style={{
                  fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--muted)',
                  background: 'var(--surface-2)', border: '1px solid var(--hair)',
                  borderRadius: 8, padding: '2px 7px',
                }}>{`{{${f}}}`}</code>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', marginTop: 2 }}>
          RECIPIENT VIEW · UPDATES AS YOU TYPE
        </div>
      )}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={hairRow}>
          <span style={hairKey}>From</span>
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{campaign.sending_email || 'your connected email'}</span>
        </div>
        <div style={hairRow}>
          <span style={hairKey}>To</span>
          <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
            {sample ? `${sample.name ? `${sample.name} ` : ''}${sample.email ? `<${sample.email}>` : ''}` : 'each contact on your list'}
          </span>
        </div>
        <div style={{ ...hairRow, borderBottom: '1px solid var(--hair)' }}>
          <span style={hairKey}>Subject</span>
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{previewSubject || '(no subject yet)'}</span>
        </div>
        <div style={{ padding: '14px 16px 16px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg)', whiteSpace: 'pre-wrap' }}>
          {previewBody || 'No message written yet. Tap Edit message to write it.'}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.5 }}>
        {sampleCity
          ? `This is the email exactly as it goes out, previewed with ${sampleCity} from your list. Every send fills in that contact's own details.`
          : 'Fields like {{city}} fill in with each contact’s own details when the email goes out.'}
      </div>
      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <button
            style={{ ...btnPrimary(false), height: 36, minWidth: 0, padding: '0 18px', fontSize: 13, opacity: saveState === 'saving' ? 0.6 : 1 }}
            disabled={saveState === 'saving'}
            onClick={save}
          >
            {saveState === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          <button style={btnGhost} disabled={saveState === 'saving'} onClick={() => { setEditing(false); setSaveState('idle'); }}>Cancel</button>
          {saveState === 'error' && (
            <span style={{ fontSize: 12.5, color: '#F87171' }}>Didn't save. Try again.</span>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ main ---

export default function Campaign({ isDesktop, worldId, onOpenInbox }) {
  const { campaigns, campaignSetup, error: listError, reload: reloadList, localMode } = useCampaignList(worldId);
  const [selectedId, setSelectedId] = useState(null);
  const [cityId, setCityId] = useState(null);
  const [stage, setStage] = useState(null);
  const [flagged, setFlagged] = useState(false);
  const [wizard, setWizard] = useState(false);

  useEffect(() => {
    if (!selectedId && campaigns && campaigns.length) setSelectedId(campaigns[0].id);
  }, [campaigns, selectedId]);

  const { detail, reload: reloadDetail } = useCampaignDetail(selectedId, worldId);
  const { health, reload: reloadHealth } = useCampaignHealth(selectedId, worldId);
  const { act, busy } = useCampaignActions(selectedId, worldId, () => {
    reloadHealth();
    reloadDetail();
  });

  const campaign = detail?.campaign || (campaigns || []).find((c) => c.id === selectedId) || null;

  // campaigns === null means the list hasn't loaded (worldId unresolved, fetch in
  // flight, or fetch failing — the hook retries on its 20s poll). Rendering the
  // detail skeleton here looked like a broken/unconfigured page (corner:support R3).
  if (!campaigns && !wizard) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center', padding: 32 }}>
          {listError
            ? <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Campaigns didn’t load. Retrying automatically.</div>
            : <CornerLogoLoader inline compact label="Loading campaigns…" />}
        </div>
      </div>
    );
  }

  if (campaignSetup?.status === 'misfiled' && !wizard) {
    const misfiledCount = campaignSetup.misfiled_count || campaignSetup.misfiled_campaigns?.length || 0;
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center', padding: 32, borderColor: 'rgba(251,191,36,.35)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>Campaign setup needs repair</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            {misfiledCount === 1 ? 'A campaign exists' : `${misfiledCount} campaigns exist`}, but the server found
            {misfiledCount === 1 ? ' it' : ' them'} under a workspace key that is not assigned to this workspace.
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 12, lineHeight: 1.45 }}>
            No campaign controls are shown until the backend filing is corrected.
          </div>
        </div>
      </div>
    );
  }

  if (campaignSetup?.status === 'not_configured' && !wizard) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ ...card, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>No campaigns yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            {localMode
              ? 'Campaigns appear here once your workspace is connected. Nothing is queued locally.'
              : 'A campaign sends a personal email to a list, a batch a day, tracks every reply, and shows you exactly where each contact stands.'}
          </div>
          {!localMode && (
            <button style={{ ...btnPrimary(false), marginTop: 18 }} onClick={() => setWizard(true)}>
              Create your first campaign
            </button>
          )}
        </div>
      </div>
    );
  }

  const missionControl = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
      {(campaigns || []).length > 1 && (
        <select
          value={selectedId || ''}
          onChange={(e) => { setSelectedId(e.target.value); setCityId(null); setStage(null); }}
          style={{
            height: 38, borderRadius: 10, border: '1px solid var(--hair)',
            background: 'var(--surface)', color: 'var(--fg)', padding: '0 10px',
            fontSize: 13.5, fontFamily: 'var(--font-sans)', alignSelf: 'flex-start',
          }}
        >
          {(campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: isDesktop ? 20 : 17, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>
          {campaign?.name || '…'}
        </div>
        <button style={btnGhost} onClick={() => setWizard(true)}>+ New</button>
      </div>
      <HealthStrip health={health} act={act} busy={busy} />
      <GoalStrip campaign={campaign} stats={detail?.stats || campaign?.stats} />
      <TodayCards
        detail={detail}
        act={act}
        busy={busy}
        blocked={health?.status === 'problem'}
        onOpenCity={(id) => setCityId(id)}
        onReviewFlagged={() => { setFlagged(true); setStage(null); }}
      />
      <MessageCard campaign={campaign} worldId={worldId} onSaved={reloadDetail} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--faint)' }}>PIPELINE</div>
        <PipelineBar pipeline={detail?.pipeline} active={flagged ? null : stage} onStage={(s) => { setStage(s); setFlagged(false); }} />
        {(stage || flagged) && (
          <StageList campaignId={selectedId} worldId={worldId} stage={flagged ? null : stage} flagged={flagged} onOpenCity={setCityId} />
        )}
      </div>
      <div style={{ marginTop: 4 }}>
        <ActivityFeed campaignId={selectedId} worldId={worldId} />
      </div>
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>Autopilot</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {campaign?.autopilot ? 'Batches send automatically within the daily cap.' : 'Each batch waits for your approval.'}
          </div>
        </div>
        <button style={btnGhost} disabled={!!busy} onClick={() => act('autopilot', { enabled: !campaign?.autopilot })}>
          {campaign?.autopilot ? 'Turn off' : 'Turn on'}
        </button>
        {campaign?.status === 'active'
          ? <button style={btnGhost} disabled={!!busy} onClick={() => act('pause')}>Pause</button>
          : campaign?.status === 'paused'
            ? <button style={btnGhost} disabled={!!busy} onClick={() => act('resume')}>Resume</button>
            : null}
      </div>
    </div>
  );

  const cityPane = cityId ? (
    <CityDetail
      campaignId={selectedId}
      worldId={worldId}
      contactId={cityId}
      onClose={() => setCityId(null)}
      onOpenInbox={onOpenInbox}
      act={act}
      busy={busy}
    />
  ) : null;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: isDesktop ? '20px 24px' : '14px 14px calc(24px + env(safe-area-inset-bottom))' }}>
      {isDesktop ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ flex: '0 1 640px', minWidth: 0 }}>{missionControl}</div>
          {cityPane && (
            <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 0, maxHeight: 'calc(100vh - 140px)' }}>
              {cityPane}
            </div>
          )}
        </div>
      ) : cityPane ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--ground)', padding: '14px 14px calc(24px + env(safe-area-inset-bottom))', overflow: 'auto' }}>
          {cityPane}
        </div>
      ) : (
        missionControl
      )}
      {wizard && (
        <CreateWizard
          worldId={worldId}
          onClose={() => setWizard(false)}
          onCreated={(c) => { setWizard(false); reloadList(); setSelectedId(c.id); }}
        />
      )}
    </div>
  );
}