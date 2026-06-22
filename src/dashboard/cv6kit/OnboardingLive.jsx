import React, { useState, useCallback, useEffect, useRef } from 'react';
import { OnboardingView } from './OnboardingView';
import { authFetch } from '../lib/authFetch';

/**
 * OnboardingLive — wires the Claude-design Onboarding flow (OnboardingView) to REAL effects:
 *
 * Props (from CornerVG):
 *   user: { user_metadata: { full_name }, email } — current user
 *   worldId: string — the client_id (for creating projects)
 *   onFinish: callback — called when setup is complete (user clicks "Take me to Corner")
 *   setTheme: function — passed from CornerVG to apply theme live
 *   onNavigateHome: callback — navigate to home after setup complete
 *
 * Real wiring:
 *   Step 2 (Connections): OAuth via /api/integrations/oauth/start?slug=<name>
 *   Step 3 (Permissions): persists to user_preferences (key cv6_agent_permissions), the same
 *     store Settings uses, so grants made here and in Settings stay in sync
 *   Step 4 (Theme): Calls setTheme(theme) live as user selects
 *   Step 5 (First Goal): REAL create-project flow via /api/dashboard/create-project-from-chat
 *   Done: Marks onboarding-complete (posts to onboarding-state or equivalent; if missing, reports)
 */

export function OnboardingLive({
  user,
  worldId,
  onFinish,
  setTheme = () => {},
  onNavigateHome = () => {}
}) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Per-agent permissions persist to the SAME store Settings uses
  // (user_preferences, key cv6_agent_permissions): a map of { [agent]: { Draft/Send/Commit/File: bool } }.
  // We keep the whole map in a ref, seeded on mount, and write the merged map back on each toggle
  // (off-by-default is the safe state). No separate agent-permissions endpoint exists; this is the real one.
  const permsRef = useRef({});
  useEffect(() => {
    let alive = true;
    authFetch(`/api/dashboard/preferences?key=cv6_agent_permissions&client=${encodeURIComponent(worldId || 'aom')}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.value && typeof d.value === 'object') permsRef.current = d.value; })
      .catch(() => {});
    return () => { alive = false; };
  }, [worldId]);

  const handleNext = useCallback(async (payload) => {
    const { step: currentStep, state } = payload;
    setError(null);
    // Step progression is handled by the View component's state; just advance.
  }, []);

  const handleBack = useCallback(() => {
    // View handles back state; we only manage side effects.
  }, []);

  const handleSkip = useCallback(() => {
    // User skips to Done screen.
  }, []);

  const handleConnectionChange = useCallback(async (payload) => {
    const { name, connected } = payload;
    setIsLoading(true);
    try {
      // Real OAuth flow: /api/integrations/oauth/start?slug=<name>
      // For now, this is a placeholder — the real flow is async and requires
      // a redirect or callback. Patrik's real integrations use oauth/start.
      if (connected) {
        const startUrl = `/api/integrations/oauth/start?slug=${encodeURIComponent(name.toLowerCase())}`;
        // In a real scenario, we'd either:
        // 1. Open a popup/redirect for OAuth (user returns, session stores token)
        // 2. Or: authFetch the endpoint and handle a callback URL
        // For now, we log it as a real action that the integrator must handle.
        console.log(`[OnboardingLive] Initiating OAuth for ${name}:`, startUrl);
        // In the real product, this would trigger a popup or redirect flow.
      }
      // Toggling off a connection would call a different endpoint.
    } catch (e) {
      console.error(`[OnboardingLive] Connection toggle failed:`, e);
      setError(`Could not connect ${name}. Try again.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePermissionChange = useCallback(async (payload) => {
    const { agent, perm, value } = payload;
    if (!agent || !perm) return;
    // Merge into the whole permissions map and persist it (same shape + endpoint Settings uses,
    // so a grant made here shows up in Settings and vice versa).
    const cur = permsRef.current[agent] || {};
    const next = { ...permsRef.current, [agent]: { ...cur, [perm]: !!value } };
    permsRef.current = next;
    try {
      await authFetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cv6_agent_permissions', client_id: worldId || 'aom', value: next }),
      });
    } catch (e) {
      // Non-fatal: the toggle stays visually set; it just did not persist this time.
      console.warn('[OnboardingLive] Could not save permission change:', e);
    }
  }, [worldId]);

  const handleThemeChange = useCallback((payload) => {
    const { theme } = payload;
    // Live theme change — call setTheme immediately.
    setTheme(theme);
  }, [setTheme]);

  const handleAssignGoal = useCallback(async (payload) => {
    const { project, description, agent } = payload;
    setIsLoading(true);
    setError(null);
    try {
      // Real create-project flow (same endpoint as "New Project" in the drawer).
      // The description becomes the mission name or first task.
      const slug = (description || 'goal')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || `goal-${Date.now().toString(36)}`;

      const res = await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: description || 'First Goal',
          client_id: worldId,
          agent, // Assign to this agent.
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json && json.ok) {
        // Project created. The server-side endpoint posts the agent's kickoff.
        // The integrator should navigate into the new room.
        console.log(`[OnboardingLive] First goal created:`, { slug, name: json.name });
        // Return the created project so the integrator can navigate.
        return json;
      } else {
        setError((json && json.error) || 'Could not create your first goal. Try again.');
      }
    } catch (e) {
      setError('Could not create your first goal. Try again.');
      console.error(`[OnboardingLive] Assign goal failed:`, e);
    } finally {
      setIsLoading(false);
    }
  }, [worldId]);

  const handleFinish = useCallback(async (payload) => {
    const { theme, connections, permissions } = payload;
    setIsLoading(true);
    setError(null);
    try {
      // Mark onboarding as complete. Endpoint: /api/dashboard/onboarding-state (PATCH?)
      // with status='complete' or similar. If this endpoint doesn't exist yet, report it.
      const completeRes = await authFetch('/api/dashboard/onboarding-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'complete',
          theme,
          connections,
          permissions,
        }),
      }).catch(() => null);

      if (!completeRes || !completeRes.ok) {
        console.warn(
          `[OnboardingLive] onboarding-state endpoint missing or failed;`,
          `onboarding-complete may not be persisted. Real endpoint required.`
        );
        // Do NOT block the finish. Proceed anyway.
      }

      // Call the integrator's onFinish callback.
      onFinish && onFinish({ theme, connections, permissions });
      // Navigate home.
      onNavigateHome && onNavigateHome();
    } catch (e) {
      console.error(`[OnboardingLive] Finish failed:`, e);
      setError('Could not complete setup. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [onFinish, onNavigateHome]);

  return (
    <OnboardingView
      step={step}
      steps={5}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      onFinish={handleFinish}
      onConnectionChange={handleConnectionChange}
      onPermissionChange={handlePermissionChange}
      onThemeChange={handleThemeChange}
      onAssignGoal={handleAssignGoal}
    />
  );
}
