const t="AOM Functional Test",n="elmo-aom-functional-test",o="Audits",e="Elmo",d="2026-03-09",r="Mar 9",l=null,i="Functional test of AOM site across desktop and mobile viewports.",s=[],a=`<h1>Functional Test: AOM Site (aheadofmarket.com)</h1>
<p><strong>Date:</strong> 2026-03-09
<strong>Tester:</strong> Elmo (QA Agent)
<strong>Viewports:</strong> Desktop 1440x900, Mobile 390x844</p>
<h2>Summary</h2>
<table>
<thead>
<tr>
<th>Category</th>
<th>Working</th>
<th>Total</th>
<th>Pass Rate</th>
</tr>
</thead>
<tbody><tr>
<td>Links</td>
<td>7</td>
<td>7</td>
<td>100%</td>
</tr>
<tr>
<td>Forms</td>
<td>1</td>
<td>3</td>
<td>33%</td>
</tr>
<tr>
<td>CTAs</td>
<td>10</td>
<td>25</td>
<td>40%</td>
</tr>
<tr>
<td>Interactive</td>
<td>7</td>
<td>11</td>
<td>64%</td>
</tr>
</tbody></table>
<p><strong>Overall: 25 / 46 tested items pass (54%)</strong></p>
<p>15 FAIL items need attention. Most are CTA buttons that do nothing when clicked.</p>
<hr>
<h2>Links [7 working / 7 total]</h2>
<table>
<thead>
<tr>
<th>#</th>
<th>Link Text</th>
<th>Destination</th>
<th>Status</th>
<th>Result</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>&quot;AOM.&quot; (logo)</td>
<td><a href="https://www.aheadofmarket.com/">https://www.aheadofmarket.com/</a></td>
<td>200</td>
<td>PASS</td>
</tr>
<tr>
<td>2</td>
<td>&quot;See the Work&quot;</td>
<td>#work</td>
<td>Section exists</td>
<td>PASS</td>
</tr>
<tr>
<td>3</td>
<td>&quot;Construction Companies&quot; card</td>
<td>#construction</td>
<td>Section exists</td>
<td>PASS</td>
</tr>
<tr>
<td>4</td>
<td>&quot;Brands + Corporate&quot; card</td>
<td>#brands</td>
<td>Section exists</td>
<td>PASS</td>
</tr>
<tr>
<td>5</td>
<td>&quot;Digital + Systems&quot; card</td>
<td>#digital</td>
<td>Section exists</td>
<td>PASS</td>
</tr>
<tr>
<td>6</td>
<td>&quot;See Ambition Mechanical&quot;</td>
<td><a href="https://ambitionac.com/">https://ambitionac.com/</a></td>
<td>200, target=_blank</td>
<td>PASS</td>
</tr>
<tr>
<td>7</td>
<td>&quot;<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a>&quot;</td>
<td>mailto:<a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a></td>
<td>mailto link</td>
<td>PASS</td>
</tr>
</tbody></table>
<p><strong>Notes:</strong></p>
<ul>
<li>No social media links anywhere on the site (no Instagram, LinkedIn, etc.)</li>
<li>No footer links at all</li>
<li>Only 7 total anchor tags on the entire site. Very minimal link structure.</li>
<li>Site routes that exist: <code>/dashboard</code> (200), <code>/brand</code> (200), <code>/brands</code> (200)</li>
<li>Site routes that 404: <code>/about</code>, <code>/work</code>, <code>/services</code>, <code>/contact</code>, <code>/blog</code>, <code>/team</code>, <code>/careers</code></li>
</ul>
<hr>
<h2>Forms [1 working / 3 total]</h2>
<h3>1. &quot;Get Access&quot; Waitlist Form (footer area)</h3>
<ul>
<li><strong>Location:</strong> Bottom of page, &quot;JOIN THE WAITLIST&quot; section</li>
<li><strong>Fields:</strong> 1 email input (required), placeholder &quot;<a href="mailto:your@email.com">your@email.com</a>&quot;</li>
<li><strong>Submit:</strong> &quot;Get Access&quot; button</li>
<li><strong>Endpoint:</strong> POST to <code>/api/waitlist</code> with JSON body <code>{&quot;email&quot;:&quot;...&quot;}</code></li>
<li><strong>Validation:</strong> Browser-native email validation works (rejects invalid format)</li>
<li><strong>After submit:</strong> Shows success message &quot;You&#39;re on the list. We&#39;ll reach out when it&#39;s your turn.&quot;</li>
<li><strong>Result:</strong> PASS</li>
</ul>
<h3>2. &quot;Start Brief&quot; Multi-Step Form (overlay)</h3>
<ul>
<li><strong>Location:</strong> Full-screen overlay triggered by &quot;Start a Brief&quot; button</li>
<li><strong>Step 1:</strong> YOUR NAME (text input) + DIRECT EMAIL (email input) + &quot;Next Step&quot; button</li>
<li><strong>Step 2:</strong> DOES NOT ADVANCE. Clicking &quot;Next Step&quot; after filling both fields does nothing. The form stays on Step 1. Step 2 and Step 3 are unreachable.</li>
<li><strong>No form tag:</strong> The inputs are not wrapped in a <code>&lt;form&gt;</code> element. It uses JS/React state management.</li>
<li><strong>Result:</strong> FAIL -- multi-step flow is broken. Users cannot complete the brief submission.</li>
</ul>
<h3>3. &quot;Connect&quot; / Department Contact Form</h3>
<ul>
<li><strong>Location:</strong> Full-screen overlay triggered by &quot;Talk to Us&quot; button</li>
<li><strong>Shows:</strong> Department selector with Scheduling, Creative, Support, Accounting</li>
<li><strong>Only Accounting works:</strong> Clicking Accounting shows &quot;Call Accounting&quot; with a back button and a prompt to email <a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a></li>
<li><strong>Scheduling, Creative, Support:</strong> All three do nothing when clicked. No next step, no form, no action.</li>
<li><strong>No actual contact form exists:</strong> None of the departments lead to a form with input fields.</li>
<li><strong>Result:</strong> FAIL -- 3 of 4 department buttons are dead ends. No contact form is reachable through this flow.</li>
</ul>
<hr>
<h2>CTAs [10 working / 25 total]</h2>
<h3>PASS</h3>
<table>
<thead>
<tr>
<th>#</th>
<th>Button Text</th>
<th>Action</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>&quot;Talk to Us&quot; (nav)</td>
<td>Opens Connect overlay</td>
<td>Works on desktop. Hidden on mobile (<code>hidden md:flex</code>).</td>
</tr>
<tr>
<td>2</td>
<td>&quot;Start a Brief&quot; (nav)</td>
<td>Opens Start Brief overlay</td>
<td>Works on both desktop and mobile.</td>
</tr>
<tr>
<td>3</td>
<td>&quot;all&quot; (filter tab)</td>
<td>Filters work grid</td>
<td>Shows all work items. Active state toggles correctly.</td>
</tr>
<tr>
<td>4</td>
<td>&quot;brands&quot; (filter tab)</td>
<td>Filters work grid</td>
<td>Filters to brand work items.</td>
</tr>
<tr>
<td>5</td>
<td>&quot;construction&quot; (filter tab)</td>
<td>Filters work grid</td>
<td>Filters to construction work items.</td>
</tr>
<tr>
<td>6</td>
<td>&quot;See What We&#39;d Produce For You&quot;</td>
<td>Opens Start Brief overlay</td>
<td>Correctly opens the brief form.</td>
</tr>
<tr>
<td>7</td>
<td>&quot;Product Launch&quot; (brief card)</td>
<td>Selects brief type</td>
<td>Card gets orange border/active state on click.</td>
</tr>
<tr>
<td>8</td>
<td>&quot;Content Engine&quot; (brief card)</td>
<td>Selects brief type</td>
<td>Card gets orange border/active state on click.</td>
</tr>
<tr>
<td>9</td>
<td>&quot;Brand Authority&quot; (brief card)</td>
<td>Selects brief type</td>
<td>Card gets orange border/active state on click.</td>
</tr>
<tr>
<td>10</td>
<td>&quot;Get Access&quot;</td>
<td>Submits waitlist form</td>
<td>Posts to /api/waitlist, shows success message.</td>
</tr>
</tbody></table>
<h3>FAIL</h3>
<table>
<thead>
<tr>
<th>#</th>
<th>Button Text</th>
<th>Expected Action</th>
<th>Actual Result</th>
<th>Severity</th>
</tr>
</thead>
<tbody><tr>
<td>11</td>
<td>&quot;See What We&#39;d Build For You&quot; (hero)</td>
<td>Scroll to section or open brief</td>
<td><strong>Does nothing.</strong> No scroll, no overlay, no navigation.</td>
<td>HIGH</td>
</tr>
<tr>
<td>12</td>
<td>&quot;See how it works&quot;</td>
<td>Scroll to process section</td>
<td><strong>Does nothing.</strong></td>
<td>HIGH</td>
</tr>
<tr>
<td>13</td>
<td>&quot;See the work&quot;</td>
<td>Scroll to work section</td>
<td><strong>Does nothing.</strong></td>
<td>HIGH</td>
</tr>
<tr>
<td>14</td>
<td>&quot;See what we&#39;d build&quot;</td>
<td>Scroll or open brief</td>
<td><strong>Does nothing.</strong></td>
<td>HIGH</td>
</tr>
<tr>
<td>15</td>
<td>&quot;See All Work +&quot;</td>
<td>Expand work grid or navigate</td>
<td><strong>Button not found</strong> in secondary test. May be conditionally rendered.</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>16</td>
<td>&quot;Call the Team&quot; (footer)</td>
<td>Open phone or contact</td>
<td><strong>Does nothing.</strong> No phone link, no overlay, no scroll.</td>
<td>HIGH</td>
</tr>
<tr>
<td>17</td>
<td>&quot;Case Study&quot; (brief card)</td>
<td>Select brief type</td>
<td>Card selects but <strong>brief form is broken</strong> so selection is moot.</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>18</td>
<td>&quot;Event Capture&quot; (brief card)</td>
<td>Select brief type</td>
<td>Same as above.</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>19</td>
<td>&quot;Custom Brief&quot; (brief card)</td>
<td>Select brief type</td>
<td>Same as above.</td>
<td>MEDIUM</td>
</tr>
<tr>
<td>20</td>
<td>Scheduling (Connect overlay)</td>
<td>Show scheduling contact info</td>
<td><strong>Does nothing.</strong> Overlay stays on department list.</td>
<td>HIGH</td>
</tr>
<tr>
<td>21</td>
<td>Creative (Connect overlay)</td>
<td>Show creative contact info</td>
<td><strong>Does nothing.</strong></td>
<td>HIGH</td>
</tr>
<tr>
<td>22</td>
<td>Support (Connect overlay)</td>
<td>Show support contact info</td>
<td><strong>Does nothing.</strong></td>
<td>HIGH</td>
</tr>
</tbody></table>
<h3>Not Tested (hidden/conditional)</h3>
<table>
<thead>
<tr>
<th>#</th>
<th>Button Text</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>23</td>
<td>&quot;Start a Brief&quot; (mobile footer)</td>
<td>Duplicate of nav button, likely works</td>
</tr>
<tr>
<td>24</td>
<td>&quot;Talk to Us&quot; (mobile footer)</td>
<td>Duplicate, likely works</td>
</tr>
<tr>
<td>25</td>
<td>&quot;See What We&#39;d Build For You&quot; (2nd instance)</td>
<td>Duplicate of hero CTA</td>
</tr>
</tbody></table>
<hr>
<h2>Interactive Elements [7 working / 11 total]</h2>
<h3>FAQ Accordions: PASS (6/6)</h3>
<p>All 6 FAQ items toggle correctly on click:</p>
<table>
<thead>
<tr>
<th>#</th>
<th>Question</th>
<th>Result</th>
</tr>
</thead>
<tbody><tr>
<td>1</td>
<td>&quot;What happens after I hit &#39;Start Brief&#39;?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
<tr>
<td>2</td>
<td>&quot;Do you handle strategy or just production?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
<tr>
<td>3</td>
<td>&quot;How fast can you turn edits?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
<tr>
<td>4</td>
<td>&quot;What industries do you work with?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
<tr>
<td>5</td>
<td>&quot;What does a retainer include?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
<tr>
<td>6</td>
<td>&quot;Can we start with a single project?&quot;</td>
<td>PASS - toggles open/closed</td>
</tr>
</tbody></table>
<h3>Scroll Animations: PASS</h3>
<ul>
<li>3 elements with animation classes detected. Animations trigger on scroll.</li>
</ul>
<h3>Hamburger Menu (Mobile): FAIL</h3>
<ul>
<li><strong>No hamburger menu exists.</strong> On mobile, the header shows only the AOM logo and &quot;Start a Brief&quot; button.</li>
<li>&quot;Talk to Us&quot; is hidden on mobile via <code>hidden md:flex</code> class.</li>
<li>There is no way to navigate to sections from the mobile header. Users must scroll manually.</li>
<li>No mobile navigation menu of any kind.</li>
</ul>
<h3>Anchor Link Scrolling: FAIL</h3>
<ul>
<li>&quot;See the Work&quot; link points to <code>#work</code> and the <code>#work</code> element exists in the DOM</li>
<li>However, clicking the link <strong>does not scroll the page.</strong> Scroll position stays at 0.</li>
<li>Same issue for #construction, #brands, #digital anchor links</li>
<li>The anchor links exist and the target sections exist, but the click-to-scroll behavior is broken.</li>
</ul>
<h3>Contact Drawer: FAIL</h3>
<ul>
<li>The &quot;Talk to Us&quot; overlay opens correctly with department options</li>
<li>But 3 of 4 departments are dead ends (only Accounting works)</li>
<li>Even Accounting just says &quot;email us&quot; with no actual form</li>
</ul>
<h3>Work Filter Tabs: PASS</h3>
<ul>
<li>&quot;all&quot;, &quot;brands&quot;, &quot;construction&quot; tabs work correctly</li>
<li>Active tab gets orange border styling</li>
<li>Grid items filter appropriately</li>
</ul>
<hr>
<h2>Critical Issues (Ranked by Impact)</h2>
<h3>P0 - Blocking / Lead Loss</h3>
<ol>
<li><p><strong>Start Brief form is broken.</strong> The &quot;Next Step&quot; button does not advance past Step 1. This is the primary conversion path. No prospect can submit a brief. Every &quot;Start a Brief&quot; click across the site leads to a dead end after filling name + email.</p>
</li>
<li><p><strong>&quot;See What We&#39;d Build For You&quot; hero CTA does nothing.</strong> This is the first CTA visitors see. Clicking it produces zero response. No scroll, no overlay, no navigation. Dead button.</p>
</li>
<li><p><strong>&quot;Call the Team&quot; footer CTA does nothing.</strong> The bottom-of-page conversion button is completely inert. No phone number, no overlay, no action.</p>
</li>
<li><p><strong>3 of 4 Connect department buttons are dead.</strong> Scheduling, Creative, and Support produce no response when clicked. Only Accounting works (and it just says &quot;email us&quot;).</p>
</li>
</ol>
<h3>P1 - Functional Gaps</h3>
<ol start="5">
<li><p><strong>No mobile navigation.</strong> No hamburger menu. &quot;Talk to Us&quot; is hidden on mobile. Only &quot;Start a Brief&quot; is accessible from mobile header, and that form is broken (see #1).</p>
</li>
<li><p><strong>Secondary CTAs do nothing.</strong> &quot;See how it works&quot;, &quot;See the work&quot;, &quot;See what we&#39;d build&quot; are all dead buttons. These are the service section CTAs that should drive engagement.</p>
</li>
<li><p><strong>Anchor scroll is broken.</strong> The hero &quot;See the Work&quot; link and the three service card links (#work, #construction, #brands, #digital) don&#39;t scroll to their target sections despite the sections existing in the DOM.</p>
</li>
</ol>
<h3>P2 - Missing Features</h3>
<ol start="8">
<li><p><strong>No social media links.</strong> Zero social links anywhere on the site. No Instagram, LinkedIn, or any platform links.</p>
</li>
<li><p><strong>No footer navigation.</strong> No footer links at all besides the email and waitlist form.</p>
</li>
<li><p><strong>Zero images on the page.</strong> <code>&lt;img&gt;</code> tag count is 0. All visuals appear to be CSS backgrounds or video. Not necessarily a bug, but unusual.</p>
</li>
</ol>
<hr>
<h2>Environment Notes</h2>
<ul>
<li>Site is a Next.js app (React)</li>
<li>Google Analytics active (two GA4 properties: G-XRC3GJ475X, G-YLM5FV08MY)</li>
<li>Sentry error tracking active</li>
<li>Apollo intent pixel tracking active (returns 400 errors)</li>
<li>Waitlist API endpoint: <code>/api/waitlist</code> (functional, accepts POST with JSON <code>{&quot;email&quot;:&quot;...&quot;}</code>)</li>
<li>No broken images (because there are no images)</li>
<li>All CSS/JS assets load successfully</li>
</ul>
`,u={title:t,slug:n,category:o,agent:e,date:d,dateFormatted:r,updated:null,summary:i,tags:s,content:a};export{e as agent,o as category,a as content,d as date,r as dateFormatted,u as default,n as slug,i as summary,s as tags,t as title,l as updated};
