/**
 * Demo block feed for testing block rendering in CV6 Chat.
 * Each block is clearly labelled as DEMO so it can never be mistaken for real data.
 *
 * Used when ?demo=blocks is passed to the dashboard.
 */

import {
  createStepBlock,
  createSuccessBlock,
  createSnagBlock,
  createQuestionBlock,
  createDataBlock,
  createSummaryBlock,
  createCodeBlock,
  createChoiceBlock,
  createGalleryBlock,
} from './blockSchema.js';

// Generate a demo feed of messages, each with blocks showcasing different types.
export function useDemoBlocks() {
  const now = new Date();
  const makeTs = (minAgo) => new Date(now - minAgo * 60000).toISOString();
  const makeTime = (minAgo) => {
    const d = new Date(now - minAgo * 60000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const messages = [
    // Message 1: Goal Thread with steps and results
    {
      id: 'demo-1',
      text: 'DEMO: Starting a multi-step goal. Watch the steps show up, then results attach under them.',
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(60),
      ts: makeTs(60),
      isUser: false,
      blocks: [
        createStepBlock(0, 'Analyze project data', 'done', 'Scanned 1,200 rows'),
        createStepBlock(1, 'Find trends', 'done', 'Identified 3 key patterns'),
        createStepBlock(2, 'Generate report', 'active', 'Building now…'),
        createSuccessBlock(0, 'Data ready', 'All 1,200 rows imported and normalized'),
        createDataBlock(1, 'DEMO: Trend Summary', ['Trend', 'Count', 'Change'], [
          ['User signups', '2400', '+18%'],
          ['Feature usage', '1890', '+12%'],
          ['Support tickets', '384', '−5%'],
        ]),
      ],
    },

    // Message 2: Code block
    {
      id: 'demo-2',
      text: "DEMO: Here's a code change for your review.",
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(45),
      ts: makeTs(45),
      isUser: false,
      blocks: [
        createCodeBlock(
          0,
          `export function useDemoBlocks() {
  const [blocks, setBlocks] = useState([]);
  useEffect(() => {
    // Load demo blocks on mount
    setBlocks(generateDemoData());
  }, []);
  return blocks;
}`,
          'useDemoBlocks.js',
          'jsx',
          'This hook returns a set of demo messages with rich blocks for testing the CV6 chat renderer.'
        ),
      ],
    },

    // Message 3: Summary with action items
    {
      id: 'demo-3',
      text: "DEMO: Here's a summary of what happened.",
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(30),
      ts: makeTs(30),
      isUser: false,
      blocks: [
        createSummaryBlock(
          0,
          [
            'Deployed 3 new features to production',
            'Performance improved by 12% on average',
            { text: 'One critical bug found in user auth', warn: true },
          ],
          [
            { text: 'Ship hotfix for auth bug', done: false },
            { text: 'Monitor performance over 24h', done: false },
            { text: 'Announce features to team', done: true },
          ],
          ['View logs', 'Deploy hotfix']
        ),
      ],
    },

    // Message 4: Question block
    {
      id: 'demo-4',
      text: 'DEMO: I have a question for you.',
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(15),
      ts: makeTs(15),
      isUser: false,
      blocks: [
        createQuestionBlock(0, 'Should we prioritize the mobile redesign or the API refactor first?', [
          { id: 'mobile', label: 'Mobile redesign' },
          { id: 'api', label: 'API refactor' },
          { id: 'both', label: 'Do both in parallel' },
        ]),
      ],
    },

    // Message 5: Gallery block
    {
      id: 'demo-5',
      text: 'DEMO: Here are some screenshot comparisons.',
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(10),
      ts: makeTs(10),
      isUser: false,
      blocks: [
        createGalleryBlock(0, [
          { url: 'https://via.placeholder.com/300x200?text=Before', label: 'Before redesign' },
          { url: 'https://via.placeholder.com/300x200?text=After', label: 'After redesign' },
          { url: 'https://via.placeholder.com/300x200?text=Mobile', label: 'Mobile version' },
        ], 'UI redesign comparison'),
      ],
    },

    // Message 6: Plain text message (no blocks) — shows additive behavior
    {
      id: 'demo-6',
      text: 'DEMO: This is a plain-text message with no blocks. It renders normally, proving the chat is additive.',
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(5),
      ts: makeTs(5),
      isUser: false,
      blocks: [],
    },

    // Message 7: User reply
    {
      id: 'demo-7',
      text: "Let's do the mobile redesign first.",
      agentName: 'You',
      agentInitials: 'YO',
      agentTint: 'accent',
      time: makeTime(2),
      ts: makeTs(2),
      isUser: true,
      blocks: [],
    },

    // Message 8: Choice block with a prompt
    {
      id: 'demo-8',
      text: "DEMO: Here's a choice block to confirm.",
      agentName: 'Demo Agent',
      agentInitials: 'DA',
      agentTint: 'violet',
      time: makeTime(1),
      ts: makeTs(1),
      isUser: false,
      blocks: [
        createChoiceBlock(0, 'Which timeline works best?', [
          { id: '2w', title: 'Sprint 1 (2 weeks)', label: '2 weeks', style: 'primary' },
          { id: '1m', title: 'Month 1 (4 weeks)', label: '1 month' },
          { id: 'flex', title: 'Flexible timeline', label: 'Flexible' },
        ]),
      ],
    },
  ];

  return messages;
}

/**
 * Load demo blocks based on the ?demo=blocks query param.
 * Returns the demo feed if the param is present, otherwise null.
 */
export function useDemoBlocksFeed() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isDemo = params?.get('demo') === 'blocks';
  return isDemo ? useDemoBlocks() : null;
}
