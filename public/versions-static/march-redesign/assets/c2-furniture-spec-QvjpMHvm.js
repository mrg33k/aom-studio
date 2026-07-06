const t="Corner C2 - Furniture Starter Pack Spec",n="c2-furniture-spec",e="Design Specs",r="Steffen",d="2026-03-15",a="Mar 15",s=null,o="15 base furniture items every Corner office gets. Grid-snapping, pixel dimensions, art style guide.",l=[],i=`<h1>Corner C2: Furniture Starter Pack</h1>
<p><em>Steffen | 2026-03-15</em>
<em>For Bobby + sprite generation. The free items every office gets. Future packs expand on this base.</em></p>
<hr>
<h2>Art Style Guide</h2>
<h3>Isometric Rules</h3>
<ul>
<li><strong>Projection:</strong> 2:1 isometric ratio (every 2px horizontal = 1px vertical on diagonal edges)</li>
<li><strong>Pixel art:</strong> Hard edges, no anti-aliasing, no gradients (use dithering for gradual tone shifts)</li>
<li><strong>Grid alignment:</strong> Every furniture item snaps to a 16x16px sub-grid within the 64x64 cell</li>
<li><strong>Outline:</strong> 1px black (#1A1A2E) outline on ALL furniture items for readability against any floor color</li>
<li><strong>Shadow:</strong> Each item casts a 2px drop shadow toward south-east, color rgba(0, 0, 0, 0.25)</li>
</ul>
<h3>Color Treatment</h3>
<ul>
<li><strong>Warm lighting baked in:</strong> Every item has its highlight side (north-west faces) 10-15% lighter than base color. Shadow side (south-east faces) 15-20% darker. This creates the warm ambient light feel without needing dynamic lighting per item.</li>
<li><strong>Palette consistency:</strong> All furniture uses the same base palette below. Variants per room adjust the warm/cool temperature but stay within these families.</li>
</ul>
<h3>Furniture Base Palette</h3>
<table>
<thead>
<tr>
<th>Color Family</th>
<th>Light</th>
<th>Base</th>
<th>Dark</th>
<th>Usage</th>
</tr>
</thead>
<tbody><tr>
<td>Wood (walnut)</td>
<td>#A88060</td>
<td>#8B6D4A</td>
<td>#6B4F30</td>
<td>Desks, shelves, frames</td>
</tr>
<tr>
<td>Wood (oak)</td>
<td>#C8A87A</td>
<td>#A07850</td>
<td>#7A5838</td>
<td>Lighter desks, floors</td>
</tr>
<tr>
<td>Metal (dark)</td>
<td>#5A6070</td>
<td>#3A4050</td>
<td>#252A38</td>
<td>Desk legs, monitor stands, server racks</td>
</tr>
<tr>
<td>Metal (chrome)</td>
<td>#B0B8C8</td>
<td>#8A94A8</td>
<td>#6A7488</td>
<td>Lamp arms, chair bases</td>
</tr>
<tr>
<td>Fabric (dark)</td>
<td>#404858</td>
<td>#2A3040</td>
<td>#1A2030</td>
<td>Chairs, couches</td>
</tr>
<tr>
<td>Fabric (accent)</td>
<td>agentColor light</td>
<td>agentColor</td>
<td>agentColor dark</td>
<td>Per-agent chair cushion, accent items</td>
</tr>
<tr>
<td>Glass/screen</td>
<td>#1A2A3A</td>
<td>#0F1A2A</td>
<td>#0A1020</td>
<td>Monitors, windows</td>
</tr>
<tr>
<td>Screen glow</td>
<td>#4FC3F7</td>
<td>varies</td>
<td>--</td>
<td>Active screen content</td>
</tr>
<tr>
<td>Paper/white</td>
<td>#F0ECE6</td>
<td>#D8D0C4</td>
<td>#B0A898</td>
<td>Notepads, papers, checklists</td>
</tr>
<tr>
<td>Plant (green)</td>
<td>#7CAA6A</td>
<td>#5A8848</td>
<td>#3A6830</td>
<td>All plant items</td>
</tr>
<tr>
<td>Ceramic</td>
<td>#E8DDD0</td>
<td>#C8B8A8</td>
<td>#A89888</td>
<td>Coffee mugs, pots</td>
</tr>
</tbody></table>
<h3>Grid Snapping</h3>
<p>Every furniture item occupies a discrete number of 16x16px sub-cells within the room&#39;s 64px grid cells. Items snap to the nearest sub-cell position. No free-floating placement.</p>
<p><strong>Snap grid:</strong> 16px increments within each 64px cell (4x4 sub-grid per cell)
<strong>Collision:</strong> Items cannot overlap. Each item&#39;s footprint is defined below.
<strong>Wall adjacency:</strong> Items marked &quot;wall&quot; must be placed against a wall edge. Items marked &quot;floor&quot; can go anywhere in the room.</p>
<hr>
<h2>Starter Pack Items (15 Total)</h2>
<h3>1. Standard Desk</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>desk-standard</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>2x1 sub-cells (32x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>48x32px (includes top surface depth)</td>
</tr>
<tr>
<td>Placement</td>
<td>wall</td>
</tr>
<tr>
<td>Material</td>
<td>Wood (oak) base palette</td>
</tr>
<tr>
<td>Variants</td>
<td><code>desk-walnut</code> (walnut palette), <code>desk-dark</code> (metal + dark wood)</td>
</tr>
<tr>
<td>Default rooms</td>
<td>All rooms without a specialized desk</td>
</tr>
<tr>
<td>Details</td>
<td>Flat surface, two leg supports, slight depth shelf underneath. Top surface is lighter (light catch).</td>
</tr>
<tr>
<td>Notes</td>
<td>The workhorse. Most agents sit at a variant of this.</td>
</tr>
</tbody></table>
<h3>2. Monitor (Single)</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>monitor-single</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (16x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>20x24px (taller than wide, includes stand)</td>
</tr>
<tr>
<td>Placement</td>
<td>on-desk (placed on top of a desk item)</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (dark) frame, Glass (screen) face</td>
</tr>
<tr>
<td>Screen content</td>
<td>4-frame animation: blue code, green terminal, white doc, agentColor dashboard. 2000ms per frame.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>All rooms (at least one per agent)</td>
</tr>
<tr>
<td>Details</td>
<td>Thin bezel (1px dark), slight tilt backward, thin stand, visible cable running down back to desk.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>monitor-dual</code> (two side by side, 32x24px), <code>monitor-triple</code> (three, 44x24px)</td>
</tr>
</tbody></table>
<h3>3. Office Chair</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>chair-office</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (16x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>16x22px (includes backrest height)</td>
</tr>
<tr>
<td>Placement</td>
<td>floor (in front of desk)</td>
</tr>
<tr>
<td>Material</td>
<td>Fabric (dark) seat/back, Metal (chrome) base + wheels</td>
</tr>
<tr>
<td>Accent</td>
<td>Seat cushion tinted with agentColor at 20% blend</td>
</tr>
<tr>
<td>Default rooms</td>
<td>All agent rooms</td>
</tr>
<tr>
<td>Details</td>
<td>5-star wheeled base (3 visible wheels from isometric angle), adjustable backrest, armrests visible as 1px lines.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>chair-stool</code> (no back, shorter, for standing desk), <code>chair-executive</code> (taller back, headrest, for Patrik)</td>
</tr>
</tbody></table>
<h3>4. Laptop</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>laptop-open</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (16x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>18x14px</td>
</tr>
<tr>
<td>Placement</td>
<td>on-desk</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (dark) body, Glass (screen)</td>
</tr>
<tr>
<td>Screen content</td>
<td>2-frame flicker: bright (agentColor glow), normal. 1600ms cycle.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Patrik, Alex, Steve</td>
</tr>
<tr>
<td>Details</td>
<td>Open at ~110 degrees. Keyboard visible as a lighter rectangle on the base. Screen shows agentColor-tinted content. Small trackpad below keyboard.</td>
</tr>
</tbody></table>
<h3>5. Bookshelf</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>bookshelf</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>2x1 sub-cells (32x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>32x40px (tall, wall-mounted feel)</td>
</tr>
<tr>
<td>Placement</td>
<td>wall</td>
</tr>
<tr>
<td>Material</td>
<td>Wood (oak) frame</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Alex, Steve</td>
</tr>
<tr>
<td>Details</td>
<td>3 shelves. Books are colored rectangles: mix of blue (#3B82F6), red (#EF4444), green (#7C9A72), cream (#FDF6EC), and brown (#8B6D4A). Books vary in height (6-10px) and width (2-4px). Some tilted. One shelf has a small object (globe, plant, or mug).</td>
</tr>
<tr>
<td>Variants</td>
<td><code>bookshelf-small</code> (1x1, 16x28px, 2 shelves)</td>
</tr>
</tbody></table>
<h3>6. Potted Plant</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>plant-potted</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (16x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>14x20px</td>
</tr>
<tr>
<td>Placement</td>
<td>floor or on-desk</td>
</tr>
<tr>
<td>Material</td>
<td>Ceramic (pot), Plant (green) (leaves)</td>
</tr>
<tr>
<td>Animation</td>
<td>2-frame subtle sway, 3000ms cycle (leaves shift 1px left/right). Optional, can be static.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Patrik, Main Hall, Steffen</td>
</tr>
<tr>
<td>Details</td>
<td>Round pot (cream/terracotta), 3-5 visible leaves spreading upward and outward. Compact enough for desk placement.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>plant-tall</code> (1x1 footprint but 32x40px sprite, floor only. Large leafy plant for Main Hall), <code>plant-succulent</code> (tiny, 8x10px, for Bobby&#39;s desk)</td>
</tr>
</tbody></table>
<h3>7. Coffee Mug</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>coffee-mug</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (occupies corner of sub-cell)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>8x10px</td>
</tr>
<tr>
<td>Placement</td>
<td>on-desk</td>
</tr>
<tr>
<td>Material</td>
<td>Ceramic base palette</td>
</tr>
<tr>
<td>Animation</td>
<td><code>steam-rise</code>: 6 frames, 400ms each. 3 small pixels (white at 40% opacity) rise and drift from the mug opening, disappearing at 6px height.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Patrik, Alex, Jacob, Main Hall</td>
</tr>
<tr>
<td>Details</td>
<td>Simple cylindrical mug with a 1px handle on the right side. Cream colored. Dark liquid visible at top (1px dark line).</td>
</tr>
<tr>
<td>Variants</td>
<td><code>coffee-cup-paper</code> (disposable, slightly different shape, no handle)</td>
</tr>
</tbody></table>
<h3>8. Desk Lamp</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>desk-lamp</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>12x20px</td>
</tr>
<tr>
<td>Placement</td>
<td>on-desk</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (chrome) arm, shade varies</td>
</tr>
<tr>
<td>Light color</td>
<td>#FFB74D default, or agentColor-tinted warm</td>
</tr>
<tr>
<td>Animation</td>
<td><code>light-pulse</code>: 2 frames. Frame 1: normal brightness. Frame 2: 10% brighter (1-2 pixels shift to lighter variant). 3000ms cycle. Subtle, not a strobe.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Cleo (#FFB74D), Steffen (#FFD87A)</td>
</tr>
<tr>
<td>Details</td>
<td>Articulated arm (2 segments), conical shade angled downward. Light pool visible on desk surface as a 2px lighter area below the shade.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>lamp-pendant</code> (ceiling mount, for Patrik and Bobby. Hangs from top of room, 16x16px, includes chain/cord)</td>
</tr>
</tbody></table>
<h3>9. Whiteboard</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>whiteboard</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>2x1 sub-cells (32x16px footprint, but wall-mounted so no floor collision)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>32x24px</td>
</tr>
<tr>
<td>Placement</td>
<td>wall</td>
</tr>
<tr>
<td>Material</td>
<td>White surface (#F0ECE6), Metal (chrome) frame (1px border)</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Alex (offer ladder), Mom (pipeline), Main Hall (pipeline)</td>
</tr>
<tr>
<td>Details</td>
<td>White rectangle on wall. Marker scribbles in agentColor (abstract squiggles, not readable text). Small tray at bottom with 2-3 colored marker dots (2px each).</td>
</tr>
<tr>
<td>Variants</td>
<td><code>whiteboard-large</code> (4x1 sub-cells, 64x28px, for Main Hall)</td>
</tr>
</tbody></table>
<h3>10. Server Rack</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>server-rack</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell (16x16px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>16x40px (tall)</td>
</tr>
<tr>
<td>Placement</td>
<td>wall</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (dark) body</td>
</tr>
<tr>
<td>Animation</td>
<td><code>server-blink</code>: 4 frames, 600ms each. 6-8 small dots (2px each) on the front face, alternating between green (#4CAF50) and blue (#2196F3) randomly each frame. No two adjacent dots same color.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Elon (x3)</td>
</tr>
<tr>
<td>Details</td>
<td>Tall black rectangle. Horizontal lines every 4px suggesting rack units. Small dots on front are status LEDs. Cables exit from back (visible as 1px lines running to adjacent rack or wall).</td>
</tr>
</tbody></table>
<h3>11. Couch / Sofa</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>couch-sectional</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>3x2 sub-cells (48x32px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>48x28px</td>
</tr>
<tr>
<td>Placement</td>
<td>floor</td>
</tr>
<tr>
<td>Material</td>
<td>Fabric (dark) main, Wood (oak) legs</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Main Hall</td>
</tr>
<tr>
<td>Details</td>
<td>L-shaped sectional (2 seat + corner + 1 seat). Cushions visible as slightly lighter rectangles on the seat surface. Armrests on ends. 4 small legs (2px squares, wood color). Looks inviting.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>couch-small</code> (2x1, single two-seater, 32x18px)</td>
</tr>
</tbody></table>
<h3>12. Camera on Tripod</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>camera-tripod</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>14x28px (tall)</td>
</tr>
<tr>
<td>Placement</td>
<td>floor</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (dark) body + Metal (chrome) tripod legs</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Cleo</td>
</tr>
<tr>
<td>Details</td>
<td>Camera body is a small dark rectangle with a lens (1px circle, glass color) facing south-east. Red recording dot (2px, #EF4444) when agent is active. Tripod has 3 visible legs spreading to a stable base.</td>
</tr>
<tr>
<td>Animation</td>
<td><code>record-light</code>: 2 frames. Red dot on/off, 1000ms cycle. Only when Cleo is in Speaking or Thinking state.</td>
</tr>
</tbody></table>
<h3>13. Ring Light</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>ring-light</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>16x30px (tall, includes stand)</td>
</tr>
<tr>
<td>Placement</td>
<td>floor (corner)</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (chrome) stand, white/warm ring</td>
</tr>
<tr>
<td>Light color</td>
<td>#FFFFFF main, #FFD87A warm variant</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Tony</td>
</tr>
<tr>
<td>Details</td>
<td>Circular ring (8px diameter visible) on a tall stand. When active (Tony is in any non-idle state), the ring glows with a 2px light halo around it (white at 20% opacity). Phone clip in center (tiny dark rectangle).</td>
</tr>
<tr>
<td>Animation</td>
<td><code>ring-glow</code>: 2 frames. Frame 1: normal. Frame 2: halo expands 1px. 2000ms cycle.</td>
</tr>
</tbody></table>
<h3>14. Espresso Machine</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>espresso-machine</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>1x1 sub-cell</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>16x18px</td>
</tr>
<tr>
<td>Placement</td>
<td>on-surface (counter or desk)</td>
</tr>
<tr>
<td>Material</td>
<td>Metal (chrome) body, Metal (dark) base</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Main Hall</td>
</tr>
<tr>
<td>Details</td>
<td>Boxy shape with a group handle visible on the front (small horizontal bar). Drip tray at bottom. Small cup under the spout.</td>
</tr>
<tr>
<td>Animation</td>
<td><code>steam-rise</code>: same as coffee mug but slightly larger steam particles. Only plays intermittently (every 10 seconds, 3 cycles, then pauses).</td>
</tr>
</tbody></table>
<h3>15. Area Rug</h3>
<table>
<thead>
<tr>
<th>Property</th>
<th>Value</th>
</tr>
</thead>
<tbody><tr>
<td>ID</td>
<td><code>rug-area</code></td>
</tr>
<tr>
<td>Grid footprint</td>
<td>4x2 sub-cells (64x32px footprint)</td>
</tr>
<tr>
<td>Pixel dimensions (sprite)</td>
<td>64x32px</td>
</tr>
<tr>
<td>Placement</td>
<td>floor (under furniture)</td>
</tr>
<tr>
<td>Material</td>
<td>Fabric</td>
</tr>
<tr>
<td>Color</td>
<td>Warm neutral base (#8A7A68) with subtle pattern in agentColor at 15% opacity. Diamond or chevron pattern, 8px repeat. Border edge is 1px darker.</td>
</tr>
<tr>
<td>Default rooms</td>
<td>Main Hall</td>
</tr>
<tr>
<td>Details</td>
<td>Flat on the floor. Z-index below all other furniture but above the floor tile/wood. Slightly warmer than the floor color to create visual depth.</td>
</tr>
<tr>
<td>Variants</td>
<td><code>rug-small</code> (2x1, 32x16px, for under individual desks)</td>
</tr>
</tbody></table>
<hr>
<h2>Placement Rules</h2>
<h3>Grid Snap</h3>
<ul>
<li>All items snap to nearest 16x16px sub-cell boundary</li>
<li>Items cannot be rotated (fixed isometric orientation)</li>
<li>Items marked &quot;wall&quot; must have at least one edge touching a wall</li>
<li>Items marked &quot;on-desk&quot; must be placed on top of a desk-type item</li>
<li>Items marked &quot;floor&quot; can be placed anywhere with clear floor space</li>
</ul>
<h3>Collision Detection</h3>
<ul>
<li>Each item has a rectangular collision box equal to its grid footprint</li>
<li>Items cannot overlap collision boxes</li>
<li>Exception: &quot;on-desk&quot; items overlap with the desk they sit on (they stack)</li>
<li>Exception: &quot;rug&quot; items go below everything (no collision with floor items)</li>
</ul>
<h3>Default Placements</h3>
<p>Bobby should auto-place furniture when a room is first created using these defaults:</p>
<pre><code>PATRIK:
  desk-walnut:        sub(0,0) wall-west
  laptop-open:        on desk
  coffee-mug:         on desk (right side)
  plant-potted:       sub(3,0) floor corner
  lamp-pendant:       ceiling center
  whiteboard:         sub(0,0) wall-north (mood board)
  chair-executive:    sub(1,1) floor

MOM:
  desk-standard:      sub(0,1) wall-west (standing desk variant)
  monitor-triple:     on desk
  whiteboard-large:   sub(0,0) wall-north (pipeline)
  chair-stool:        sub(1,2) floor

ALEX:
  desk-walnut:        sub(0,1) wall-west
  laptop-open:        on desk
  bookshelf:          sub(0,0) wall-north
  whiteboard:         sub(2,0) wall-north
  coffee-mug:         on desk
  chair-office:       sub(1,2) floor

STEVE:
  desk-standard:      sub(0,1) wall-north
  laptop-open:        on desk
  bookshelf-small:    sub(3,0) wall-east
  chair-office:       sub(1,2) floor

STEFFEN:
  desk-standard:      sub(2,1) wall-south
  monitor-single:     on desk
  plant-potted:       sub(0,3) floor
  desk-lamp:          on desk
  chair-office:       sub(2,2) floor

BOBBY:
  desk-dark:          sub(0,0) wall-northwest corner
  monitor-triple:     on desk
  plant-succulent:    on desk
  lamp-pendant:       ceiling center
  chair-office:       sub(1,2) floor

COLTON:
  desk-standard:      sub(0,1) wall-west
  monitor-dual:       on desk
  chair-office:       sub(1,2) floor

CLEO:
  desk-dark:          sub(0,1) wall-west
  monitor-dual:       on desk
  camera-tripod:      sub(3,0) floor
  desk-lamp:          on desk (orange)
  chair-office:       sub(1,2) floor

TONY:
  desk-standard:      sub(0,1) wall-west
  monitor-single:     on desk
  ring-light:         sub(3,0) floor corner
  chair-office:       sub(1,2) floor

JACOB:
  desk-standard:      sub(0,1) wall-north
  monitor-single:     on desk
  coffee-mug:         on desk
  whiteboard:         sub(0,0) wall-west (Phoenix map)
  chair-office:       sub(1,2) floor

ELMO:
  desk-standard:      sub(0,1) wall-north (clinical white variant)
  monitor-dual:       on desk (screenshots)
  chair-office:       sub(1,2) floor

ELON:
  server-rack x3:     sub(2,0), sub(3,0), sub(3,1) wall-east
  desk-standard:      sub(0,1) wall-west
  monitor-single:     on desk (green terminal)
  chair-office:       sub(1,2) floor

MAIN HALL:
  couch-sectional:    sub(1,1) floor center
  whiteboard-large:   sub(0,0) wall-north
  espresso-machine:   sub(6,0) wall-east (on counter)
  plant-tall:         sub(7,1) floor corner
  rug-area:           sub(1,0) floor (under couch)
</code></pre>
<hr>
<h2>Future Expansion Packs</h2>
<p>These are NOT part of the starter pack. Spec&#39;d here for Bobby&#39;s awareness and future planning.</p>
<h3>Developer Pack</h3>
<ul>
<li>RGB mechanical keyboard (replaces standard keyboard visual on desk)</li>
<li>Dual-GPU tower (visible through side panel, RGB fans)</li>
<li>Standing desk converter</li>
<li>Cable management tray (hides cables)</li>
<li>Rubber duck (debugging companion, 6x6px)</li>
</ul>
<h3>Creative Pack</h3>
<ul>
<li>Drawing tablet (Wacom-style, on desk)</li>
<li>Color swatch wall (replaces whiteboard with gradient swatches)</li>
<li>Vinyl record player (on shelf, spinning disc animation)</li>
<li>Inspiration wall (magazine clippings, photos, fabric samples)</li>
<li>DSLR camera (desk-mounted, not tripod)</li>
</ul>
<h3>Executive Pack</h3>
<ul>
<li>Leather chair (premium variant, wider, darker)</li>
<li>Crystal decanter set (decorative, on side table)</li>
<li>Framed diploma/certificate (wall-mounted)</li>
<li>Executive pen set (on desk)</li>
<li>Premium desk organizer (leather, holds items)</li>
</ul>
<h3>Scandinavian Pack</h3>
<ul>
<li>Minimalist desk (lighter wood, thinner legs)</li>
<li>Floor lamp (arc style, tall)</li>
<li>Knitted throw blanket (on chair)</li>
<li>Ceramic vase (simple, on shelf)</li>
<li>Wool rug (lighter, simpler pattern)</li>
</ul>
<h3>Server Pack (Elon-specific expansion)</h3>
<ul>
<li>Network switch (wall-mounted, blinky)</li>
<li>UPS battery backup (floor unit)</li>
<li>Temperature monitor (wall display, shows 68F)</li>
<li>Fire suppression panel (red, wall-mounted)</li>
<li>Cable management rack (vertical, organized)</li>
</ul>
<hr>
<h2>Sprite Generation Notes for Gemini/Pixel Artist</h2>
<p>When generating sprites:</p>
<ol>
<li><strong>Always render on transparent background</strong></li>
<li><strong>Use the exact palette colors above.</strong> No color picking from reference images.</li>
<li><strong>Each item is a separate PNG.</strong> Do not combine items into a single sheet.</li>
<li><strong>Naming:</strong> <code>{item-id}.png</code> and <code>{item-id}@2x.png</code> (32px and 64px detail versions)</li>
<li><strong>Isometric angle is consistent:</strong> All items face south-east. NW face is the light side. SE face is the shadow side.</li>
<li><strong>No anti-aliasing.</strong> Hard pixel edges only.</li>
<li><strong>Animation frames:</strong> Horizontal strip, each frame same dimensions, transparent background.</li>
<li><strong>Item shadows:</strong> Baked into the sprite as a 2px offset darker area at the base, SE direction.</li>
</ol>
<hr>
<p><em>15 items. Every office starts with these. Future packs are cosmetic upgrades and personality items. The starter pack is functional and warm. Bobby builds the placement system, then we layer in customization.</em></p>
`,c={title:t,slug:n,category:e,agent:r,date:d,dateFormatted:a,updated:null,summary:o,tags:l,content:i};export{r as agent,e as category,i as content,d as date,a as dateFormatted,c as default,n as slug,o as summary,l as tags,t as title,s as updated};
