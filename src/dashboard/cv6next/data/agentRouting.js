// agentRouting.js — R-B2: routing, explicitly the tunable part (TOP-20 #21)
//
// Each agent carries a one-line "call me when" in machine-readable form — a
// routing key, not a personality blurb. Anchor to the existing title map
// (agentTitles.js), which is already the public-facing truth: Creative, Design,
// Web, Content, Social, Operations, Outreach, Strategy, Advisory, QA, Media,
// Systems, Assistant.
//
// "The agents are easy to tune in the background." Target a sane hit rate,
// ship it, tune against real traffic later. Do not spend rounds chasing
// accuracy. A miss he corrects in one sentence is cheap — and R-B5 is what
// makes it cheap.
//
// This file is the routing table. The host (resolveRoomHost) owns the room;
// this decides who the host *summons* for a given message. The decision stays
// inside the room (host sees the conversation), not in a classifier in front.

import { titleForAgent } from './agentTitles.js'

// One-line "call me when" per agent — machine-readable, tunable.
// Keep it to keywords/phrases Patrik actually uses, not thesaurus dumps.
export const AGENT_ROUTING_KEYS = {
  director: {
    title: 'Creative',
    when: 'visual direction, brand, identity, emotion, belief, concept, style, references, creative brief, anything that will be seen',
    keywords: ['design', 'brand', 'visual', 'creative', 'logo', 'identity', 'style', 'direction', 'concept', 'belief', 'emotion', 'reference', 'mood', 'palette', 'type', 'layout', 'look', 'feel', 'pop', 'beautiful', 'aesthetic', 'inspiration', 'vision', 'voice', 'story'],
  },
  steffen: {
    title: 'Design',
    when: 'brand execution, visual identity details, graphic design, typography, spacing',
    keywords: ['typography', 'spacing', 'grid', 'component', 'design system', 'figma', 'mockup', 'pixel', 'ui', 'ux', 'wireframe', 'prototype', 'graphic', 'illustration', 'icon'],
  },
  bobby: {
    title: 'Web',
    when: 'website, app, code, engineering, build, ship, deploy, bug',
    keywords: ['website', 'web', 'code', 'build', 'engineer', 'app', 'deploy', 'ship', 'bug', 'fix', 'feature', 'api', 'frontend', 'backend', 'react', 'database', 'infra', 'hosting'],
  },
  elon: {
    title: 'Systems',
    when: 'system health, infrastructure, reliability, routing, performance',
    keywords: ['system', 'infra', 'health', 'performance', 'reliability', 'scale', 'monitor', 'log', 'error', 'uptime', 'bridge', 'relay', 'sync'],
  },
  cleo: {
    title: 'Content',
    when: 'video, footage, edit, reel, media, shoot, production',
    keywords: ['video', 'footage', 'edit', 'reel', 'cut', 'timeline', 'shoot', 'production', 'media', 'clip', 'audio', 'resolve', 'premiere', 'color', 'grade'],
  },
  tony: {
    title: 'Social',
    when: 'social content, posting, platform strategy, clips',
    keywords: ['social', 'post', 'tiktok', 'instagram', 'reels', 'clips', 'content', 'viral', 'hook', 'caption', 'hashtag', 'platform', 'audience', 'engagement'],
  },
  jacob: {
    title: 'Outreach',
    when: 'leads, outreach, prospecting, email, DM, growth',
    keywords: ['outreach', 'lead', 'prospect', 'email', 'dm', 'growth', 'pipeline', 'conversion', 'funnel', 'sequence', 'cold', 'warm', 'followup', 'campaign'],
  },
  alex: {
    title: 'Strategy',
    when: 'strategy, positioning, business, numbers, deal',
    keywords: ['strategy', 'positioning', 'business', 'numbers', 'deal', 'pricing', 'market', 'competitor', 'analysis', 'kpi', 'metric', 'revenue', 'growth', 'model'],
  },
  gary: {
    title: 'Operations',
    when: 'delivery, operations, priorities, tracking, keeping work on track',
    keywords: ['operations', 'delivery', 'priority', 'track', 'manage', 'coordinate', 'ops', 'process', 'workflow', 'timeline', 'deadline', 'ship', 'organize'],
  },
  rex: {
    title: 'Assistant',
    when: 'day-to-day, general help, keeping work moving, quick tasks',
    keywords: ['help', 'assist', 'task', 'todo', 'organize', 'schedule', 'remind', 'quick', 'general', 'simple', 'everyday'],
  },
  steve: {
    title: 'Advisory',
    when: 'technology advice, quality check, pitch, advisory',
    keywords: ['advice', 'advisory', 'technology', 'quality', 'check', 'pitch', 'review', 'consult', 'recommend', 'guidance'],
  },
  elmo: {
    title: 'QA',
    when: 'review, QA, testing, verification before ship',
    keywords: ['qa', 'quality', 'test', 'verify', 'review', 'check', 'assure', 'inspect', 'validate', 'before ship', 'final check'],
  },
  pixel: {
    title: 'Media',
    when: 'image generation, thumbnail, graphic asset, media creation',
    keywords: ['image', 'generate', 'thumbnail', 'graphic', 'asset', 'media', 'generate image', 'create image', 'render', 'visual asset'],
  },
}

// Score a message against routing keys. Returns ranked [{slug, title, score}] .
// Simple keyword overlap — deliberately dumb, tunable, no LLM classifier.
// The host sees the conversation, so this runs with full thread context if needed.
export function scoreAgentsForMessage(text, { priorMessages = [] } = {}) {
  const body = String(text || '').toLowerCase()
  const context = priorMessages.map((m) => String(m.text || '').toLowerCase()).join(' ')
  const full = `${context} ${body}`.trim()
  const scores = []
  for (const [slug, cfg] of Object.entries(AGENT_ROUTING_KEYS)) {
    let score = 0
    for (const kw of cfg.keywords) {
      const k = kw.toLowerCase()
      // Phrase match scores higher than single-word
      if (full.includes(k)) score += k.includes(' ') ? 3 : 1
      // Body match scores higher than context match
      if (body.includes(k)) score += 1
    }
    // Title mention is strong signal
    if (body.includes(cfg.title.toLowerCase())) score += 2
    scores.push({ slug, title: cfg.title, score, when: cfg.when })
  }
  return scores.sort((a, b) => b.score - a.score)
}

// Pick the best specialist for a message. Returns {slug, title, score, alternative}.
// Returns null if no signal (host keeps it). Creative-first floor is applied elsewhere (R-B4).
export function pickSpecialistForMessage(text, opts = {}) {
  const ranked = scoreAgentsForMessage(text, opts)
  const top = ranked[0]
  if (!top || top.score === 0) return null
  // Require at least 2 points to avoid random routing on "ok"
  if (top.score < 2) return null
  return { slug: top.slug, title: top.title, score: top.score, runnerUp: ranked[1] }
}

// Quick helper: is this a visual ask that must go Creative-first? (R-B4)
export function isVisualAsk(text) {
  const body = String(text || '').toLowerCase()
  const visualTriggers = ['design', 'brand', 'visual', 'logo', 'look', 'feel', 'style', 'beautiful', 'pop', 'aesthetic', 'creative', 'image', 'graphic', 'mockup', 'figma', 'type', 'palette', 'mood', 'inspiration', 'vision', 'beautiful', 'make it', 'landing page', 'hero', 'banner', 'deck', 'slide', 'pdf', 'html']
  return visualTriggers.some((t) => body.includes(t))
}
