const e="Corner - Connected Office Floor Plan Spec",n="corner-floor-plan-spec",t="Design Specs",o="Steffen",i="2026-03-15",l="Mar 15",d=null,r="The full connected office floor plan for Corner. One map. All agents. Shared walls.",a=[],s=`<h1>Corner: The Connected Office Floor Plan</h1>
<p><em>Steffen | 2026-03-15</em>
<em>For Patrik. The isometric game world.</em></p>
<hr>
<h2>The Vision</h2>
<p>One building. One connected floor plan. Every agent has a room. All rooms share walls. You see the entire office from above in isometric view, like Habbo Hotel or SimCity. You can zoom into any room to see details, but the default view is the full map.</p>
<p>The office grows as the business grows. New agents = new rooms added to the edges. The floor plan is alive. Lights turn on when agents are active. Activity pulses through hallways.</p>
<p>This is YOUR office. Your Corner.</p>
<hr>
<h2>Design Principles</h2>
<ul>
<li><strong>Pixel art isometric.</strong> Consistent 2:1 pixel ratio for all isometric lines.</li>
<li><strong>Dark navy background.</strong> The building floats on navy (#0A0F1E), warm interior lighting spills out.</li>
<li><strong>Warm lighting.</strong> Every room has warm amber/yellow light sources. Desk lamps, monitors, overhead bulbs.</li>
<li><strong>Alive and cozy.</strong> Small animations (in the live product): steam from coffee cups, blinking server lights, floating code particles in Bobby&#39;s room. Static concept shows all these details frozen.</li>
<li><strong>Readable at distance.</strong> Room labels/nameplates visible even when zoomed out. &quot;Old people can read em, young people love em.&quot;</li>
<li><strong>Consistent wall thickness.</strong> Shared walls are one unit thick. Interior walls are lighter than exterior.</li>
<li><strong>Windows on exterior walls only.</strong> Interior rooms have no windows (server room, QA lab). Corner and edge rooms get natural light.</li>
</ul>
<hr>
<h2>Floor Plan Layout</h2>
<p>The office is an L-shaped building, approximately 7 rooms wide and 5 rooms deep, with a central hallway/corridor running through the middle. Think of it as a real office you&#39;d lease in a building: not a perfect rectangle, but a functional space with character.</p>
<h3>ASCII Floor Plan (top-down, not isometric)</h3>
<pre><code>                    NORTH (top of isometric view)
    +-----------+-----------+-----------+-----------+
    |           |           |           |           |
    |  PATRIK   |   MOM     |   ALEX    |   STEVE   |
    |  (Corner  | (Command  | (Strategy)| (Advisory)|
    |  Office)  |  Center)  |           |           |
    |           |           |           |           |
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |           |                       |           |
    |  STEFFEN  |      MAIN HALL        |   JACOB   |
    |  (Design  |   (open floor plan    | (Outreach)|
    |  Studio)  |   with couches,       |           |
    |           |   whiteboard, plant)  |           |
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |           |           |           |           |
    |   BOBBY   |  COLTON   |   CLEO    |   TONY    |
    |  (Dev     | (Builder  | (Content  |  (Social  |
    |  Lab)     |  Bay)     |  Studio)  |  Media)   |
    |           |           |           |           |
    +-----+-----+-----+-----+-----+-----+-----------+
                |           |           |
                |   ELMO    |   ELON    |
                |  (QA Lab) |  (Server  |
                |           |   Room)   |
                |           |           |
                +-----------+-----------+
                    SOUTH (front of isometric view)
</code></pre>
<h3>Room Adjacency Map</h3>
<table>
<thead>
<tr>
<th>Room</th>
<th>Shares Wall With</th>
<th>Why</th>
</tr>
</thead>
<tbody><tr>
<td>Patrik (Corner Office)</td>
<td>Mom, Steffen</td>
<td>The boss needs direct access to his orchestrator and his creative director. Corner position = two exterior walls = windows on two sides. THE corner office.</td>
</tr>
<tr>
<td>Mom (Command Center)</td>
<td>Patrik, Alex, Main Hall</td>
<td>Mom is the orchestrator. She needs line-of-sight to strategy (Alex) and direct access to Patrik. Central upper position = she sees everything.</td>
</tr>
<tr>
<td>Alex (Strategy)</td>
<td>Mom, Steve, Main Hall</td>
<td>Strategy and advisory are a pair. Alex architects the offer, Steve builds the system. Side by side. Both report up to Mom.</td>
</tr>
<tr>
<td>Steve (Advisory)</td>
<td>Alex, Jacob</td>
<td>Steve&#39;s AI advisory work connects to Alex&#39;s strategy AND Jacob&#39;s outreach (they&#39;re selling the same product). Far corner = focused, analytical.</td>
</tr>
<tr>
<td>Steffen (Design Studio)</td>
<td>Patrik, Bobby, Main Hall</td>
<td>Creative director next to the boss (direct feedback loop) and next to the builder (design-to-dev handoff). The studio has an arched window (matching existing room concept).</td>
</tr>
<tr>
<td>Bobby (Dev Lab)</td>
<td>Steffen, Colton, Elmo</td>
<td>Dev lab next to design studio = seamless handoff. Next to Colton (his backup) = pair programming. Above Elmo = built code drops directly to QA. Purple LED underglow (matching existing concept).</td>
</tr>
<tr>
<td>Colton (Builder Bay)</td>
<td>Bobby, Cleo, Elmo</td>
<td>Bobby&#39;s backup sits right next to him. Also adjacent to Cleo for frontend content components.</td>
</tr>
<tr>
<td>Cleo (Content Studio)</td>
<td>Colton, Tony, Elon</td>
<td>Content production next to social media (Tony posts what Cleo creates). Adjacent to the server room (Elon) because renders are compute-heavy. Camera on tripod, editing monitors, clapperboard (matching existing concept).</td>
</tr>
<tr>
<td>Tony (Social Media)</td>
<td>Cleo, Jacob</td>
<td>Social media next to content (Cleo feeds Tony). Also near outreach (Jacob) because social and outreach are two sides of the same coin.</td>
</tr>
<tr>
<td>Jacob (Outreach)</td>
<td>Steve, Tony, Main Hall</td>
<td>Outreach connects to advisory (Steve, selling the product) and social (Tony, brand awareness). Has direct Main Hall access for quick coordination.</td>
</tr>
<tr>
<td>Elmo (QA Lab)</td>
<td>Bobby, Colton, Elon</td>
<td>QA sits below the builders. Everything Bobby and Colton build passes through Elmo. Adjacent to Elon because QA and infrastructure share monitoring concerns.</td>
</tr>
<tr>
<td>Elon (Server Room)</td>
<td>Cleo, Elmo</td>
<td>Infrastructure backend. Adjacent to Cleo (render compute) and Elmo (monitoring). Darker room, server racks, green terminal glow, exposed conduit (matching existing concept). The engine room. No windows.</td>
</tr>
<tr>
<td>Main Hall</td>
<td>Mom, Alex, Steffen, Jacob</td>
<td>The open space in the center. Not an agent room. It&#39;s the communal area: couches, a big whiteboard with the pipeline drawn on it, a potted plant, maybe a coffee station. This is where agents conceptually &quot;meet&quot; for cross-team work.</td>
</tr>
</tbody></table>
<hr>
<h2>Room Details</h2>
<h3>Patrik&#39;s Corner Office (NW corner)</h3>
<ul>
<li><strong>Two exterior walls with large windows.</strong> Natural light from two sides. This is the premium corner unit.</li>
<li>Wooden desk (walnut), laptop, coffee mug, a small plant.</li>
<li>Mood board on the wall with AOM brand pieces.</li>
<li>Clean, minimal, spacious. More breathing room than any other room. Boss energy.</li>
<li>Warm overhead pendant light (geometric, brass).</li>
<li>The door faces Mom&#39;s room directly.</li>
</ul>
<h3>Mom&#39;s Command Center</h3>
<ul>
<li><strong>Multiple monitors</strong> showing agent statuses (like a mission control dashboard).</li>
<li>Standing desk setup. She&#39;s always moving.</li>
<li>A large screen on the wall showing the pipeline: Elon &gt; Mom &gt; Alex &gt; Steffen &gt; Bobby &gt; Elmo.</li>
<li>Color-coded status lights above each agent&#39;s name (green/yellow/red).</li>
<li>Organized but intense. Post-it notes. Priority boards.</li>
</ul>
<h3>Alex&#39;s Strategy Room</h3>
<ul>
<li>Bookshelf (business strategy, marketing, Sun Tzu).</li>
<li>Whiteboard with offer ladders and market maps.</li>
<li>Globe on the desk (he thinks about markets).</li>
<li>Laptop, coffee, strategy docs spread out.</li>
<li>Warm but analytical. Think consulting firm partner&#39;s office.</li>
</ul>
<h3>Steve&#39;s Advisory Lab</h3>
<ul>
<li>Clean desk with a laptop showing database schemas.</li>
<li>Architecture diagrams on the wall (Supabase, multi-tenant flows).</li>
<li>Bookshelf with technical and business books.</li>
<li>Globe + calculator on desk. Where frameworks are born.</li>
<li>Window on the east wall. Quiet, focused.</li>
</ul>
<h3>Steffen&#39;s Design Studio</h3>
<ul>
<li><strong>Arched window</strong> (matches existing concept) letting in golden light.</li>
<li>Large mood board/pin board with color swatches, typography samples, brand pieces.</li>
<li>iMac-style monitor showing color wheel/design tool.</li>
<li>Canvases leaning against the wall (in-progress work).</li>
<li>Paint swatches, pantone books on the desk.</li>
<li>Warm wooden floor. The most &quot;art studio&quot; room in the building.</li>
</ul>
<h3>Bobby&#39;s Dev Lab</h3>
<ul>
<li><strong>Triple monitor setup</strong> with code on screens (matches existing concept).</li>
<li>Mechanical keyboard, headphones on desk.</li>
<li>Purple/violet LED underglow on the desk.</li>
<li>Small succulent plant. Energy drink.</li>
<li>Dark walls with geometric pendant light.</li>
<li>The room hums with dev energy. Late-night vibes.</li>
</ul>
<h3>Colton&#39;s Builder Bay</h3>
<ul>
<li>Similar to Bobby&#39;s but slightly smaller.</li>
<li>Dual monitor setup.</li>
<li>Shared tooling wall between Colton and Bobby&#39;s rooms (like a shared shelf/window).</li>
<li>Component library printouts on the wall.</li>
<li>More organized than Bobby&#39;s room. The backup is methodical.</li>
</ul>
<h3>Cleo&#39;s Content Studio</h3>
<ul>
<li>Camera on tripod. Clapperboard. Film reel poster.</li>
<li>Editing monitors showing timeline (NLE interface).</li>
<li>Desk lamp (warm orange, matches existing concept).</li>
<li>Dark brick accent wall (matches existing concept).</li>
<li>Audio waveforms visible on a secondary monitor.</li>
<li>Small speaker setup. Headphones hanging on a hook.</li>
</ul>
<h3>Tony&#39;s Social Media Hub</h3>
<ul>
<li>Multiple phone screens showing social platforms (IG, LinkedIn, TikTok feeds).</li>
<li>Content calendar on the wall (large, colorful, grid layout).</li>
<li>Ring light in the corner (for content creation).</li>
<li>Trendy posters. Bright accent colors.</li>
<li>The most &quot;young energy&quot; room. Slightly more colorful than others.</li>
</ul>
<h3>Jacob&#39;s Outreach Office</h3>
<ul>
<li>Phone on the desk (cold calls). Headset.</li>
<li>CRM-style dashboard on monitor (contact lists, email stats).</li>
<li>Map of Phoenix metro on the wall with pins.</li>
<li>Stack of business cards. Notepad.</li>
<li>Professional but scrappy. He&#39;s grinding. Coffee cups (plural).</li>
</ul>
<h3>Elmo&#39;s QA Lab</h3>
<ul>
<li><strong>Two large monitors</strong> showing website screenshots side by side (before/after).</li>
<li>Checklist printouts on the wall. Red pen on the desk.</li>
<li>Magnifying glass (literal, as a desk object). The inspector.</li>
<li>Clean, clinical. White-ish walls compared to other rooms. Lab coat on a hook.</li>
<li>Everything is orderly. Elmo finds chaos, he doesn&#39;t create it.</li>
</ul>
<h3>Elon&#39;s Server Room</h3>
<ul>
<li><strong>Server racks</strong> (3 tall black racks with green/blue blinking lights, matches existing concept).</li>
<li>Exposed conduit/cables running along walls and ceiling.</li>
<li>Single terminal with green text on black screen.</li>
<li>Tile floor (industrial, matches existing concept).</li>
<li>Bare bulb overhead. No natural light. No windows.</li>
<li>The coldest-colored room in the building. Functional, not decorative.</li>
<li>Subtle hum implied by the environment. The engine room.</li>
</ul>
<h3>Main Hall (Central Corridor)</h3>
<ul>
<li>Open floor plan connecting all the rooms.</li>
<li>Comfortable couch/seating area.</li>
<li>Large whiteboard with the production pipeline drawn out.</li>
<li>Potted plant (tall, leafy, adds life).</li>
<li>Coffee station with a small espresso machine.</li>
<li>Warm overhead lighting. Wooden floor like Steffen&#39;s studio.</li>
<li>This is where cross-team energy lives. Not assigned to anyone.</li>
</ul>
<hr>
<h2>Growth Model</h2>
<p>The L-shape has open edges on the south and east sides. When new agents join:</p>
<ul>
<li><strong>Paige (Client Tracking)</strong> would add adjacent to Mom and Jacob. She tracks clients, connects to orchestration and outreach.</li>
<li><strong>Pixel (VS Code Extension)</strong> would add adjacent to Bobby. Dev tooling lives near dev.</li>
<li><strong>Future agents</strong> extend the south or east wing. The floor plan grows organically, like a real office getting new tenants.</li>
</ul>
<p>The building never looks &quot;complete.&quot; There&#39;s always room to grow. That&#39;s the product metaphor: your Corner keeps expanding.</p>
<hr>
<h2>Isometric View Notes</h2>
<ul>
<li><strong>Camera angle:</strong> Standard isometric (30-degree from horizontal, 2:1 pixel ratio). Viewing from the SOUTH-EAST corner, so Patrik&#39;s Corner Office is in the far back-left and Elon&#39;s Server Room is in the near front-right.</li>
<li><strong>Roof:</strong> Cut away. We see directly into all rooms from above. Walls are about 3/4 height so you can see the interior details.</li>
<li><strong>Exterior:</strong> Dark navy void (#0A0F1E). The building floats. Maybe a subtle ground plane with a few decorative elements (a bench, a small tree, a path leading to the &quot;front door&quot;).</li>
<li><strong>Front entrance:</strong> On the south side near the Main Hall opening. A small awning or sign that says &quot;CORNER&quot; above the door.</li>
<li><strong>Lighting spill:</strong> Warm light spills out of windows and doorways onto the ground plane. The building glows against the dark background.</li>
<li><strong>Scale:</strong> Each room is roughly the same footprint as the existing individual room concepts. The full office is approximately 7 rooms wide by 5 rooms tall in the isometric grid.</li>
</ul>
<hr>
<h2>Color Palette</h2>
<table>
<thead>
<tr>
<th>Element</th>
<th>Color</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Background</td>
<td>#0A0F1E</td>
<td>Dark navy void</td>
</tr>
<tr>
<td>Exterior walls</td>
<td>#4A5568</td>
<td>Medium gray, slightly warm</td>
</tr>
<tr>
<td>Interior walls</td>
<td>#718096</td>
<td>Lighter gray, thinner</td>
</tr>
<tr>
<td>Floors (wood)</td>
<td>#C4956A / #B8845A</td>
<td>Warm wood tones, varies by room</td>
</tr>
<tr>
<td>Floors (tile)</td>
<td>#8B9DAF</td>
<td>Server room, QA lab only</td>
</tr>
<tr>
<td>Window light</td>
<td>#FFD87A</td>
<td>Warm golden amber</td>
</tr>
<tr>
<td>Monitor glow</td>
<td>#4FC3F7 / #81C784 / #CE93D8</td>
<td>Blue/green/purple per agent</td>
</tr>
<tr>
<td>Bobby&#39;s LEDs</td>
<td>#9C27B0</td>
<td>Purple underglow</td>
</tr>
<tr>
<td>Server lights</td>
<td>#4CAF50 / #2196F3</td>
<td>Green and blue blink dots</td>
</tr>
<tr>
<td>Ambient warm</td>
<td>#FFB74D</td>
<td>Desk lamps, overhead lights</td>
</tr>
</tbody></table>
<hr>
<h2>In the Live Product</h2>
<p>This floor plan is the <strong>default view</strong> when you open Corner. You see your whole office from above. Active agents have their room lights on. Inactive rooms are dimmer. Clicking/tapping any room zooms into that agent&#39;s detail view.</p>
<p>The map breathes. It&#39;s not static. It&#39;s your business, alive.</p>
<hr>
<p><em>This spec is the foundation for the isometric game world. The image concept (corner-floor-plan-concept.png) visualizes this layout. Bobby builds it. Elmo QAs it. Patrik sees a living office.</em></p>
`,h={title:e,slug:n,category:t,agent:o,date:i,dateFormatted:l,updated:null,summary:r,tags:a,content:s};export{o as agent,t as category,s as content,i as date,l as dateFormatted,h as default,n as slug,r as summary,a as tags,e as title,d as updated};
