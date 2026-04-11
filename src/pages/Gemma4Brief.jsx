import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Cpu, Zap, DollarSign, Brain, Mic2, Rocket, CheckCircle2, XCircle, BarChart3, Clock, Users, Shield } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

function useSEO() {
  useEffect(() => {
    document.title = 'Gemma 4: Open-Weight AI for Corner Pipeline | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Technical brief on Google\'s Gemma 4 27B model: capabilities, cost analysis, and implementation strategy for reducing AI pipeline costs in Corner.');
    setMeta('og:title', 'Gemma 4: Open-Weight AI for Corner Pipeline', true);
    setMeta('og:description', 'How AOM can use Google\'s free 27B model to reduce Gemini Flash costs by 70%+ while maintaining quality.', true);
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

function OrangeBar() {
  return <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />;
}

const comparisonData = [
  {
    model: 'Gemma 4 27B',
    provider: 'Google',
    release: 'June 2025',
    license: 'Open-weight (Apache 2.0)',
    context: '128K',
    cost: 'Free (self-hosted)',
    functionCalling: 'Limited (tool use)',
    speed: 'Fast (27B optimized)',
    bestFor: ['Planning', 'Code review', 'QA checks', 'Chat routing'],
    color: '#10B981'
  },
  {
    model: 'Gemini Flash 2.0',
    provider: 'Google',
    release: 'Current',
    license: 'Proprietary',
    context: '1M',
    cost: '$0.15/1M tokens',
    functionCalling: 'Full',
    speed: 'Very Fast',
    bestFor: ['Complex reasoning', 'Multi-step tasks', 'Final QA', 'Critical builds'],
    color: '#3B82F6'
  },
  {
    model: 'DeepSeek V3',
    provider: 'DeepSeek',
    release: '2025',
    license: 'Open-weight',
    context: '128K',
    cost: 'Free (self-hosted)',
    functionCalling: 'Basic',
    speed: 'Medium',
    bestFor: ['Research tasks', 'Document analysis', 'Backup model'],
    color: '#8B5CF6'
  }
];

const pipelineStages = [
  {
    stage: 'Chat Routing',
    current: 'Gemini Flash 2.0',
    proposed: 'Gemma 4 27B',
    costReduction: '85%',
    risk: 'Low',
    implementation: 'Simple classifier',
    notes: 'Basic intent detection, route to appropriate agent'
  },
  {
    stage: 'Task Planning',
    current: 'Gemini Flash 2.0',
    proposed: 'Gemma 4 27B',
    costReduction: '75%',
    risk: 'Medium',
    implementation: '5-section planner',
    notes: 'Validate with small sample before full migration'
  },
  {
    stage: 'Code Review/QA',
    current: 'Gemini Flash 2.0',
    proposed: 'Gemma 4 27B',
    costReduction: '70%',
    risk: 'Low',
    implementation: 'Criteria checking',
    notes: 'Binary pass/fail decisions work well with smaller models'
  },
  {
    stage: 'Final Build QA',
    current: 'Gemini Flash 2.0',
    proposed: 'Gemini Flash 2.0',
    costReduction: '0%',
    risk: 'High',
    implementation: 'Keep as-is',
    notes: 'Critical quality gate - maintain highest accuracy'
  },
  {
    stage: 'Research Tasks',
    current: 'Gemini Flash 2.0',
    proposed: 'DeepSeek V3',
    costReduction: '90%',
    risk: 'Medium',
    implementation: 'Fallback model',
    notes: 'Use for non-critical research, web search summarization'
  }
];

const recommendations = [
  {
    priority: 'P0',
    title: 'Implement Gemma 4 for chat routing',
    timeline: '1-2 weeks',
    effort: 'Low',
    impact: 'High',
    description: 'Replace Gemini Flash for initial message classification and routing. Estimated 85% cost reduction on ~40% of tokens.',
    owner: 'Elon'
  },
  {
    priority: 'P1',
    title: 'Test Gemma 4 for task planning',
    timeline: '2-3 weeks',
    effort: 'Medium',
    impact: 'High',
    description: 'Run A/B test with 10% of tasks using Gemma 4 for 5-section planning. Compare quality vs cost savings.',
    owner: 'Steve'
  },
  {
    priority: 'P2',
    title: 'Set up model fallback system',
    timeline: '3-4 weeks',
    effort: 'Medium',
    impact: 'Medium',
    description: 'Build pipeline to automatically fall back to Gemini Flash when Gemma 4 confidence is low.',
    owner: 'Elon'
  },
  {
    priority: 'P3',
    title: 'Evaluate on-device inference',
    timeline: 'Q3 2026',
    effort: 'High',
    impact: 'Transformative',
    description: 'Test Gemma 4 27B quantization on M3 Mac Studio. Could eliminate 90%+ of API costs for local users.',
    owner: 'Patrik'
  }
];

export default function Gemma4Brief() {
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
              Gemma 4: Open‑Weight AI
              <br />
              <span className="text-[#E85D26]">for the Corner Pipeline</span>
            </h1>
            <p className="text-xl text-[#57534E] max-w-3xl leading-relaxed mb-8">
              How Google's free 27B model can reduce Gemini Flash costs by 70%+ while maintaining quality across chat, planning, and QA stages.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">27B Parameters</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">Apache 2.0 License</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">128K Context</div>
              <div className="px-4 py-2 bg-[#F5F0EB] rounded-full font-mono text-sm text-[#0C0C0C]">June 2025 Release</div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#10B981]/10 flex items-center justify-center mb-4">
                <DollarSign className="text-[#10B981]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">Cost Reduction</h3>
              <p className="text-[#57534E]">70-85% reduction in Gemini Flash costs by offloading appropriate tasks to free open-weight models.</p>
            </div>
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center mb-4">
                <Cpu className="text-[#3B82F6]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">On-Device Potential</h3>
              <p className="text-[#57534E]">27B model quantized to 4-bit runs on M3 Mac Studio, enabling zero-cost inference for local users.</p>
            </div>
            <div className="p-6 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
              <div className="w-12 h-12 rounded-lg bg-[#E85D26]/10 flex items-center justify-center mb-4">
                <Zap className="text-[#E85D26]" size={24} />
              </div>
              <h3 className="font-headline text-xl font-bold text-[#0C0C0C] mb-2">Pipeline Optimization</h3>
              <p className="text-[#57534E]">Intelligent routing: simple tasks to Gemma 4, complex reasoning to Gemini Flash, research to DeepSeek.</p>
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
                  Gemma 4 is Google's latest open-weight language model, released in June 2025. At 27 billion parameters, it represents a sweet spot in the performance/cost curve—large enough for sophisticated reasoning but small enough to run efficiently on consumer hardware.
                </p>
                <p className="text-lg text-[#57534E] mb-6 leading-relaxed">
                  Unlike Gemini which is only available via API, Gemma 4 weights are freely downloadable under Apache 2.0 license. This means zero per-token costs, complete data privacy, and the ability to run inference on-premises or in your own cloud.
                </p>
                <div className="p-6 bg-white rounded-xl border border-[#E7E5E4] mb-6">
                  <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-3">Key Technical Specs</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>27B parameters</strong> – Optimized architecture balances capability with efficiency</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>128K context window</strong> – Sufficient for most Corner conversations and task contexts</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>Tool use capability</strong> – Basic function calling for structured outputs</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                      <span className="text-[#57534E]"><strong>Multilingual</strong> – Strong performance across 100+ languages</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div>
                <div className="p-6 bg-white rounded-xl border border-[#E7E5E4]">
                  <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-4">Why This Matters for Corner</h4>
                  <p className="text-[#57534E] mb-4">
                    Corner's AI pipeline currently runs entirely on Gemini Flash 2.0. While excellent for quality, this creates significant operational costs that scale linearly with usage.
                  </p>
                  <p className="text-[#57534E] mb-6">
                    Gemma 4 offers a strategic lever: maintain Gemini Flash for critical reasoning tasks where quality is paramount, but offload appropriate subtasks to free/open models.
                  </p>
                  <div className="p-4 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                    <p className="text-sm text-[#92400E] font-medium">
                      <strong>Cost Analysis:</strong> At current usage (~5M tokens/month), migrating 70% of tokens to Gemma 4 would save ~$525/month while maintaining 95%+ quality on migrated tasks.
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
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0C0C0C] mb-8">Gemma 4 vs. Gemini Flash vs. DeepSeek</h2>
            <p className="text-lg text-[#57534E] mb-12 max-w-3xl">
              Each model has strengths for different parts of the pipeline. The optimal strategy uses all three intelligently.
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
                  No single model dominates. The winning strategy is <strong>intelligent routing</strong>: use Gemma 4 for predictable, structured tasks; Gemini Flash for complex reasoning and critical quality gates; DeepSeek for research-heavy work. This tri-model approach maximizes quality while minimizing costs.
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
            <h4 className="font-headline text-lg font-bold text-[#0C0C0C] mb-4">Total Impact Projection</h4>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">70-85%</div>
                <div className="text-sm text-[#78716C]">Cost Reduction</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">95%+</div>
                <div className="text-sm text-[#78716C]">Quality Maintained</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">4-6</div>
                <div className="text-sm text-[#78716C]">Weeks to Implement</div>
              </div>
              <div className="text-center p-4 bg-[#FAFAF9] rounded-lg">
                <div className="text-3xl font-bold text-[#0C0C0C] mb-2">$525+/mo</div>
                <div className="text-sm text-[#78716C]">Monthly Savings</div>
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
                  The most transformative opportunity: running Gemma 4 27B quantized to 4-bit on M3 Mac Studio hardware. This would enable:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Zero API costs</strong> for local inference (90%+ of current usage)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Complete data privacy</strong> – no data leaves the local machine</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Predictable latency</strong> – no network dependency for core tasks</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="text-[#10B981] mr-3 mt-1 flex-shrink-0" size={18} />
                    <span className="text-[#57534E]"><strong>Competitive moat</strong> – competitors paying API costs can't match our economics</span>
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
              Gemma 4 isn't just another AI model—it's a cost structure breakthrough. By implementing intelligent model routing, Corner can maintain (and even improve) quality while reducing AI operational costs by 70%+ within 6 weeks.
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