// cv6next — real Onboarding data, shaped to wired/onboarding/onboarding.json.
// Guided first-run setup: connect → agents & permissions → theme → first goal → Home.
// Real data: step progression, theme selection (reuse Settings pattern).
// Held-c (no backing): OAuth connections, permissions, goal creation.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { setClientIdFromUser } from '../../lib/clientConfig';

const STEP_SEQUENCE = ['connect', 'agents', 'theme', 'goal'];
const STEP_LABELS = {
  connect: { eyebrow: 'Step 1 of 4 · Connections', title: 'Connect what your agents work with', sub: 'Email, code, calendar, files. Connect now or skip any and add it later. Each connection is scoped per room.', nextLabel: 'Continue' },
  agents: { eyebrow: 'Step 2 of 4 · Agents & permissions', title: 'Decide what each agent may do', sub: 'Set guardrails. You can always change this later.', nextLabel: 'Continue' },
  theme: { eyebrow: 'Step 3 of 4 · Appearance', title: 'Pick a look', sub: 'Dark, light, or glass. Applies everywhere.', nextLabel: 'Continue' },
  goal: { eyebrow: 'Step 4 of 4 · First goal', title: 'Set a first goal', sub: 'What would you like your agents to work on?', nextLabel: 'Finish → Home' },
};

export function useOnboarding(worldId = 'aom') {
  const [currentUser, setCurrentUser] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cv6-theme') || 'dark';
    }
    return 'dark';
  });
  const [state, setState] = useState('loading');

  // Watch auth state
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setClientIdFromUser(session.user);
        setCurrentUser(session.user);
        setState('ready');
      }
    });
    return () => sub?.unsubscribe?.();
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cv6-theme' && e.newValue) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const currentStepId = STEP_SEQUENCE[stepIndex];

  const data = useMemo(() => {
    if (!currentUser) return null;

    // Lead rail (constant across steps)
    const lead = {
      eyebrow: 'Welcome to Corner',
      title: 'Set up your workspace',
      sub: 'Connect what your agents work with, decide what they may do on their own, pick a look, and set a first goal.',
    };

    // Progress dots (one per step)
    const steps = STEP_SEQUENCE.map((s, i) => ({
      id: s,
      state: i < stepIndex ? 'done' : i === stepIndex ? 'on' : 'upcoming',
    }));

    // Current step info
    const stepLabel = STEP_LABELS[currentStepId] || {};
    const step = {
      eyebrow: stepLabel.eyebrow || '',
      title: stepLabel.title || '',
      sub: stepLabel.sub || '',
      counter: `Step ${stepIndex + 1} of 4`,
      nextLabel: stepLabel.nextLabel || 'Continue',
    };

    // Progress bar (mobile)
    const progressPct = ((stepIndex + 1) / STEP_SEQUENCE.length) * 100;
    const progress = {
      widthStyle: `width:${progressPct}%`,
    };

    // Connections (HELD-C: no OAuth wiring)
    // Honest NOT-CONNECTED state (connected=false). Clicking Connect button does not fake a connection.
    const connections = [
      {
        id: 'email',
        name: 'Email',
        desc: 'Read & draft replies',
        tint: 'pink',
        connected: false,
        actionLabel: 'Connect',
      },
    ];

    // Themes (REAL: read from localStorage + setTheme wires back)
    const themes = [
      { id: 'dark', label: 'Dark', selected: theme === 'dark' ? 'on' : false },
      { id: 'light', label: 'Light', selected: theme === 'light' ? 'on' : false },
      { id: 'glass', label: 'Glass', selected: theme === 'glass' ? 'on' : false },
    ];

    return {
      lead,
      steps,
      step,
      progress,
      connections,
      themes,
    };
  }, [currentUser, stepIndex, theme, currentStepId]);

  return { state, data, stepIndex, currentStep: currentStepId, setStepIndex, theme, setTheme };
}
