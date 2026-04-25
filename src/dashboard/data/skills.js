// Static skill list for autocomplete dropdown (Power Ups)
// Source: AOM-EA/.claude/skills/INDEX.md
// Each skill: { name, trigger, description, category }

const SKILLS = [
  // Video / Content Production
  { name: 'Footage Review', trigger: '/footage-review', description: 'Scan and catalog new footage with ratings', category: 'Video' },
  { name: 'Footage Reorganize', trigger: '/footage-reorganize', description: 'Clean up messy footage folder structure', category: 'Video' },
  { name: 'Instant Watch', trigger: '/instant-watch', description: 'Watch and report on any video instantly', category: 'Video' },
  { name: 'B-Roll Story Cut', trigger: '/b-roll-story-cut', description: 'Full structured edit from transcript to final cut', category: 'Video' },
  { name: 'Fast Recut', trigger: '/fast-recut', description: 'Quick recut of existing footage', category: 'Video' },
  { name: 'Doc Social Edit', trigger: '/doc-social-edit', description: 'Documentary-style clip edited for social', category: 'Video' },
  { name: 'Audio Align', trigger: '/audio-align', description: 'Sync lav mic audio to camera audio', category: 'Video' },
  { name: 'Audio Library', trigger: '/audio-library', description: 'Browse and select music from the audio library', category: 'Video' },
  { name: 'Auto Color', trigger: '/auto-color', description: 'Apply LUT color grade to video', category: 'Video' },
  { name: 'Auto Timeline', trigger: '/auto-timeline', description: 'Export edit timeline from cut plan', category: 'Video' },
  { name: 'Lip Sync', trigger: '/lip-sync', description: 'Sync lip movement to audio', category: 'Video' },
  { name: 'Text Overlay', trigger: '/text-overlay', description: 'Add text and caption overlays to reels', category: 'Video' },
  { name: 'Video Overlay', trigger: '/video-overlay', description: 'Composite animated video overlay on footage', category: 'Video' },
  { name: 'AI Video Gen', trigger: '/ai-video-gen', description: 'Generate video and images with AI tools', category: 'Video' },
  { name: 'Storyboard', trigger: '/storyboard', description: 'Generate visual storyboard frames from script', category: 'Video' },
  { name: 'Butter Method', trigger: '/butter-method', description: 'AI assistant editor: picks clips, builds timeline', category: 'Video' },
  { name: 'Watch and Learn', trigger: '/watch-and-learn', description: 'Reference-based editing: analyze, plan, push to Resolve', category: 'Video' },
  { name: 'Workspace Init', trigger: '/video-workspace-init', description: 'Scaffold a shoot workspace: source/bins/sequences + BRIEF.md + PHONEBOOK.md', category: 'Video' },
  { name: 'Transcript Tools', trigger: '/video-transcript-tools', description: 'Work with transcript JSON: jq patterns, word-boundary verification', category: 'Video' },
  { name: 'Proxy Create', trigger: '/video-proxy-create', description: 'Create H.264 proxies from heavy source (MXF/BRAW/R3D), multi-channel audio', category: 'Video' },
  { name: 'Ad Build', trigger: '/video-ad-build', description: 'Short-form ad build: Hook/Body/CTA, one angle per ad, brand isolation', category: 'Video' },
  { name: 'Video Template', trigger: '/video-template', description: 'Named video templates A-Z. Brand-neutral forms adapted at call time.', category: 'Video' },
  { name: 'Video Pipeline', trigger: '/video-pipeline', description: 'Umbrella router for video work: picks the right sub-skill chain', category: 'Video' },
  { name: 'Stabilize', trigger: '/video-stabilize', description: 'Stabilize a clip: Gyroflow gyro first, falls back to ffmpeg deshake', category: 'Video' },
  { name: 'Footage Tagging', trigger: '/footage-tagging', description: 'Tag footage clips (rating, room, fixes, edit purpose) before any cut', category: 'Video' },

  // Audio
  { name: 'ElevenLabs Voice', trigger: '/elevenlabs-voice', description: 'Generate voiceover from script', category: 'Audio' },
  { name: 'Voice Clone', trigger: '/voice-clone', description: 'Generate audio using a cloned voice', category: 'Audio' },
  { name: 'Suno Music', trigger: '/suno-music', description: 'Generate original music for a project', category: 'Audio' },

  // Brand / Design
  { name: 'Brand Agent', trigger: '/brand-agent', description: 'Full brand session: identity and guidelines', category: 'Brand' },
  { name: 'Brand Refresh', trigger: '/brand-refresh', description: 'Update and evolve an existing brand', category: 'Brand' },
  { name: 'Brand Page', trigger: '/brand-page', description: 'Generate a branded page from data', category: 'Brand' },
  { name: 'Mood Board', trigger: '/mood-board', description: 'Generate mood board from keywords via Gemini', category: 'Brand' },
  { name: 'Thumbnail', trigger: '/thumbnail', description: 'Generate social thumbnail from topic', category: 'Brand' },
  { name: 'Sharpen', trigger: '/sharpen', description: 'Daily design research to build taste over time', category: 'Brand' },
  { name: 'Prototype', trigger: '/prototype', description: 'Generate a real HTML prototype and open it in Chrome', category: 'Brand' },

  // Web / Code
  { name: 'Web Dev Agent', trigger: '/web-dev-agent', description: 'General web development task', category: 'Code' },
  { name: 'Build Corner', trigger: '/build-corner', description: 'Corner-specific build task', category: 'Code' },
  { name: 'Quick Fix', trigger: '/quick-fix', description: 'Fast bug fix, push, and deploy', category: 'Code' },
  { name: 'Kill the Bugs', trigger: '/kill-the-bugs', description: 'Systematic bug-hunting session', category: 'Code' },
  { name: 'WD-40', trigger: '/wd40', description: 'Iterate on a feature until it works', category: 'Code' },
  { name: 'WD-40 Page', trigger: '/wd40-page', description: 'Iterate on a page: screenshot, fix, deploy, repeat', category: 'Code' },
  { name: 'Cage Match', trigger: '/cage-match', description: 'Build two approaches, keep the winner', category: 'Code' },
  { name: 'Wrestlemania', trigger: '/wrestlemania', description: 'Multi-contender face-off for hard problems', category: 'Code' },
  { name: 'Ship It', trigger: '/ship-it', description: 'Push, deploy, verify, and send link', category: 'Code' },
  { name: 'Coding QA', trigger: '/coding-qa', description: 'Code review and quality audit', category: 'Code' },
  { name: 'Double Check', trigger: '/double-check', description: 'QA pass on any deliverable', category: 'Code' },
  { name: 'Web Vision', trigger: '/web-vision', description: 'See any website via Chrome DevTools', category: 'Code' },
  { name: 'Make Corner Room', trigger: '/make-corner-room', description: 'Build a new Corner room', category: 'Code' },

  // Social / Marketing
  { name: 'Social Agent', trigger: '/social-agent', description: 'Multi-platform social posting', category: 'Social' },
  { name: 'Caption Writer', trigger: '/caption-writer', description: 'Write platform-specific captions from transcript', category: 'Social' },
  { name: 'Content Calendar', trigger: '/content-calendar', description: 'Generate a 30-day posting schedule', category: 'Social' },
  { name: 'Social Media Research', trigger: '/social-media-research', description: 'Research a client\'s social presence', category: 'Social' },
  { name: 'Competitor Scan', trigger: '/competitor-scan', description: 'Research competitor web and social gaps', category: 'Social' },

  // Outreach / Sales
  { name: 'Outreach', trigger: '/outreach', description: 'Full cold outreach pipeline', category: 'Outreach' },
  { name: 'Outreach Numbers', trigger: '/outreach-numbers', description: 'Track outreach metrics and pipeline status', category: 'Outreach' },
  { name: 'Email Drafter', trigger: '/email-drafter', description: 'Draft emails: cold, follow-up, or client', category: 'Outreach' },
  { name: 'Client Onboarding', trigger: '/client-onboarding', description: 'Onboard a new client end-to-end', category: 'Outreach' },
  { name: 'Client Setup', trigger: '/client-setup', description: 'Set up client workspace and systems', category: 'Outreach' },

  // Business / Strategy
  { name: 'ROI Calculator', trigger: '/roi-calc', description: 'Build custom ROI calculator for a client', category: 'Strategy' },
  { name: 'Pitch Deck', trigger: '/pitch-deck', description: 'Generate pitch deck for investors or clients', category: 'Strategy' },
  { name: 'Invoice', trigger: '/invoice', description: 'Generate invoice from project data', category: 'Strategy' },
  { name: 'Say It Better', trigger: '/say-it-better', description: 'Sharpen a rough idea with clarity', category: 'Strategy' },
  { name: 'Do Research', trigger: '/do-research', description: 'Deep research on any topic', category: 'Strategy' },
  { name: 'RAG Search', trigger: '/rag', description: 'Search internal knowledge base', category: 'Strategy' },

  // Client Health / Reporting
  { name: 'Health Check', trigger: '/health-check', description: 'Full system scan for stale data and issues', category: 'Reporting' },
  { name: 'Weekly Report', trigger: '/weekly-report', description: 'Auto-generate weekly client report', category: 'Reporting' },
  { name: 'Status Check', trigger: '/status-check', description: 'Full system snapshot: deployed, building, queued', category: 'Reporting' },
  { name: 'Run the Numbers', trigger: '/run-the-numbers', description: 'Pull and analyze key metrics', category: 'Reporting' },

  // Planning / Operations
  { name: 'Plan My Day', trigger: '/plan-my-day', description: 'Plan the workday from priorities', category: 'Ops' },
  { name: 'Calendar', trigger: '/calendar', description: 'Google Calendar operations', category: 'Ops' },
  { name: 'Calendar Hygiene', trigger: '/calendar-hygiene', description: 'Clean up and organize calendar', category: 'Ops' },
  { name: 'Punch List', trigger: '/punch-list', description: 'Review and update the master task list', category: 'Ops' },
  { name: 'Big 3', trigger: '/big-3', description: 'Pick the 3 most important things right now', category: 'Ops' },
  { name: 'Masterplan', trigger: '/masterplan', description: 'Full system optimization session', category: 'Ops' },
  { name: 'Mobile Rundown', trigger: '/mobile-rundown', description: 'Quick mobile-friendly status rundown', category: 'Ops' },
  { name: 'Blockers', trigger: '/blockers', description: 'Surface and resolve current blockers', category: 'Ops' },
  { name: 'Status', trigger: '/status', description: 'What\'s running, what\'s stuck right now', category: 'Ops' },

  // System / Infrastructure
  { name: 'Skill Gap Scan', trigger: '/skill-gap-scan', description: 'Find gaps in existing skills', category: 'System' },
  { name: 'Snapshot', trigger: '/snapshot', description: 'Save full system state for disaster recovery', category: 'System' },
  { name: 'Migrate', trigger: '/migrate', description: 'Move a client from one setup to another', category: 'System' },
  { name: 'Nuke', trigger: '/nuke', description: 'Emergency reset: kill all agents, clean slate', category: 'System' },
  { name: 'Clean', trigger: '/clean', description: 'Safe tmux session restart and stale cleanup', category: 'System' },
  { name: 'Super Saiyan', trigger: '/supersaiyan', description: 'Maximum effort: all agents, all resources', category: 'System' },
  { name: 'Little Engine', trigger: '/little-engine', description: 'Run 3 parallel agents on top queue tasks', category: 'System' },
  { name: 'Onboard Agent', trigger: '/onboard-agent', description: 'Create a new standard agent with full setup', category: 'System' },
  { name: 'Onboard Super Agent', trigger: '/onboard-super-agent', description: 'Create a new super agent with bridge and chat', category: 'System' },
  { name: 'Organize as Mission', trigger: '/sys-organize-as-mission', description: 'Scope a new initiative into its own mission folder (Vision/Research/Build)', category: 'System' },
  { name: 'Clean File', trigger: '/clean-file', description: 'Compact a large markdown doc into lobby index + archive', category: 'System' },

  // Session Management
  { name: 'Session Start', trigger: '/session-start', description: 'Beginning of a new work session', category: 'Session' },
  { name: 'Session Handoff', trigger: '/session-handoff', description: 'Surface switch with zero context loss', category: 'Session' },
  { name: 'Internal Update', trigger: '/internal-update', description: 'Mid-session sync and context save', category: 'Session' },
  { name: 'Hold That Thought', trigger: '/hold-that-thought', description: 'Capture an idea to revisit later', category: 'Session' },
  { name: 'Go Back in Time', trigger: '/go-back-in-time', description: 'Recover prior state or decision context', category: 'Session' },
  { name: 'Reprompt', trigger: '/reprompt', description: 'Reframe a stuck prompt for better results', category: 'Session' },
  { name: '007', trigger: '/007', description: 'License to kill: flip terminal into direct-work mode', category: 'Session' },
  { name: '007-DAD', trigger: '/007-DAD', description: 'Die another day: auto-resume in-flight 007 work after /compact', category: 'Session' },
  { name: '007 Out', trigger: '/007-out', description: 'Close out a 007 session: ship notes + tape + next-session prompt', category: 'Session' },

  // Collaboration / Communication
  { name: 'Council', trigger: '/council', description: 'Multi-agent deliberation on a hard decision', category: 'Collab' },
  { name: 'Ask Elon', trigger: '/ask-elon', description: 'Route a question to Elon', category: 'Collab' },
  { name: 'Check with Elon', trigger: '/check-with-elon', description: 'Quick Elon gate check before proceeding', category: 'Collab' },
  { name: '1 on 1', trigger: '/1on1', description: 'Open a 1:1 conversation with a specific agent', category: 'Collab' },
  { name: 'Create Team Conversation', trigger: '/create-team-conversation', description: 'Start a new team thread', category: 'Collab' },
  { name: 'Eyes and Ears', trigger: '/eyes-and-ears', description: 'Full media analysis: Gemini and technical specs', category: 'Collab' },
  { name: 'Look', trigger: '/look', description: 'Screen awareness: see what\'s on screen', category: 'Collab' },
  { name: 'Phone Home', trigger: '/phone-home', description: 'Queue a task for the Mac when away', category: 'Collab' },

  // Content Utilities
  { name: 'New User', trigger: '/new-user', description: 'Create a new Corner user account', category: 'Utility' },
  { name: 'Gemini Vision', trigger: '/gemini-vision', description: 'Shot analysis and quality scoring via Gemini', category: 'Utility' },
  { name: 'Visual Search', trigger: '/visual-search', description: 'Multimodal footage search', category: 'Utility' },

  // Resolve / Timeline
  { name: 'Resolve Collab', trigger: '/resolve-collab', description: 'Side-by-side editing with Patrik in Resolve', category: 'Resolve' },
  { name: 'Resolve Push', trigger: '/resolve-push', description: 'Push media clips to Resolve timeline', category: 'Resolve' },
  { name: 'Resolve Read', trigger: '/resolve-read', description: 'Snapshot the current timeline state', category: 'Resolve' },
  { name: 'Resolve Match', trigger: '/resolve-match', description: 'Match interview video and audio to timeline', category: 'Resolve' },
  { name: 'B-Roll Catalog', trigger: '/broll-catalog', description: 'Catalog strongest b-roll moments before placing', category: 'Resolve' },
  { name: 'B-Roll Fill', trigger: '/broll-fill', description: 'Fill visual gaps with contextual b-roll', category: 'Resolve' },
  { name: 'Sync Reader', trigger: '/sync-reader', description: 'Bulk read all CamAudioSync offsets', category: 'Resolve' },
  { name: 'Story Chain', trigger: '/story-chain', description: 'Build cohesive VO chain from interview transcripts', category: 'Resolve' },

  // Research / Intelligence
  { name: 'Research Deeply', trigger: '/research-deeply', description: 'Reddit + forums + web deep dive on any topic', category: 'Research' },
  { name: 'Research + Publish', trigger: '/research-deeply-webpage', description: 'Deep dive + publish brief to aheadofmarket.com', category: 'Research' },
  { name: 'Research YouTube', trigger: '/research-youtube', description: 'Find 5 best YouTube videos, pull transcripts, synthesize', category: 'Research' },
  { name: 'Research + Add to Agent', trigger: '/research-add', description: 'Research + inject brief into one or all agents', category: 'Research' },
  { name: 'Research Competitor', trigger: '/research-competitor', description: 'Single competitor: site + social + press + pricing', category: 'Research' },
  { name: 'Research Market', trigger: '/research-market', description: 'Market sizing, trends, key players. TAM/SAM style.', category: 'Research' },
  { name: 'Research Person', trigger: '/research-person', description: 'Profile a prospect or founder for outreach or meeting prep', category: 'Research' },
  { name: 'Research Pattern', trigger: '/research-pattern', description: 'Pull 10 best-in-class examples, extract shared pattern', category: 'Research' },
  { name: 'Research X Community', trigger: '/research-x-community', description: 'X/Twitter: influential voices + current conversation', category: 'Research' },
  { name: 'Research Podcast', trigger: '/research-podcast', description: 'Find best podcast episodes, pull transcripts, synthesize', category: 'Research' },
]

export default SKILLS
