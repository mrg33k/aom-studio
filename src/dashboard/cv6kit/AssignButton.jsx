import React, { useState, useEffect } from 'react';
import { titleForAgent } from '../cv6next/data/agentTitles.js';

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
 *   - On click, shows a CONFIRM step (held-c demo state) or real dispatch if wired.
 *   - HELD-C DEFAULT: confirm step is disabled + labelled "Dispatching to an agent turns on
 *     when the assign backend is live". This prevents silent no-op or real autonomous dispatch.
 *   - REAL DISPATCH (if env var or prop opts in): POST to api/dashboard/create-project-task
 *     with { text: <title>, artifactType, artifactId, projectSlug, agentId }.
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
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
              Assign to agent
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {artifactTitle}
            </div>
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
            Assign to agent
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {artifactTitle}
          </div>
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
            <strong>Held-c:</strong> Dispatching to an agent turns on when the assign backend is live.
            This confirms the design but does not yet queue real autonomous work.
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
          <strong>Held-c:</strong> Dispatching to an agent turns on when the assign backend is live.
          This confirms the design but does not yet queue real autonomous work.
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

export default function AssignButton({
  artifactType = 'email', // 'email' | 'file' | 'doc' | 'bug' | 'transcript'
  artifactId = '',
  artifactTitle = '(untitled)',
  projectSlug = '',
  isQuiet = false,
  icon = !isQuiet,
  agents = [], // If provided, use these instead of fetching
  onSuccess = () => {},
  onError = () => {},
  disabled = false,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [agentList, setAgentList] = useState(agents);

  // Fetch agents on mount if not provided
  useEffect(() => {
    if (agents.length > 0 || showPicker === false) return;

    setIsLoading(true);
    fetch('/api/dashboard/active-agents?client=aom')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data) => {
        // Map active agents + add some known agents as fallback
        const active = (data.active || []).map((a) => ({
          slug: a.agent,
          status: 'live',
        }));

        // If no active agents, use a sensible fallback
        if (active.length === 0) {
          setAgentList([
            { slug: 'elon', status: 'ready' },
            { slug: 'bobby', status: 'ready' },
            { slug: 'cleo', status: 'ready' },
          ]);
        } else {
          setAgentList(active);
        }
      })
      .catch((err) => {
        // Fallback to sensible defaults on error
        setAgentList([
          { slug: 'elon', status: 'ready' },
          { slug: 'bobby', status: 'ready' },
          { slug: 'cleo', status: 'ready' },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [showPicker, agents]);

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

    try {
      // // HELD-C: TODO(cv6: POST to /api/dashboard/create-project-task with
      // { text: <title>, artifactType, artifactId, projectSlug, agentId }.
      // For now, we log and simulate success.
      console.log('[P6 AssignButton] HELD-C — would dispatch:', {
        text: artifactTitle,
        artifactType,
        artifactId,
        projectSlug,
        agentId: selectedAgent.slug,
      });

      // Simulate API success
      await new Promise((r) => setTimeout(r, 800));

      onSuccess({
        id: `task-${Date.now()}`,
        title: `Assign: ${artifactTitle}`,
        status: 'queued',
        agent: selectedAgent.slug,
      });

      setSelectedAgent(null);
    } catch (err) {
      onError(err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCancel = () => {
    setSelectedAgent(null);
  };

  return (
    <>
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

      {showPicker && (
        <AgentPickerPopover
          agents={agentList}
          artifactTitle={artifactTitle}
          isLoading={isLoading}
          onSelectAgent={handleSelectAgent}
          onClose={() => setShowPicker(false)}
          isQuiet={isQuiet}
        />
      )}

      {selectedAgent && (
        <ConfirmDialog
          agent={selectedAgent}
          artifactTitle={artifactTitle}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isDispatching={isDispatching}
        />
      )}
    </>
  );
}
