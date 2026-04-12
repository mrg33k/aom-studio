import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, Zap, DollarSign, Brain, Server, Smartphone, CheckCircle2, XCircle, BarChart3, Clock, Shield, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

function useSEO() {
  useEffect(() => {
    document.title = 'Gemma 4: Open-Weight AI | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Technical brief on Google\'s Gemma 4 model family (E2B, E4B, 26B MoE, 31B Dense).');
    setMeta('og:title', 'Gemma 4: Open-Weight AI', true);
    setMeta('og:description', 'Technical brief on Google\'s Gemma 4 model family.', true);
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
  return <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#78716c] mb-4">{children}</p>;
}

const comparisonData = [
  {
    model: 'Gemma 4 (31B)',
    parameters: '31B Dense',
    cost: 'Free (Open-Weight)',
    speed: 'Fast (Local/Edge)',
    quality: '89.2% AIME 2026',
    functionCalling: 'Native Support'
  },
  {
    model: 'Gemini Flash 2.5',
    parameters: 'Unknown',
    cost: '$0.15 / 1M tokens',
    speed: 'Very Fast (API)',
    quality: 'High',
    functionCalling: 'Full (25+ tools)'
  },
  {
    model: 'DeepSeek V3',
    parameters: '671B MoE',
    cost: '$0.27 / 1M input',
    speed: 'Fast (API)',
    quality: 'Frontier-level',
    functionCalling: 'Full Support'
  }
];

const pipelineStages = [
  {
    stage: 'Chat & Routing',
    fit: 'Excellent',
    model: 'Gemma 4 E4B / 26B',
    notes: 'Native function calling and 256K context make it ideal for replacing Gemini Flash in chat routing. Runs fast and free.'
  },
  {
    stage: 'Task Planning',
    fit: 'Good',
    model: 'Gemma 4 31B',
    notes: 'Native thinking mode (<|channel>thought) allows strong reasoning for planning, though DeepSeek V3 may still edge it out on complex logic.'
  },
  {
    stage: 'Code Building',
    fit: 'Moderate',
    model: 'Gemma 4 31B',
    notes: 'Capable of coding, but DeepSeek V3 remains the gold standard for multi-file generation. Good for smaller isolated components.'
  },
  {
    stage: 'QA Review',
    fit: 'Excellent',
    model: 'Gemma 4 26B MoE',
    notes: 'Structured output and fast inference make the 26B MoE perfect for pass/fail criteria checking at zero API cost.'
  }
];

const recommendations = [
  {
    priority: 'P0',
    title: 'Deploy E4B for Task Classification',
    description: 'Replace Gemini Flash for simple routing and classification. E4B is fast enough to run locally with zero latency penalty.'
  },
  {
    priority: 'P1',
    title: 'A/B Test 26B MoE for QA Pipeline',
    description: 'Run the 26B MoE model alongside DeepSeek V3 for QA tasks. If pass rates match, switch to Gemma to eliminate API costs.'
  },
  {
    priority: 'P2',
    title: 'Evaluate 31B for Agentic Chat',
    description: 'Test the flagship 31B model\'s function calling capabilities against our 25+ tool definitions to see if it can handle full chat.'
  }
];

export default function Gemma4BriefGemini() {
  useSEO();

  return (
    <div className="min-h-screen bg-white font-sans text-[#0C0C0C]">
      <SiteNav />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Model Brief</SectionKicker>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Gemma 4
            </h1>
            <p className="text-2xl text-[#78716c] max-w-3xl mb-12 leading-relaxed">
              Google's frontier open-weight model family. Bringing 256K context, native thinking, and agentic function calling to the edge.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9]">
              <DollarSign className="text-[#16a34a] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Zero API Cost</h3>
              <p className="text-[#78716c]">Apache 2.0 licensed open-weight models mean no per-token pricing. Run entirely on your own infrastructure.</p>
            </div>
            <div className="p-8 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9]">
              <Brain className="text-[#16a34a] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Native Thinking</h3>
              <p className="text-[#78716c]">Built-in reasoning tokens and 256K context window for complex planning and multi-step execution.</p>
            </div>
            <div className="p-8 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9]">
              <Smartphone className="text-[#16a34a] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Edge Ready</h3>
              <p className="text-[#78716c]">From the 2.3B effective E2B to the 31B flagship, optimized for everything from mobile to server racks.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-20 px-6 md:px-12 bg-[#fafaf9] border-y border-[#e7e5e4]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionKicker>Overview</SectionKicker>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Frontier Intelligence, Fully Open</h2>
              <p className="text-lg text-[#78716c] mb-6 leading-relaxed">
                Released in April 2026, Gemma 4 represents a massive shift in Google's open-source strategy. Moving to a permissive Apache 2.0 license, it offers four distinct models designed to run anywhere.
              </p>
              <p className="text-lg text-[#78716c] leading-relaxed">
                With native multimodal support, a massive 256K token context window, and built-in agentic function calling, it's positioned as a direct replacement for proprietary APIs like Gemini Flash.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-xl border border-[#e7e5e4]">
                <div className="text-2xl font-bold text-[#16a34a] mb-1">E2B & E4B</div>
                <div className="text-sm text-[#78716c]">Edge-optimized dense models</div>
              </div>
              <div className="p-6 bg-white rounded-xl border border-[#e7e5e4]">
                <div className="text-2xl font-bold text-[#16a34a] mb-1">26B A4B</div>
                <div className="text-sm text-[#78716c]">MoE (3.8B active params)</div>
              </div>
              <div className="p-6 bg-white rounded-xl border border-[#e7e5e4]">
                <div className="text-2xl font-bold text-[#16a34a] mb-1">31B</div>
                <div className="text-sm text-[#78716c]">Flagship dense model</div>
              </div>
              <div className="p-6 bg-white rounded-xl border border-[#e7e5e4]">
                <div className="text-2xl font-bold text-[#16a34a] mb-1">256K</div>
                <div className="text-sm text-[#78716c]">Token context window</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Competitive Landscape</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-10">Model Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#e7e5e4]">
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Model</th>
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Parameters</th>
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Cost</th>
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Speed</th>
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Quality</th>
                    <th className="py-4 px-6 font-bold text-[#0C0C0C]">Function Calling</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-[#e7e5e4] hover:bg-[#fafaf9] transition-colors">
                      <td className="py-4 px-6 font-semibold">{row.model}</td>
                      <td className="py-4 px-6 text-[#78716c]">{row.parameters}</td>
                      <td className="py-4 px-6 text-[#78716c]">{row.cost}</td>
                      <td className="py-4 px-6 text-[#78716c]">{row.speed}</td>
                      <td className="py-4 px-6 text-[#78716c]">{row.quality}</td>
                      <td className="py-4 px-6 text-[#78716c]">{row.functionCalling}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline Strategy */}
      <section className="py-20 px-6 md:px-12 bg-[#fafaf9] border-y border-[#e7e5e4]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Integration</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-10">Pipeline Strategy</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {pipelineStages.map((stage, i) => (
                <div key={i} className="p-8 bg-white rounded-2xl border border-[#e7e5e4]">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{stage.stage}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      stage.fit === 'Excellent' ? 'bg-[#16a34a]/10 text-[#16a34a]' :
                      stage.fit === 'Good' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {stage.fit} Fit
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#16a34a] mb-3">Target: {stage.model}</div>
                  <p className="text-[#78716c] leading-relaxed">{stage.notes}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* On-Device */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)} className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <SectionKicker>Local Execution</SectionKicker>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">On-Device Inference</h2>
              <p className="text-lg text-[#78716c] mb-6 leading-relaxed">
                Gemma 4 is built for the edge. The E2B and E4B models are integrated directly into Android via the AICore Developer Preview, and can run on consumer hardware using Google AI Edge.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#16a34a] shrink-0 mt-1" size={20} />
                  <span className="text-[#78716c]"><strong>Raspberry Pi 5:</strong> E2B runs smoothly with under 1.5GB RAM.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#16a34a] shrink-0 mt-1" size={20} />
                  <span className="text-[#78716c]"><strong>MacBooks (M-Series):</strong> 26B MoE runs efficiently due to only 3.8B active parameters.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#16a34a] shrink-0 mt-1" size={20} />
                  <span className="text-[#78716c]"><strong>Privacy:</strong> 100% local execution means zero data leaves the device.</span>
                </li>
              </ul>
            </div>
            <div className="flex-1 w-full">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#fafaf9] to-[#e7e5e4] border border-[#d6d3d1] flex items-center justify-center p-12">
                <Cpu className="text-[#16a34a] w-full h-full opacity-20" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="py-20 px-6 md:px-12 bg-[#fafaf9] border-t border-[#e7e5e4]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <SectionKicker>Action Plan</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-10">Recommendations</h2>
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-2xl border border-[#e7e5e4] items-start md:items-center">
                  <div className="px-4 py-2 bg-[#16a34a] text-white font-bold rounded-lg text-sm">
                    {rec.priority}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{rec.title}</h3>
                    <p className="text-[#78716c]">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-6 md:px-12 bg-[#0C0C0C] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp(0.1)}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to cut API costs?</h2>
            <p className="text-xl text-[#a8a29e] mb-10">
              Start migrating your pipeline to Gemma 4 today and eliminate per-token pricing forever.
            </p>
            <button className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors">
              View Implementation Guide
              <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
