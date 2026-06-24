// cv6next — real Onboarding data, shaped to wired/onboarding/onboarding.json.
// Guided first-run setup: connect → agents & permissions → theme → first goal → Home.
// Real data: step progression, theme selection (reuse Settings pattern).
// Held-c (no backing): OAuth connections, permissions, goal creation.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { setClientIdFromUser } from '../../lib/clientConfig';

const STEP_SEQUENCE = ['welcome', 'connect', 'agents', 'theme', 'goal', 'done'];
const STEP_LABELS = {
  welcome: { eyebrow: 'Welcome', title: 'Meet your agent workspace', sub: 'Corner runs a team of AI agents across your projects. They work, then bring you the decisions. Let's set up your environment — it takes a minute.', nextLabel: 'Continue' },
  connect: { eyebrow: 'Step 2 of 5 · Environment', title: 'Connect your environment', sub: 'Your environment is everything the agents can read and act on. Connect the services you use — you can change these anytime.', nextLabel: 'Continue' },
  agents: { eyebrow: 'Step 3 of 5 · Trust', title: 'What can agents do on their own?', sub: 'Set the guardrails. Anything left off still gets done — the agent just asks you first.', nextLabel: 'Continue' },
  theme: { eyebrow: 'Step 4 of 5 · Appearance', title: 'Choose your look', sub: 'Dark, Light and Glass are all first-class. Tap one to preview it live.', nextLabel: 'Continue' },
  goal: { eyebrow: 'Step 5 of 5 · First goal', title: 'Assign your first goal', sub: 'Pick a project, describe the outcome, and assign it to an agent. You'll see it run in Command.', nextLabel: 'Finish setup' },
  done: { eyebrow: 'All set', title: 'You're ready to go', sub: '', nextLabel: 'Take me to Corner' },
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
      counter: `Step ${stepIndex + 1} of 6`,
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
      {
        id: 'github',
        name: 'GitHub',
        desc: 'Repos & pull requests',
        tint: 'violet',
        connected: false,
        actionLabel: 'Connect',
      },
      {
        id: 'calendar',
        name: 'Calendar',
        desc: 'Schedule & meetings',
        tint: 'accent',
        connected: false,
        actionLabel: 'Connect',
      },
      {
        id: 'slack',
        name: 'Slack',
        desc: 'Team messages',
        tint: 'success',
        connected: false,
        actionLabel: 'Connect',
      },
      {
        id: 'drive',
        name: 'Drive',
        desc: 'Files & documents',
        tint: 'warn',
        connected: false,
        actionLabel: 'Connect',
      },
    ];

    // Agents & permissions (HELD-C: no backend wiring, all shown as off)
    // Honest: toggles exist but don't wire to backend
    const agents = [
      {
        id: 'elon',
        name: 'Elon',
        role: 'Engineering · drives missions',
        permissions: {
          draft: false,
          send: false,
          commit: false,
          file: false,
        },
      },
      {
        id: 'rex',
        name: 'Rex',
        role: 'Writing · drafts & digests',
        permissions: {
          draft: false,
          send: false,
          commit: false,
          file: false,
        },
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
      agents,
      themes,
    };
  }, [currentUser, stepIndex, theme, currentStepId]);

  return { state, data, stepIndex, currentStep: currentStepId, setStepIndex, theme, setTheme };
}
