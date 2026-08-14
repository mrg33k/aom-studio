import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Cpu, Zap, DollarSign, Brain, Mic2, Rocket, CheckCircle2, XCircle, BarChart3, Clock, Users, Shield } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

function useSEO() {
  useEffect(() => {
    document.title = 'Gemma 4: Google\'s Open-Weight AI Model Family | Ahead of Market';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Technical brief on Google\'s Gemma 4 model family: 4 variants from 2B to 31B parameters, open-weight Apache 2.0 license, 128K context, full function calling.');
    setMeta('og:title', 'Gemma 4: Google\'s Open-Weight AI Model Family', true);
    setMeta('og:description', 'Complete analysis of Gemma 4 vs Gemini Flash vs DeepSeek V3 for enterprise AI pipelines.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/ai/gemma-4', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

function SectionKicker({ children }) {
  return <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-[#78716C] mb-4">{children}</p>;
}

function GreenBar() {
  return <div className="w-12 h-[2px] bg-[#16a34a] mb-4" />;
}

const comparisonData = [
  {
    model: 'DeepSeek V3',
    provider: 'DeepSeek',
    release: '2025',
    license: 'Open-weight (MIT)',
    context: '128K',
    cost: '$0.27/1M input, $1.10/1M output',
    functionCalling: 'Full (multi-round tool use)',
    speed: 'Fast',
    bestFor: ['Task planning', 'Code building', 'QA review', 'Web research'],
    color: '#8B5CF6'
  },
  {
    model: 'Gemini Flash 2.5',
    provider: 'Google',
    release: 'Current',
    license: 'Proprietary',
    context: '1M',
    cost: '$0.15/1M tokens',
    functionCalling: 'Full (25+ tools)',
    speed: 'Very Fast',
    bestFor: ['Chat routing', 'Task classification', 'User conversations', 'Function calling'],
    color: '#3B82F6'
  },
  {
    model: 'Gemma 4 Family',
    provider: 'Google',
    release: 'April 2, 2026',
    license: 'Open-weight (Apache 2.0)',
    context: '128K',
    cost: 'Free (self-hosted)',
    functionCalling: 'Full (tool use)',
    speed: 'E2B to 31B range',
    bestFor: ['Edge inference', 'On-device chat', 'Cost elimination', 'Data privacy'],
    color: '#16a34a'
  }
];

const pipelineStages = [
  {
    stage: 'Chat & Routing',
    current: 'Gemini Flash 2.5',
    proposed: 'Gemma 4 E4B',
    costReduction: '95%',
    risk: 'Low',
    implementation: 'Self-hosted classifier',
    notes: 'Intent detection, agent routing, function calling (25+ tools). Currently Gemini.'
  },
  {
    stage: 'Task Planning',
    current: 'DeepSeek V3',
    proposed: 'Gemma 4 26B MoE',
    costReduction: '100%',
    risk: 'Medium',
    implementation: '5-section planner',
    notes: 'Already migrated from Gemini to DeepSeek. Gemma 4 would eliminate API costs entirely.'
  },
  {
    stage: 'Code Building',
    current: 'DeepSeek V3',
    proposed: 'DeepSeek V3',
    costReduction: '0%',
    risk: 'N/A',
    implementation: 'Multi-round tool loop (8 tools)',
    notes: 'Already on DeepSeek. Reads, edits, searches, builds, fetches web pages. Keep as-is.'
  },
  {
    stage: 'QA Review',
    current: 'DeepSeek V3',
    proposed: 'Gemma 4 26B MoE',
    costReduction: '100%',
    risk: 'Low',
    implementation: 'Criteria checking + scoring',
    notes: 'Already migrated from Gemini to DeepSeek. Structured pass/fail works well with smaller models.'
  },
  {
    stage: 'Task Classification',
    current: 'Gemini Flash 2.5',
    proposed: 'Gemma 4 E4B',
    costReduction: '95%',
    risk: 'Low',
    implementation: 'Type + complexity check',
    notes: 'Simple classification (build/skill/research/clarify). Ideal for small fast model.'
  }
];

const recommendations = [
  {
    priority: 'P0',
    title: 'Replace Gemini Flash for classification',
    timeline: '1-2 weeks',
    effort: 'Low',
    impact: 'High',
    description: 'Task type and complexity classification is simple structured output. Gemma 4 E4B can handle this at zero cost, eliminating the last Gemini dependency in the build pipeline.',
    owner: 'Elon'
  },
  {
    priority: 'P1',
    title: 'Test Gemma 4 26B MoE for QA',
    timeline: '2-3 weeks',
    effort: 'Medium',
    impact: 'High',
    description: 'QA is already on DeepSeek. Run A/B test with Gemma 4 26B MoE on 10% of tasks. If quality holds, eliminates QA API costs entirely.',
    owner: 'Steve'
  },
  {
    priority: 'P2',
    title: 'Gemma 4 for chat routing (replace Gemini)',
    timeline: '3-4 weeks',
    effort: 'High',
    impact: 'Transformative',
    description: 'Chat is the biggest remaining Gemini cost. Requires 25+ function declarations, multi-round tool calling, and conversation context. E4B or 26B MoE with fine-tuning.',
    owner: 'Elon'
  },
  {
    priority: 'P3',
    title: 'E2B on Raspberry Pi 5 for edge inference',
    timeline: 'Q3 2026',
    effort: 'High',
    impact: 'Transformative',
    description: 'Gemma 4 E2B runs with <1.5GB RAM. Could enable zero-cost, zero-latency inference for Corner users running locally. Complete data privacy.',
    owner: 'Patrik'
  }
];

export default function Gemma4BriefDeepseek() {
  useSEO();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      
      {/* Hero Section */}
      <section className="pt-28 md:pt-36 pb-12 md:pb-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <a
              href="/ai"
              className="inline-flex items-center gap-2 font-mono text-sm text-[#78716C] hover:text-[#0C0C0C] transition-colors mb-10"
            >
              <ArrowLeft size={14} />
              Back to AI
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.2)}>
            <SectionKicker>Technical Brief</SectionKicker>
            <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#0C0C0C] leading-tight mb-6">
              Gemma 4: Google's
              <br />
              <span className="text-[#16a34a]">Open‑Weight AI Model Family</span>
            </h1>
            <p className="text-xl text-[#57534E] max-w-3xl leading-relaxed mb-8">
              Google's latest open-weight model family: 4 variants from 2B to 31B parameters, Apache 2.0 license, 128K context, full function calling. The future of cost-effective, private AI inference.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">4-Model Family</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">Apache 2.0 License</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">128K Context</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">April 2, 2026 Release</div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#16a34a]/10 flex items-center justify-center mb-4">
                <DollarSign className="text-[#16a34a]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">Zero API Cost</h3>
              <p className="text-[#57534E]">Apache 2.0 license means free self-hosted inference. Eliminate per-token charges for AI workloads.</p>
            </div>
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#16a34a]/10 flex items-center justify-center mb-4">
                <Cpu className="text-[#16a34a]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">Edge Inference</h3>
              <p className="text-[#57534E]">E2B model runs on Raspberry Pi 5 with &lt;1.5GB RAM. Full pipeline on edge devices.</p>
            </div>
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#16a34a]/10 flex items-center justify-center mb-4">
                <Zap className="text-[#16a34a]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">Full Function Calling</h3>
              <p className="text-[#57534E]">Native tool use across all variants. Multi-round conversations with 25+ tools supported.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is Gemma 4 */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Overview</SectionKicker>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0C0C0C] mb-6">What is Gemma 4?</h2>
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <p className="text-lg text-[#57534E] mb-6 leading-relaxed">
 Gemma 4 is Google's most capable open-weight language model family, released on April 2, 2026. The family includes four variants: E2B (2B parameters), E4B (4B), 26B MoE (Mixture of Experts), and 31B Dense, covering the full spectrum from edge devices to high-performance servers.
                </p>
                <p className="text-lg text-[#57534E] mb-6 leading-relaxed">
                  Unlike Gemini which requires API access, Gemma 4 weights are freely downloadable under Apache 2.0 license. This enables zero per-token costs, complete data privacy, and on-premises inference across cloud, on-device, and edge deployments.
                </p>
                <div className="p-6 bg-white rounded-xl border border-[#E7E5E4] mb-6">
                  <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-3">Key Technical Specs</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#16a34a] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>4-model family</strong> – E2B (2B), E4B (4B), 26B MoE, 31B Dense variants for different use cases</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#16a34a] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>128K context window</strong> – Handles complex conversations and multi-step reasoning</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#16a34a] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>Full function calling</strong> – Native tool use across all variants with multi-round conversations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#16a34a] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>140+ languages</strong> – Expanded multilingual support with audio/video modalities</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div>
                <div className="p-6 bg-white rounded-xl border border-[#E7E5E4]">
                  <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-4">Why This Matters for Corner</h4>
                  <p className="text-[#57534E] mb-4">
                    Corner's pipeline already runs DeepSeek V3 for planning, building, and QA. Gemini Flash 2.5 still handles chat routing, task classification, and user conversations (25+ function tools).
                  </p>
                  <p className="text-[#57534E] mb-6">
                    Gemma 4 could eliminate the remaining Gemini dependency entirely: self-hosted, zero per-token cost, complete data privacy. The 26B MoE variant matches DeepSeek quality at zero API cost.
                  </p>
                  <div className="p-4 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                    <p className="text-sm text-[#92400E] font-medium">
                      <strong>Current Pipeline:</strong> 10+ tasks shipped through DeepSeek builder (QA scores 9-10/10). Gemini handles chat only. Gemma 4 could replace both remaining paid models.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Model Comparison</SectionKicker>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0C0C0C] mb-8">Model Comparison: Gemma 4 vs Gemini Flash vs DeepSeek V3</h2>
            <p className="text-lg text-[#57534E] mb-12 max-w-3xl">
              Strategic comparison of three leading AI models for enterprise pipelines. Each excels in different areas.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E7E5E4]">
                  <th className="text-left py-4 px-6 font-headline font-bold text-[#0C0C0C]">Model</th>
                  <th className="text-left py-4 px-6 font-headline font-bold text-[#0C0C0C]">Provider</th>
                  <th className="text-left py-4 px-6 font-headline font-bold text-[#0C0C0C]">Cost</th>
                  <th className="text-left py-4 px-6 font-headline font-bold text-[#0C0C0C]">Function Calling</th>
                  <th className="text-left py-4 px-6 font-headline font-bold text-[#0C0C0C]">Best For</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((model, idx) => (
                  <tr key={idx} className="border-b border-[#E7E5E4] hover:bg-[#FAFAF9]">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: model.color }} />
                        <span className="font-headline font-bold text-[#0C0C0C]">{model.model}</span>
                      </div>
                      <div className="text-sm text-[#78716C] mt-1">{model.release} • {model.context} context</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-[#0C0C0C]">{model.provider}</div>
                      <div className="text-sm text-[#78716C]">{model.license}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`font-bold ${model.cost === 'Free (self-hosted)' ? 'text-[#10B981]' : 'text-[#0C0C0C]'}`}>
                        {model.cost}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-[#0C0C0C]">{model.functionCalling}</div>
                      <div className="text-sm text-[#78716C]">{model.speed}</div>
                    </td>
                    <td className="py-4 px-6">
                      <ul className="space-y-1">
                        {model.bestFor.map((use, i) => (
                          <li key={i} className="text-sm text-[#57534E] flex items-start">
                            <CheckCircle2 className="text-[#10B981] mr-2 mt-0.5 flex-shrink-0" size={14} />
                            {use}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="mt-12 p-6 bg-[#F0F9FF] rounded-xl border border-[#0EA5E9]/20">
            <div className="flex items-start">
              <Brain className="text-[#0EA5E9] mr-4 mt-1 flex-shrink-0" size={24} />
              <div>
                <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-2">Strategic Insight</h4>
                <p className="text-[#57534E]">
                  Corner already proved multi-model works: DeepSeek handles planning, building, and QA at ~$0.08/task. Gemini Flash handles chat and classification. Gemma 4 is the next step: <strong>replace both paid models with free self-hosted inference</strong>. The endgame is a fully open-weight pipeline with zero API costs.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Implementation */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Pipeline Strategy</SectionKicker>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0C0C0C] mb-8">Where Gemma 4 Fits in the Corner Pipeline</h2>
            <p className="text-lg text-[#57534E] mb-12 max-w-3xl">
              Not all AI tasks require Gemini Flash's full capabilities. Here's how to intelligently distribute work across models.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="space-y-6">
            {pipelineStages.map((stage, idx) => (
              <div key={idx} className="p-6 bg-white rounded-xl border border-[#E7E5E4]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">{stage.stage}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <span className="text-sm text-[#78716C] mr-2">Current:</span>
                        <span className="font-medium text-[#0C0C0C]">{stage.current}</span>
                      </div>
                      <ArrowRight size={16} className="text-[#78716C]" />
                      <div className="flex items-center">
                        <span className="text-sm text-[#78716C] mr-2">Proposed:</span>
                        <span className="font-medium text-[#0C0C0C]">{stage.proposed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <div className={`px-4 py-2 rounded-full font-bold ${parseInt(stage.costReduction) > 50 ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                      {stage.costReduction} cost reduction
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-[#78716C] mb-1">Risk Level</div>
                    <div className={`font-medium ${stage.risk === 'Low' ? 'text-[#10B981]' : stage.risk === 'Medium' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {stage.risk}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#78716C] mb-1">Implementation</div>
                    <div className="font-medium text-[#0C0C0C]">{stage.implementation}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#78716C] mb-1">Notes</div>
                    <div className="text-[#57534E]">{stage.notes}</div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="mt-12 p-6 bg-white rounded-xl border border-[#E7E5E4]">
            <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-4">Current Pipeline Reality</h4>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">3/5</div>
                <div className="text-sm text-[#78716C]">Stages on DeepSeek</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">9-10</div>
                <div className="text-sm text-[#78716C]">Avg QA Score</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">3</div>
                <div className="text-sm text-[#78716C]">Parallel Runner Lanes</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">~$0.08</div>
                <div className="text-sm text-[#78716C]">Per Task (DeepSeek)</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Action Plan</SectionKicker>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0C0C0C] mb-8">Implementation Roadmap</h2>
            <p className="text-lg text-[#57534E] mb-12 max-w-3xl">
              Phased approach to minimize risk while capturing cost savings quickly.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="space-y-6">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-6 bg-white rounded-xl border border-[#E7E5E4] hover:border-[#E85D26]/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
                  <div className="flex items-start mb-4 md:mb-0">
                    <div className={`px-3 py-1 rounded-md font-mono font-bold mr-4 ${
                      rec.priority === 'P0' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                      rec.priority === 'P1' ? 'bg-[#FEF3C7] text-[#D97706]' :
                      rec.priority === 'P2' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                      'bg-[#D1FAE5] text-[#065F46]'
                    }`}>
                      {rec.priority}
                    </div>
                    <div>
                      <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">{rec.title}</h3>
                      <p className="text-[#57534E]">{rec.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <div className="mb-2">
                      <div className="text-sm text-[#78716C]">Owner</div>
                      <div className="font-medium text-[#0C0C0C]">{rec.owner}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-sm text-[#78716C]">Timeline</div>
                        <div className="font-medium text-[#0C0C0C]">{rec.timeline}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#78716C]">Effort</div>
                        <div className={`font-medium ${
                          rec.effort === 'Low' ? 'text-[#10B981]' :
                          rec.effort === 'Medium' ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}>
                          {rec.effort}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="mt-12 p-6 bg-[#ECFDF5] rounded-xl border border-[#10B981]/20">
            <div className="flex items-start">
              <Rocket className="text-[#10B981] mr-4 mt-1 flex-shrink-0" size={24} />
              <div>
                <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-2">On-Device Inference: The Endgame</h4>
                <p className="text-[#57534E] mb-4">
                  Gemma 4 E2B runs on a Raspberry Pi 5 with less than 1.5GB RAM. The 26B MoE variant runs on any modern GPU. This means Corner users could run the entire pipeline locally:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Zero API costs</strong> -- self-hosted inference eliminates all per-token charges</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Complete data privacy</strong> -- code, conversations, and business data never leave the machine</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Edge-ready</strong> -- E2B at 2B params runs on phones, IoT, embedded devices</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Competitive moat</strong> -- competitors paying API costs can't match zero-cost inference economics</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Conclusion */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-[#0C0C0C]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)} className="text-center">
            <SectionKicker>Conclusion</SectionKicker>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mb-6">Strategic Imperative</h2>
            <p className="text-xl text-[#A8A29E] max-w-3xl mx-auto mb-10 leading-relaxed">
              Corner already runs 3 of 5 pipeline stages on DeepSeek at ~$0.08/task. Gemma 4 is the next step: replace the remaining paid models with free, self-hosted inference. The 4-model family covers everything from Raspberry Pi edge devices to server-grade reasoning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-bold text-base uppercase tracking-[0.06em] hover:bg-[#D14E1C] transition-all"
              >
                Implement in Corner
              </a>
              <a
                href="/briefs"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-headline font-bold text-base uppercase tracking-[0.06em] hover:border-white/40 transition-colors"
              >
                View All Briefs
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}