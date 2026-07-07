import React, { useState, useEffect } from 'react';
import { titleForAgent, AGENT_TITLES } from '../cv6next/data/agentTitles.js';
import { authFetch } from '../lib/authFetch';

/**
 * P6 — AssignButton
 *
 * Universal "Assign to agent" affordance for every artifact:
 * email (Support), file/doc (Organize), deliverable (Review), bug (Tracker), transcript.
 *
 * ALWAYS labelled exactly "Assign to agent" — never "Ask AI", "Run", "turn on", etc.
 *
 * Props:
 *   artifactType: 'email' | 'file' | 'doc' | 'bug' | 'transcript'
 *   artifactId: string (the real id in the source table)
 *   artifactTitle: string (display title, shown in confirm UI)
 *   projectSlug?: string (if known; passed to create-project-task)
 *   isQuiet?: boolean (render as .is-quiet variant — lighter, no accent icon)
 *   icon?: boolean (render with accent icon; default true if not quiet)
 *   onSuccess?: (task) => void (fired after create-project-task 200, before confirm closes)
 *   onError?: (err) => void (fired on POST error or validation fail)
 *   disabled?: boolean (render greyed out)
 *
 * Agent picker:
 *   - Fetches real agents from the live data stream (via useDataPipe or local agents list if provided).
 *   - Shows each agent as { slug, title: titleForAgent(slug), status }.
 *   - On click, shows a CONFIRM step, then REAL dispatch:
 *       POST /api/dashboard/supabase-messages { agent, text, role:'user', source }
 *       -> the ask lands in the agent's room thread (the same write path the chat
 *          composer uses); the bridge picks it up and the agent works it. Persisted
 *          forever in the messages table. Per-surface state (e.g. a bug's owner)
 *          persists through the onAssigned hook.
 *     (Was HELD-C until 2026-07-06: it logged to console and simulated success; and the
 *     agent list came from /active-agents, whose backing table active_processes does not
 *     exist -- the picker was empty everywhere. Now the roster loads from the same
 *     supabase-status source Home's agent rooms use. A tasks-table write was probed and
 *     rejected: the live tasks_status_check forbids 'todo', and repo-less 'queued' rows
 *     get auto-failed by task-runner.sh -- the room message IS the real dispatch path.)
 *
 * Picker UI:
 *   - Bottom sheet on mobile (390px).
 *   - Popover on desktop (1440px), anchored to the button.
 *   - Safe-area-inset padding on mobile.
 *   - Handles loading/empty/error states.
 */

