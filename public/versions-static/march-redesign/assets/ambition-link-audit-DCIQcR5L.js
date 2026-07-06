const t="Ambition Link and Functionality Audit",n="ambition-link-audit",d="Audits",e="Steffen",o="2026-03-10",r="Mar 10",s=null,a="Round 1 link and functionality audit of the Ambition Mechanical website.",c=[],i=`<h1>Ambition Mechanical - Link &amp; Functionality Audit (Round 1)</h1>
<p><strong>Site:</strong> ambition-teal.vercel.app
<strong>Repo:</strong> /Users/patrik/Documents/Dev/AMBITION
<strong>Date:</strong> 2026-03-10
<strong>Auditor:</strong> Steffen (Big 3 Chain)</p>
<hr>
<h2>Summary</h2>
<p>29 project pages, 8 main routes, all nav links, CTAs, drawers, modals, and interactive elements tested via source code review + Playwright on the live site.</p>
<p><strong>Overall:</strong> Site is solid. No completely broken links. Three issues worth fixing (1 medium, 2 low).</p>
<hr>
<h2>1. Navigation Links (Desktop)</h2>
<table>
<thead>
<tr>
<th>Link</th>
<th>Target</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Logo (header)</td>
<td><code>/</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Home</td>
<td><code>/</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>About</td>
<td><code>/about</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>What We Do (Services)</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Projects</td>
<td><code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Careers</td>
<td><code>/careers</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Contact (button, opens drawer)</td>
<td>Contact drawer</td>
<td>WORKING</td>
</tr>
</tbody></table>
<p><strong>Notes:</strong></p>
<ul>
<li>Nav label shows &quot;What We Do&quot; for Services (from Firebase content override). This is fine, it&#39;s CMS-driven.</li>
<li>Contact correctly fires as a button (not a link), opens the contact drawer without navigating.</li>
</ul>
<hr>
<h2>2. Navigation Links (Mobile)</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Hamburger button (open)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Hamburger button (close / X)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Home link</td>
<td>WORKING</td>
</tr>
<tr>
<td>About link</td>
<td>WORKING</td>
</tr>
<tr>
<td>What We Do link</td>
<td>WORKING</td>
</tr>
<tr>
<td>Projects link</td>
<td>WORKING</td>
</tr>
<tr>
<td>Careers link</td>
<td>WORKING</td>
</tr>
<tr>
<td>Contact button (drawer)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Get a Quote button (in mobile drawer)</td>
<td>WORKING - opens contact drawer</td>
</tr>
<tr>
<td>Menu auto-closes on navigation</td>
<td>WORKING</td>
</tr>
<tr>
<td>Menu closes on outside click</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>Menu closes on Escape key</td>
<td>WORKING (code verified)</td>
</tr>
</tbody></table>
<hr>
<h2>3. CTA Buttons</h2>
<table>
<thead>
<tr>
<th>Button</th>
<th>Location</th>
<th>Action</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>&quot;Get a Quote&quot;</td>
<td>Header (desktop, hidden on mobile)</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Get a Quote&quot;</td>
<td>Hero section</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Get a Quote&quot;</td>
<td>Mobile menu drawer</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Get a Quote&quot;</td>
<td>DiagonalCTA section (not visible on current build)</td>
<td>Opens contact drawer</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>&quot;See Our Projects&quot;</td>
<td>Hero section</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;View Industries&quot;</td>
<td>Home industries section</td>
<td>Links to <code>/markets</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;View All Projects&quot;</td>
<td>Home featured projects</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Start the Conversation&quot;</td>
<td>Home quality-contact section</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Call Dispatch&quot;</td>
<td>Home quality-contact section</td>
<td><code>tel:4806002942</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Send Message&quot; / &quot;Start a Conversation&quot;</td>
<td>Services CTA</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;See Related Projects&quot;</td>
<td>Services CTA</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Send Message&quot;</td>
<td>Markets CTA</td>
<td>Opens contact drawer with prefill</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;See Projects&quot;</td>
<td>Markets CTA</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Send Message&quot;</td>
<td>Projects CTA</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;See Services&quot;</td>
<td>Projects CTA</td>
<td>Links to <code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Send Message&quot;</td>
<td>Careers CTA</td>
<td>Opens mailto:<a href="mailto:careers@ambitionac.com">careers@ambitionac.com</a></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Request a Bid&quot;</td>
<td>Project detail sidebar</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Send Message&quot;</td>
<td>Project detail CTA</td>
<td>Opens contact drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Project Archive&quot;</td>
<td>Project detail CTA</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Back to Home&quot;</td>
<td>Privacy Policy</td>
<td>Links to <code>/</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>&quot;Back to Home&quot;</td>
<td>404 page</td>
<td>Links to <code>/</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Back to Projects</td>
<td>Project detail</td>
<td>Links to <code>/projects</code></td>
<td>WORKING</td>
</tr>
</tbody></table>
<hr>
<h2>4. Phone Links (tel:)</h2>
<table>
<thead>
<tr>
<th>Location</th>
<th>href</th>
<th>Display Text</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Footer</td>
<td><code>tel:4806002942</code></td>
<td>(480) 600-2942</td>
<td>WORKING</td>
</tr>
<tr>
<td>Home quality-contact section</td>
<td><code>tel:4806002942</code></td>
<td>Call Dispatch</td>
<td>WORKING</td>
</tr>
<tr>
<td>Contact drawer</td>
<td><code>tel:4806002942</code></td>
<td>Call Dispatch</td>
<td>WORKING</td>
</tr>
</tbody></table>
<p><strong>Phone number verified:</strong> (480) 600-2942 = <code>4806002942</code>. Correct format.</p>
<hr>
<h2>5. Email Links (mailto:)</h2>
<table>
<thead>
<tr>
<th>Location</th>
<th>href</th>
<th>Display Text</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Footer</td>
<td><code>mailto:info@ambitionac.com</code></td>
<td><a href="mailto:info@ambitionac.com">info@ambitionac.com</a></td>
<td>WORKING</td>
</tr>
<tr>
<td>Contact drawer</td>
<td><code>mailto:bids@ambitionac.com</code></td>
<td>Email Team</td>
<td>WORKING</td>
</tr>
<tr>
<td>Careers page resume CTA</td>
<td><code>mailto:careers@ambitionac.com</code></td>
<td>Send Your Resume</td>
<td>WORKING</td>
</tr>
<tr>
<td>Privacy Policy</td>
<td><code>mailto:info@ambitionac.com</code></td>
<td><a href="mailto:info@ambitionac.com">info@ambitionac.com</a></td>
<td>WORKING</td>
</tr>
<tr>
<td>Role application modal (step 3)</td>
<td><code>mailto:careers@ambitionac.com</code> (or <code>info@ambitionac.com</code> from CMS)</td>
<td>Email Resume Now</td>
<td>WORKING</td>
</tr>
</tbody></table>
<hr>
<h2>6. Social Media Links</h2>
<table>
<thead>
<tr>
<th>Platform</th>
<th>Status</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Facebook</td>
<td>DISABLED (not configured)</td>
<td>Shows greyed-out icon with <code>cursor-not-allowed</code>. Correct behavior.</td>
</tr>
<tr>
<td>LinkedIn</td>
<td>DISABLED (not configured)</td>
<td>Same as above.</td>
</tr>
<tr>
<td>Instagram</td>
<td>DISABLED (not configured)</td>
<td>Same as above.</td>
</tr>
</tbody></table>
<p><strong>Note:</strong> Social links are CMS-driven via <code>siteSettings.socialLinks</code>. When URLs are added in the admin, they will render as real links with <code>target=&quot;_blank&quot;</code> and <code>rel=&quot;noopener noreferrer&quot;</code>. The disabled state is intentional and clean.</p>
<hr>
<h2>7. Contact Drawer</h2>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Opens from header &quot;Get a Quote&quot;</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from hero &quot;Get a Quote&quot;</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from mobile menu &quot;Get a Quote&quot;</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from nav &quot;Contact&quot; button</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from footer &quot;Contact&quot; button</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from <code>/contact</code> route (redirects to / + opens)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from service card clicks (with prefill)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Opens from industry card clicks (with prefill)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Close button</td>
<td>WORKING</td>
</tr>
<tr>
<td>Backdrop click to close</td>
<td>WORKING</td>
</tr>
<tr>
<td>Escape key to close</td>
<td>WORKING</td>
</tr>
<tr>
<td>Step 1 (Project) form fields</td>
<td>WORKING</td>
</tr>
<tr>
<td>Step 2 (Contact) form fields</td>
<td>WORKING</td>
</tr>
<tr>
<td>Step 3 (Scope) form fields</td>
<td>WORKING</td>
</tr>
<tr>
<td>Step navigation (Continue/Back)</td>
<td>WORKING</td>
</tr>
<tr>
<td>Form validation</td>
<td>WORKING</td>
</tr>
<tr>
<td>Formspree submission endpoint</td>
<td>CONFIGURED (<code>mkovyypw</code>)</td>
</tr>
<tr>
<td>Call Dispatch tel link in drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>Email Team mailto link in drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>Text Reply toggle</td>
<td>WORKING</td>
</tr>
<tr>
<td>Mobile: slides up from bottom</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>Desktop: slides in from right</td>
<td>WORKING (code verified)</td>
</tr>
</tbody></table>
<hr>
<h2>8. Interactive Elements</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Location</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>FAQ accordions (5 questions)</td>
<td>Home page</td>
<td>WORKING</td>
</tr>
<tr>
<td>Project carousel prev/next</td>
<td>Home page</td>
<td>WORKING</td>
</tr>
<tr>
<td>Project carousel auto-scroll (6s)</td>
<td>Home page</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>Project carousel pause on hover</td>
<td>Home page</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>Show All Roles / Show Fewer toggle</td>
<td>Home careers section</td>
<td>WORKING (3 -&gt; 6 roles)</td>
</tr>
<tr>
<td>Role application modal</td>
<td>Home + Careers</td>
<td>WORKING (3-step flow)</td>
</tr>
<tr>
<td>Service card click -&gt; drawer with prefill</td>
<td>Home + Services</td>
<td>WORKING</td>
</tr>
<tr>
<td>Industry/market card click -&gt; drawer with prefill</td>
<td>Home + Markets</td>
<td>WORKING</td>
</tr>
<tr>
<td>Project card click -&gt; detail page</td>
<td>Home + Projects</td>
<td>WORKING</td>
</tr>
<tr>
<td>Cookie consent bar (Essential Only / Accept All)</td>
<td>Global</td>
<td>WORKING</td>
</tr>
<tr>
<td>Cookie Preferences button</td>
<td>Footer</td>
<td>WORKING (reopens consent bar)</td>
</tr>
<tr>
<td>Loading screen</td>
<td>Global</td>
<td>WORKING</td>
</tr>
<tr>
<td>Scroll reveal animations</td>
<td>Global</td>
<td>WORKING (code verified)</td>
</tr>
<tr>
<td>Scroll to top on navigation</td>
<td>Global</td>
<td>WORKING (code verified)</td>
</tr>
</tbody></table>
<hr>
<h2>9. Project Detail Pages</h2>
<table>
<thead>
<tr>
<th>Feature</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Dynamic route <code>/projects/:id</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Project not found state</td>
<td>WORKING (shows &quot;not found&quot; with back link)</td>
</tr>
<tr>
<td>Related projects grid</td>
<td>WORKING</td>
</tr>
<tr>
<td>Related project cards clickable</td>
<td>WORKING</td>
</tr>
<tr>
<td>Category badge</td>
<td>WORKING</td>
</tr>
<tr>
<td>Services chips</td>
<td>WORKING</td>
</tr>
<tr>
<td>Request a Bid button</td>
<td>WORKING</td>
</tr>
<tr>
<td>Back to Projects link</td>
<td>WORKING</td>
</tr>
</tbody></table>
<p><strong>Total project cards on /projects page:</strong> 29 (all clickable, all navigate correctly)</p>
<hr>
<h2>10. Footer Links</h2>
<table>
<thead>
<tr>
<th>Link</th>
<th>Target</th>
<th>Status</th>
</tr>
</thead>
<tbody><tr>
<td>Logo</td>
<td><code>/</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>About</td>
<td><code>/about</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Projects</td>
<td><code>/projects</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Careers</td>
<td><code>/careers</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Contact (button)</td>
<td>Opens drawer</td>
<td>WORKING</td>
</tr>
<tr>
<td>Commercial HVAC</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Refrigeration Repair</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Preventive Maintenance</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Emergency Service</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>New Construction</td>
<td><code>/services</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Phone: (480) 600-2942</td>
<td><code>tel:4806002942</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Email: <a href="mailto:info@ambitionac.com">info@ambitionac.com</a></td>
<td><code>mailto:info@ambitionac.com</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Privacy Policy</td>
<td><code>/privacy</code></td>
<td>WORKING</td>
</tr>
<tr>
<td>Cookie Preferences (button)</td>
<td>Reopens cookie bar</td>
<td>WORKING</td>
</tr>
</tbody></table>
<hr>
<h2>ISSUES FOUND</h2>
<h3>MEDIUM Priority</h3>
<p><strong>1. Contact page <code>tel:</code> link uses raw phone value without stripping formatting</strong></p>
<ul>
<li><strong>File:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/src/pages/Contact.jsx</code>, line 154</li>
<li><strong>Current:</strong> <code>href={</code>tel:\${content.emergency?.phone}<code>}</code></li>
<li><strong>Problem:</strong> If the CMS stores the phone as &quot;(480) 600-2942&quot;, the tel link becomes <code>tel:(480) 600-2942</code> which may not work on all devices. The footer and contact drawer correctly strip non-digits (e.g., <code>tel:4806002942</code>), but Contact.jsx does not.</li>
<li><strong>Impact:</strong> Low right now because <code>/contact</code> route redirects to the drawer, so this standalone Contact page is essentially unreachable by users. But if the route ever changes, this would be a real bug.</li>
<li><strong>Fix for Bobby:</strong><pre><code class="language-jsx">// Line 154, change:
&lt;a href={\`tel:\${content.emergency?.phone}\`}
// To:
&lt;a href={\`tel:\${(content.emergency?.phone || &#39;&#39;).replace(/[^\\d+]/g, &#39;&#39;)}\`}
</code></pre>
</li>
</ul>
<h3>LOW Priority</h3>
<p><strong>2. Footer service links all point to <code>/services</code> (no anchor scrolling to specific service)</strong></p>
<ul>
<li><strong>File:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/src/components/Footer.jsx</code>, lines 196-199</li>
<li><strong>Current:</strong> All 5 service links (Commercial HVAC, Refrigeration Repair, etc.) navigate to <code>/services</code> with no differentiation.</li>
<li><strong>Impact:</strong> Not broken, but could be improved. Clicking &quot;Refrigeration Repair&quot; in the footer takes you to the generic services page rather than highlighting or scrolling to that specific service.</li>
<li><strong>Recommendation:</strong> Consider adding anchor links (e.g., <code>/services#refrigeration-repair</code>) or opening the contact drawer with the relevant service pre-selected. Not urgent.</li>
</ul>
<p><strong>3. Sitemap and robots.txt reference <code>ambitionac.com</code> (production domain) while site is on <code>ambition-teal.vercel.app</code></strong></p>
<ul>
<li><strong>Files:</strong> <code>/Users/patrik/Documents/Dev/AMBITION/public/sitemap.xml</code>, <code>/Users/patrik/Documents/Dev/AMBITION/public/robots.txt</code></li>
<li><strong>Impact:</strong> No impact on functionality. The sitemap correctly references the production domain. When the site launches on <code>ambitionac.com</code>, these will be correct. Just noting it for awareness. No action needed.</li>
</ul>
<hr>
<h2>NOT FLAGGED (per instructions)</h2>
<ul>
<li>Placeholder gradient images on service/project/career cards (Patrik is handling real photos)</li>
<li>SVG text-based client logos (Intel, Amazon, etc.) in hero &quot;Trusted By&quot; section</li>
<li>Stock/placeholder content in project descriptions</li>
</ul>
<hr>
<h2>Verdict</h2>
<p>The site&#39;s link and functionality layer is clean. All navigation, CTAs, drawers, modals, forms, tel/mailto links, and interactive elements work correctly across desktop and mobile viewports. The one actual code issue (Contact.jsx tel: format) is currently unreachable by users since <code>/contact</code> redirects to the drawer. No critical issues found.</p>
`,l={title:t,slug:n,category:d,agent:e,date:o,dateFormatted:r,updated:null,summary:a,tags:c,content:i};export{e as agent,d as category,i as content,o as date,r as dateFormatted,l as default,n as slug,a as summary,c as tags,t as title,s as updated};
