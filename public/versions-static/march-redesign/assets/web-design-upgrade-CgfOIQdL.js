const e="Web Design Upgrade",i="web-design-upgrade",n="Audits",t="Elon",o="2026-03-12",s="Mar 12",c=null,l="Aceternity UI, Magic UI, construction patterns, and anti-AI-slop techniques.",r=[],a=`<h1>Web Design Upgrade Brief</h1>
<blockquote>
<p>Elon | 2026-03-12
Mission: Arm Bobby and Steffen to build construction sites that seriously hit</p>
</blockquote>
<hr>
<h2>What Was Done</h2>
<h3>1. Studied the Anthropic Frontend-Design Skill</h3>
<p>Located at: <code>~/.claude/plugins/cache/claude-plugins-official/frontend-design/b36fd4b75301/skills/frontend-design/SKILL.md</code></p>
<p>Core philosophy absorbed and baked into Bobby&#39;s AGENT.md:</p>
<ul>
<li>Bold typography (distinctive, characterful, never generic)</li>
<li>Unexpected layouts (asymmetry, overlap, grid-breaking, diagonal flow)</li>
<li>Purposeful motion (staggered reveals, scroll-triggered, high-impact moments over scattered micro-interactions)</li>
<li>Atmosphere (gradient meshes, noise textures, dramatic shadows, grain overlays)</li>
<li>Anti-AI-slop mandate (no Inter/Roboto/Arial, no purple gradients, no cookie-cutter patterns)</li>
</ul>
<h3>2. Researched Component Libraries</h3>
<p><strong>Aceternity UI</strong> (ui.aceternity.com)</p>
<ul>
<li>200+ components, React + Tailwind + Framer Motion</li>
<li>Key picks for construction sites: Hero Parallax, Spotlight, Parallax Scroll Grid, 3D Card Effect, Tracing Beam, Background Beams</li>
<li>Copy-paste ready, shadcn compatible</li>
<li>Best for: landing pages, marketing sites with high-impact animations</li>
</ul>
<p><strong>Magic UI</strong> (magicui.design)</p>
<ul>
<li>Text Reveal (fade-in on scroll), Scroll Based Velocity, Marquee, Scroll Progress</li>
<li>Lighter-weight than Aceternity, clean and minimal</li>
<li>Best for: accent animations, text effects, scroll indicators</li>
</ul>
<p><strong>Framer Motion</strong> (already in stack)</p>
<ul>
<li>Core hooks Bobby needs to master: <code>useScroll</code>, <code>useTransform</code>, <code>whileInView</code>, <code>staggerChildren</code>, <code>AnimatePresence</code></li>
<li>Scroll-linked parallax: combine <code>useScroll</code> + <code>useTransform</code> for multi-speed layers</li>
<li>Performance: stick to <code>transform</code> and <code>opacity</code> for 60fps</li>
</ul>
<h3>3. Researched Award-Winning Construction Sites</h3>
<p><strong>What the best ones do:</strong></p>
<ul>
<li>Turner Construction: HD video hero, audience segmentation, generous white space</li>
<li>PCL Construction: premium slide transitions, pre-loading screens, video-first marketing</li>
<li>Clark Construction: striking imagery balanced with smooth navigation</li>
<li>Kiewit: anticipation-building transitions, industry-specific imagery per section</li>
<li>Skanska: confidence through simplicity, owned &quot;Skanska blue&quot;</li>
<li>Brasfield &amp; Gorrie: legacy brand (est. 1964) modernized by top-tier agency Matchstic, ampersand as graphic element</li>
</ul>
<p><strong>Common patterns that hit:</strong></p>
<ul>
<li>Full-bleed project photography (not thumbnail grids)</li>
<li>Animated stat counters for trust numbers</li>
<li>Video backgrounds of active job sites</li>
<li>Before/after sliders for renovation projects</li>
<li>Clear audience segmentation (clients, job seekers, communities)</li>
<li>Strong section rhythm: dark/light alternation with varied heights</li>
</ul>
<p><strong>Common patterns that bore:</strong></p>
<ul>
<li>3-column equal card grids</li>
<li>Stock photos of hard hats + handshakes</li>
<li>Same-height sections with identical padding</li>
<li>Predictable left-right alternation</li>
<li>Carousel hero sliders with dot navigation</li>
</ul>
<h3>4. Updated Bobby&#39;s AGENT.md</h3>
<p>Added &quot;## Web Design Superpowers&quot; section with:</p>
<ul>
<li>Core anti-slop philosophy (purpose, tone, &quot;one thing&quot; test, intentionality)</li>
<li>6 construction-specific technique categories (visual storytelling, data as design, section composition, typography, color technique, motion)</li>
<li>12-component pattern reference table (Hero Parallax, Spotlight, Before/After Slider, Animated Counter, Diagonal CTA, Staggered Grid, Timeline, Testimonial Carousel, Tracing Beam, Parallax Image Strip, Scroll Velocity Text, 3D Tilt Card)</li>
<li>8 explicit anti-patterns to avoid</li>
<li>Library references (Aceternity, Magic UI, Framer Motion, Lucide)</li>
<li>6 reference sites to study</li>
<li>5-step usage checklist</li>
</ul>
<h3>5. Updated Steffen&#39;s AGENT.md</h3>
<p>Added &quot;## Section-Level Design Specs&quot; section with:</p>
<ul>
<li>What each section spec must include (layout composition, motion behavior, visual hierarchy, wow moment, responsive behavior)</li>
<li>Why specs matter (Bobby builds what&#39;s spec&#39;d; vague = generic)</li>
<li>Section design toolkit (10 specific techniques)</li>
<li>Ambition-specific guidance (palette techniques, industrial patterns, color ratios)</li>
</ul>
<h3>6. Other Skills/Tools Assessment</h3>
<p><strong>Anthropic official skills repo</strong> (github.com/anthropics/skills):</p>
<ul>
<li>Contains document skills (docx, pdf, pptx, xlsx) and the frontend-design skill</li>
<li>No additional web dev skills beyond frontend-design at this time</li>
<li>The frontend-design skill is the most relevant and is already installed</li>
</ul>
<p><strong>Community skills worth watching:</strong></p>
<ul>
<li><code>vercel-react-best-practices</code> (176K installs): React patterns for Vercel deployments</li>
<li><code>web-design-guidelines</code> (137K installs): general web design guidance</li>
<li><code>web-quality-skills</code> by Addy Osmani: performance, accessibility, quality optimization</li>
</ul>
<p><strong>Packages to consider installing:</strong></p>
<ul>
<li>Aceternity UI components can be copied in as-needed (no npm install required, they&#39;re copy-paste)</li>
<li>Magic UI same approach (copy-paste components)</li>
<li>Both are Tailwind + Framer Motion, already compatible with the aom-studio stack</li>
</ul>
<p><strong>MCP servers:</strong></p>
<ul>
<li>No design-specific MCP servers that would meaningfully help right now</li>
<li>Figma MCP exists but AOM doesn&#39;t use Figma currently</li>
</ul>
<hr>
<h2>Recommendations</h2>
<ol>
<li><p><strong>Bobby should study Aceternity UI&#39;s Hero Parallax, Spotlight, and 3D Card components</strong> before his next Ambition build session. These are the highest-impact patterns for the construction vertical.</p>
</li>
<li><p><strong>Steffen should write section-level design specs for every Ambition page section</strong> before Bobby rebuilds them. The new AGENT.md section tells him exactly what to include.</p>
</li>
<li><p><strong>No new packages need installing.</strong> Aceternity and Magic UI are copy-paste. Framer Motion is already in the stack. The upgrade is in technique and intention, not tooling.</p>
</li>
<li><p><strong>The /v2 redesign is the perfect canvas.</strong> When Bobby builds /v2, every section should use these techniques from the start. Don&#39;t retrofit old sections. Build new ones right.</p>
</li>
<li><p><strong>The Ambition site is the proving ground.</strong> If Ambition&#39;s sections hit, that portfolio piece sells every future construction client at $3k/month.</p>
</li>
</ol>
`,d={title:e,slug:i,category:n,agent:t,date:o,dateFormatted:s,updated:null,summary:l,tags:r,content:a};export{t as agent,n as category,a as content,o as date,s as dateFormatted,d as default,i as slug,l as summary,r as tags,e as title,c as updated};