function AgentPickerPopover({
  agents = [],
  artifactTitle = '',
  isLoading = false,
  onSelectAgent = () => {},
  onClose = () => {},
  isQuiet = false,
}) {
  const VIEWPORT = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const isMobile = VIEWPORT < 640;

  if (!isMobile) {
    // Desktop popover
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
        {/* Popover card */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 420,
            background: 'var(--ground)',
            border: '1px solid var(--hair)',
            borderRadius: 16,
            padding: '20px',
            zIndex: 41,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                Assign to agent
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {artifactTitle}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>

          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
              No agents available
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agents.map((agent) => (
                <button
                  key={agent.slug}
                  onClick={() => onSelectAgent(agent)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--hair)',
                    borderRadius: 11,
                    cursor: 'pointer',
                    color: 'var(--fg)',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--accent-weak)';
                    e.target.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--surface)';
                    e.target.style.borderColor = 'var(--hair)';
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.background = 'var(--accent-weak)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--hair)';
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'var(--avatar)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flex: 'none',
                    }}
                  >
                    {titleForAgent(agent).slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {titleForAgent(agent)}
                    </div>
                  </div>
                  {agent.status && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          agent.status === 'live'
                            ? 'var(--success-weak)'
                            : agent.status === 'ready'
                              ? 'var(--chip)'
                              : 'var(--warn-weak)',
                        color:
                          agent.status === 'live'
                            ? 'var(--success)'
                            : agent.status === 'ready'
                              ? 'var(--muted)'
                              : 'var(--warn)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile bottom sheet
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(4,6,9,0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />
      {/* Bottom sheet */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 41,
          background: 'var(--ground)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--hair)',
          borderBottom: 'none',
          padding: `16px 16px calc(16px + env(safe-area-inset-bottom))`,
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 -12px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
              Assign to agent
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {artifactTitle}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
            No agents available
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agents.map((agent) => (
              <button
                key={agent.slug}
                onClick={() => onSelectAgent(agent)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  border: '1px solid var(--hair)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: 'var(--fg)',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--avatar)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    flex: 'none',
                  }}
                >
                  {titleForAgent(agent).slice(0, 1).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {titleForAgent(agent)}
                  </div>
                </div>
                {agent.status && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '3px 7px',
                      borderRadius: 4,
                      background:
                        agent.status === 'live'
                          ? 'var(--success-weak)'
                          : agent.status === 'ready'
                            ? 'var(--chip)'
                            : 'var(--warn-weak)',
                      color:
                        agent.status === 'live'
                          ? 'var(--success)'
                          : agent.status === 'ready'
                            ? 'var(--muted)'
                            : 'var(--warn)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {agent.status}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmDialog({
  agent = null,
  artifactTitle = '',
  onConfirm = () => {},
  onCancel = () => {},
  isDispatching = false,
}) {
  const VIEWPORT = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const isMobile = VIEWPORT < 640;

  if (!isMobile) {
    // Desktop confirm dialog
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        {/* Scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
        {/* Dialog */}
        <div
          style={{
            position: 'relative',
            zIndex: 51,
            background: 'var(--ground)',
            border: '1px solid var(--hair)',
            borderRadius: 16,
            padding: '24px',
            maxWidth: 420,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
              Dispatch to {titleForAgent(agent)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Hand "{artifactTitle}" to {titleForAgent(agent)} for autonomous processing.
            </div>
          </div>

          <div
            style={{
              background: 'var(--accent-weak)',
              border: '1px solid var(--accent)',
              borderRadius: 11,
              padding: '12px',
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--muted)',
              lineHeight: 1.5,
            }}
          >
            This drops the ask in {titleForAgent(agent)}&rsquo;s room with the full context,
            so they pick it up from there.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: 10,
                color: 'var(--fg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDispatching}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: isDispatching ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: isDispatching ? 0.6 : 1,
              }}
            >
              {isDispatching ? 'Dispatching…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile confirm sheet
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(4,6,9,0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />
      {/* Bottom sheet */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 51,
          background: 'var(--ground)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--hair)',
          borderBottom: 'none',
          padding: `20px 16px calc(20px + env(safe-area-inset-bottom))`,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
            Dispatch to {titleForAgent(agent)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Hand "{artifactTitle}" to {titleForAgent(agent)} for autonomous processing.
          </div>
        </div>

        <div
          style={{
            background: 'var(--accent-weak)',
            border: '1px solid var(--accent)',
            borderRadius: 11,
            padding: '12px',
            marginBottom: 20,
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.5,
          }}
        >
          This drops the ask in {titleForAgent(agent)}&rsquo;s room with the full context,
          so they pick it up from there.
        </div>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            onClick={onConfirm}
            disabled={isDispatching}
            style={{
              padding: '12px 14px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isDispatching ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isDispatching ? 0.6 : 1,
            }}
          >
            {isDispatching ? 'Dispatching…' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--hair)',
              borderRadius: 10,
              color: 'var(--fg)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssignButton({
  artifactType = 'email', // 'email' | 'file' | 'doc' | 'bug' | 'deliverable' | 'transcript'
  artifactId = '',
  artifactTitle = '',
  title = '', // alias accepted from the overlay caller
  projectSlug = '',
  worldId = 'aom',
  details = '', // extra context carried into the dispatch (e.g. the changes list)
  isQuiet = false,
  icon = !isQuiet,
  agents = [], // If provided, use these instead of fetching
  autoOpen = false, // when mounted as an overlay, open the picker straight away
  onClose = () => {},
  onSuccess = () => {},
  onError = () => {},
  onAssigned = null, // optional per-surface persistence hook, called with the picked agent
  disabled = false,
}) {
  const label = artifactTitle || title || '(untitled)';
  const [showPicker, setShowPicker] = useState(autoOpen);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [agentList, setAgentList] = useState(agents);

  // Fetch agents whenever the picker is open and none were passed in. Source is
  // /api/dashboard/supabase-status (the agent_status roster) — the SAME source that
  // renders Home's agent rooms, so if Home shows agents, this picker shows agents.
  // (The old source, /active-agents, read the active_processes table, which does not
  // exist in production — the list was permanently empty.) A hard timeout means the
  // list can never get stuck on "Loading agents…" if the endpoint hangs — it degrades
  // to the honest "No agents available" state.
  useEffect(() => {
    if (agents.length > 0 || showPicker === false) return undefined;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    setIsLoading(true);
    authFetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(worldId || 'aom')}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => {
        const roster = Array.isArray(data.agents) ? data.agents : [];
        // Curate to the titled working roster (same doctrine as Home: agents render as
        // role titles). Unknown slugs only show when a world has NO titled agents at
        // all (external worlds with their own roster).
        const order = Object.keys(AGENT_TITLES);
        const titled = roster.filter((a) => AGENT_TITLES[String(a.slug || '').toLowerCase()]);
        const list = (titled.length ? titled : roster)
          .map((a) => ({
            slug: a.slug,
            status: String(a.status || '').toLowerCase() === 'working' ? 'live' : 'ready',
          }))
          .sort((x, y) => {
            const ix = order.indexOf(x.slug); const iy = order.indexOf(y.slug);
            return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy);
          });
        setAgentList(list);
      })
      .catch((err) => {
        console.error('[AssignButton] failed to fetch agent roster:', err);
        setAgentList([]);
      })
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [showPicker, agents, worldId]);

  // Closing the picker without a pick dismisses the whole overlay.
  const closePicker = () => { setShowPicker(false); onClose(); };

  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setShowPicker(false);
  };

  const handleConfirm = async () => {
    if (!selectedAgent || !selectedAgent.slug) {
      onError(new Error('No agent selected'));
      return;
    }

    setIsDispatching(true);

    const slug = selectedAgent.slug;
    const KIND = { email: 'email', file: 'file', doc: 'document', bug: 'bug', deliverable: 'deliverable', transcript: 'transcript' };
    const kind = KIND[artifactType] || 'item';
    const world = worldId || 'aom';
    // What the agent reads. Human-first line, then the notes, then the machine ref
    // so the agent can locate the exact artifact.
    const body = [
      `Assigned to you from the dashboard: ${kind} "${label}".`,
      details ? `\nNotes:\n${details}` : '',
      artifactId ? `\n(ref: ${artifactType}:${artifactId})` : '',
    ].filter(Boolean).join('\n');

    try {
      // Drop the ask in the agent's room thread — the same write path the chat
      // composer uses. The bridge picks it up, the agent works it, and the row is
      // the platform's eternal record of the assignment.
      const msgResp = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: slug,
          text: body,
          role: 'user',
          source: 'corner-dashboard',
          client_id: world,
          metadata: {
            assign: { type: artifactType, id: artifactId, project: projectSlug || null },
          },
        }),
      });

      if (!msgResp?.ok) {
        throw new Error(`assign dispatch failed (message ${msgResp?.status || '?'})`);
      }

      // Per-surface persistence (e.g. Tracker stamps the bug's assignee).
      if (typeof onAssigned === 'function') {
        try { await onAssigned(selectedAgent); } catch (e) { console.error('[AssignButton] onAssigned hook failed:', e); }
      }

      let msg = null;
      try { msg = (await msgResp.json())?.message || null; } catch { /* non-JSON */ }
      onSuccess({
        id: msg?.id || `assign-${Date.now()}`,
        title: `Assign: ${label}`,
        status: 'sent',
        agent: slug,
      });

      setSelectedAgent(null);
    } catch (err) {
      console.error('[AssignButton] dispatch failed:', err);
      onError(err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Cancelling the confirm step returns to the agent list, not a dead end.
  const handleCancel = () => {
    setSelectedAgent(null);
    setShowPicker(true);
  };

  return (
    <>
      {!autoOpen && (
        <button
          className={`assign ${isQuiet ? 'is-quiet' : ''}`}
          onClick={() => setShowPicker(true)}
          disabled={disabled}
          style={{
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {icon && !isQuiet && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="#fff"
              style={{ flex: 'none' }}
            >
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
          )}
          Assign to agent
        </button>
      )}

      {showPicker && (
        <AgentPickerPopover
          agents={agentList}
          artifactTitle={label}
          isLoading={isLoading}
          onSelectAgent={handleSelectAgent}
          onClose={closePicker}
          isQuiet={isQuiet}
        />
      )}

      {selectedAgent && (
        <ConfirmDialog
          agent={selectedAgent}
          artifactTitle={label}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isDispatching={isDispatching}
        />
      )}
    </>
  );
}
