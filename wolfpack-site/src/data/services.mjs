// Service-family page records.
// Copy is VERBATIM from the live pages at public/wolfpack-site/<slug>/index.html
// (hero, intro, benefit cards, steps, offers). Photo labels/alts describe the
// new numbered photos in src/assets/work/ (reviewed frame by frame) — the old
// AI images (work-*.jpg, hero-jetting, jet-hero, fog-hero, pm-*) are banned.
// Where a live page had no real copy for a comp section (or its copy was a
// duplication artifact from another service), the section is omitted here.

export const services = [
  {
    slug: 'hydro-jetting',
    eyebrow: 'Service · the specialty',
    heroLines: [
      { text: 'Hydro jetting.' },
      { text: 'The line goes' },
      { text: 'back to ', accent: 'bare pipe.' },
    ],
    heroSub: 'High-pressure cleaning of commercial drain and sewer lines. Not a snake. Not a patch.',
    heroImage: 'work/01-hydro-jetting-v3-brand.jpg',
    heroAlt: 'Wolfpack crew jetting a commercial line',
    photos: [
      { image: 'work/02-hydro-jetting-b.jpg', alt: 'Crew jetting a commercial line from the truck-mounted unit', label: 'Truck-mounted jetter' },
      { image: 'work/03-hydro-jetting-c.jpg', alt: 'Feeding the jetter hose into a commercial cleanout', label: 'Into the line' },
      { image: 'work/04-hydro-jetting-d.jpg', alt: 'Interceptor service at a commercial property', label: 'Interceptor service' },
    ],
    beforeAfters: {
      heading: 'You can see what',
      headingDim: 'we removed.',
      groups: [
        {
          kind: 'Concrete pipe',
          before: 'pipe-before.jpg', beforeCap: 'Before — hardened FOG, bore reduced',
          after: 'pipe-after.jpg', afterCap: 'After — full bore, bare wall',
        },
        {
          kind: 'Cast iron pipe',
          before: 'pipe-castiron-before.jpg', beforeCap: 'Before — scale and corrosion buildup',
          after: 'pipe-castiron-after.jpg', afterCap: 'After — bore cleared, wall exposed',
        },
        {
          kind: 'PVC pipe',
          before: 'pipe-pvc-before.jpg', beforeCap: 'Before — grease and sediment narrowing bore',
          after: 'pipe-pvc-after.jpg', afterCap: 'After — full bore, clean wall',
        },
      ],
    },
    benefits: {
      heading: 'Why hydrojetting is important.',
      intro: 'Commercial drain lines collect grease, mineral scale, soap residue and root intrusions over time. A cable punches a temporary hole. Hydrojetting restores the full diameter of the pipe, which is the difference between a fix that lasts weeks and a fix that lasts years.',
      cards: [
        { title: 'Prevents emergency shutdowns', desc: 'Grease and scale build slowly until the line backs up at the worst possible time. Scheduled jetting removes the buildup before it becomes a crisis.' },
        { title: 'Extends pipe life', desc: 'Corrosion accelerates under deposits. Keeping the bore clean reduces stress on joints and pipe walls, extending the useful life of your system.' },
        { title: 'Documented condition', desc: 'Every jetting job includes camera footage before and after. You have a visual record of your pipe condition for inspections, insurance and capital planning.' },
      ],
    },
    versus: {
      headingPre: 'A cable punches a hole. ',
      headingAccent: 'Water',
      headingPost: ' takes the wall back.',
      losing: {
        title: 'Cable / snake',
        icon: 'cable',
        points: ['A cable bores a hole.', 'It breaks through the blockage.', 'The pipe wall is left coated.'],
      },
      winning: {
        title: 'Hydro jetting',
        icon: 'jet',
        badge: 'The Wolfpack way',
        points: ['High-pressure water scours the full bore.', 'Back to bare wall.'],
      },
    },
    steps: {
      heading: 'Four steps. Documented.',
      items: [
        { title: 'Manage the water', desc: 'We assess flow, isolate the section, and control what is moving before anything else happens.' },
        { title: 'Jet', desc: 'High-pressure water scours the full bore, wall to wall, removing grease, scale, roots and debris.' },
        { title: 'Camera', desc: 'HD camera inspection of the cleaned line so you can see the condition of the pipe after jetting.' },
        { title: 'Draft a report', desc: 'Footage, findings and recommendations documented against the property for your records.' },
      ],
    },
    offer: {
      lines: ['Free camera inspection', 'with every jetting job.'],
      cta: 'Book an inspection',
    },
  },
  {
    slug: 'drain-cleaning',
    eyebrow: 'Service',
    heroLines: [
      { text: 'Drain cleaning.' },
      { text: 'Camera proof' },
      { accent: "it's clear." },
    ],
    heroSub: 'Mechanical or hydro clearing followed by HD camera inspection. You see the footage. We document the condition.',
    heroImage: 'work/05-drain-camera-a.jpg',
    heroAlt: 'Technician running a camera reel into a commercial kitchen floor drain',
    photos: [
      { image: 'work/06-drain-camera-b.jpg', alt: 'Two technicians clearing an exterior cleanout with the camera monitor running', label: 'Clearing the cleanout' },
      { image: 'work/07-drain-camera-c.jpg', alt: 'Push camera fed into an open cleanout, monitor showing the pipe bore', label: 'Camera down the line' },
    ],
    benefits: {
      heading: 'Why camera inspection matters.',
      intro: 'A cleared line is not a healthy line. Camera footage after every clearing shows you the actual condition of the pipe wall, joints, and slope. That record drives real maintenance decisions instead of guesswork.',
      cards: [
        { title: 'HD video documentation', desc: 'Every clearing includes camera footage of the cleaned line. You get the file, not a verbal summary.' },
        { title: 'Condition reporting', desc: 'Written report with footage timestamps tied to footage. Shows where problems are developing before they become emergencies.' },
        { title: 'Per-address records', desc: 'Camera logs organized by property so you can track condition over time and show documentation to inspectors or investors.' },
      ],
    },
    steps: {
      heading: 'How it works. Documented.',
      items: [
        { title: 'Locate the access', desc: 'Identify cleanout locations and determine the best entry point for the run.' },
        { title: 'Clear the line', desc: 'Mechanical cable or hydro clearing depending on the blockage type and pipe material.' },
        { title: 'Camera the full run', desc: 'HD push camera through the cleared line, recording footage and noting conditions at every joint and transition.' },
        { title: 'Report', desc: 'Findings, footage file, and recommendations delivered. Per-address documentation for your records.' },
      ],
    },
    offer: {
      lines: ['Every clearing comes', 'with camera proof.'],
      cta: 'Book a drain clearing',
    },
  },
  {
    slug: 'air-compressor',
    eyebrow: 'Service',
    heroLines: [
      { text: 'Air compressor' },
      { text: 'installation.' },
      { accent: 'Industrial grade.' },
    ],
    heroSub: 'Commercial and industrial air compressor systems. Sizing, piping, electrical coordination, and commissioning.',
    heroImage: 'work/08-air-compressor-a.jpg',
    heroAlt: 'Technician fitting piping on a commercial air compressor and receiver tanks',
    photos: [
      { image: 'work/09-air-compressor-b.jpg', alt: 'Technician fastening a copper air line along the shop wall', label: 'Running the air line' },
    ],
    // The live page's benefit cards and steps repeat drain-cleaning copy
    // (a duplication artifact), so those sections are omitted here.
    benefits: {
      heading: 'Why professional installation matters.',
      intro: 'A compressor is only as good as its installation. Undersized piping, poor drainage, and incorrect electrical coordination cause failures that cost more than the equipment. Professional installation protects the investment from day one.',
      cards: [],
    },
    offer: {
      lines: ['Need a compressor', 'installed right?'],
      cta: 'Tell us about your project',
    },
  },
  {
    slug: 'backflow-testing',
    eyebrow: 'Service',
    heroLines: [
      { text: 'Backflow testing.' },
      { text: 'Certified.' },
      { accent: 'Compliant.' },
    ],
    heroSub: 'Certified backflow testing and repair to keep your commercial properties compliant with municipal requirements across the Valley.',
    heroImage: 'work/12-backflow-a.jpg',
    heroAlt: 'Certified technician testing a backflow assembly with a gauge kit',
    photos: [
      { image: 'work/13-backflow-b.jpg', alt: 'Technician recording backflow test results on a tablet beside the assembly', label: 'Logging the results' },
    ],
    benefits: {
      heading: 'Why backflow testing is required.',
      intro: 'Municipal water systems require backflow prevention to protect drinking water from contamination. Commercial properties must test annually. Failed or missed tests trigger violations, fines, and potential water shutoff.',
      cards: [
        { title: 'Certified testing', desc: 'Our technicians hold current backflow certifications. Tests meet all municipal requirements across Greater Phoenix jurisdictions.' },
        { title: 'Filed with the city', desc: 'Test reports filed directly with the governing municipality. You stay compliant without chasing paperwork.' },
        { title: 'Annual scheduling', desc: 'We track your test dates and schedule before deadlines. No missed renewals, no violations.' },
      ],
    },
    steps: {
      heading: 'How it works. Documented.',
      items: [
        { title: 'Locate assemblies', desc: 'Identify every backflow prevention assembly on the property and verify accessibility.' },
        { title: 'Test', desc: 'Certified test on each assembly per ASSE standards. Measure differential pressure, check valves, relief.' },
        { title: 'Repair if needed', desc: 'Failed assemblies repaired or replaced on site. Retest immediately to confirm compliance.' },
        { title: 'File and document', desc: 'Test reports filed with the municipality and copies provided for your records.' },
      ],
    },
    offer: {
      lines: ['Stay compliant.', 'We handle the paperwork.'],
      cta: 'Schedule backflow testing',
    },
  },
  {
    slug: 'water-heaters',
    eyebrow: 'Service',
    heroLines: [
      { text: 'Water heaters' },
      { text: 'and boilers.' },
      { accent: 'Commercial grade.' },
    ],
    heroSub: 'Installation, repair and routine maintenance of commercial water heaters and boiler systems for hotels, multi-family, and commercial properties.',
    heroImage: 'work/14-water-heater-a.jpg',
    heroAlt: 'Technician piping twin commercial water heaters',
    photos: [
      { image: 'work/15-boiler-a.jpg', alt: 'Technician checking gauges on a commercial boiler system', label: 'Boiler room check' },
      { image: 'work/16-water-heater-b.jpg', alt: 'Technician commissioning a bank of three tankless water heaters', label: 'Tankless bank' },
    ],
    benefits: {
      heading: 'Why commercial systems need specialists.',
      intro: 'Commercial water heaters and boilers operate under higher pressures, higher temperatures, and heavier demand than residential units. Proper sizing, venting, and maintenance are the difference between reliable hot water and costly downtime.',
      cards: [
        { title: 'Full system installation', desc: 'Sizing, placement, venting, piping and controls. New installs or replacements matched to actual building demand.' },
        { title: 'Emergency repair', desc: 'Hot water outage in a hotel or multi-family building is an emergency. We respond same-day for contracted properties.' },
        { title: 'Preventive maintenance', desc: 'Scheduled flush, anode inspection, burner cleaning and safety testing to extend equipment life and prevent failures.' },
      ],
    },
    steps: {
      heading: 'How it works. Documented.',
      items: [
        { title: 'Assess', desc: 'Evaluate the existing system, building demand, and any code requirements specific to your property type.' },
        { title: 'Quote', desc: 'Detailed scope and pricing. Equipment options with efficiency and lifecycle cost comparison.' },
        { title: 'Install or repair', desc: 'Licensed crew handles the work. Permits pulled where required. System tested under load before handoff.' },
        { title: 'Document', desc: 'As-built documentation, warranty registration, and maintenance schedule provided.' },
      ],
    },
    offer: {
      lines: ['Hot water is not optional.', 'Call direct.'],
      cta: 'Schedule service',
    },
  },
  {
    slug: 'leak-detection',
    eyebrow: 'Service',
    heroLines: [
      { text: 'Under-slab' },
      { text: 'leak detection.' },
      { accent: 'No guesswork.' },
    ],
    heroSub: 'Non-invasive electronic and acoustic leak location. We pinpoint the problem without unnecessary demolition.',
    heroImage: 'work/17-leak-detection-a.jpg',
    heroAlt: 'Technician sweeping a slab with acoustic leak detection equipment',
    photos: [
      { image: 'work/18-leak-detection-b.jpg', alt: 'Handheld leak detection meter reading an acoustic ground sensor', label: 'Pinpointing the signal' },
    ],
    benefits: {
      heading: 'Why non-invasive detection matters.',
      intro: 'Cutting a slab to find a leak is expensive, disruptive, and often wrong the first time. Electronic and acoustic detection pinpoints the location before any concrete is touched, reducing repair cost and business interruption.',
      cards: [
        { title: 'Pinpoint accuracy', desc: 'Electronic and acoustic equipment locates leaks within inches. You break concrete once, in the right place.' },
        { title: 'Documented findings', desc: 'Location mapped and documented before repair begins. Clear evidence for insurance, property managers, and investors.' },
        { title: 'Minimal disruption', desc: 'No exploratory demolition. Detection equipment works through finished floors, reducing downtime for tenants and operations.' },
      ],
    },
    steps: {
      heading: 'How it works. Documented.',
      items: [
        { title: 'Isolate the system', desc: 'Identify which supply or drain lines are losing pressure or showing evidence of a leak.' },
        { title: 'Detect', desc: 'Electronic and acoustic equipment scans through the slab to pinpoint the leak location.' },
        { title: 'Mark and document', desc: 'Leak location marked on the floor and documented with measurements for the repair crew.' },
        { title: 'Repair options', desc: 'Scope the repair: spot fix, reroute, or repipe. Recommendation based on pipe condition and building use.' },
      ],
    },
    offer: {
      lines: ['Find it without', 'breaking everything.'],
      cta: 'Schedule leak detection',
    },
  },
  {
    slug: 'emergency',
    eyebrow: 'Emergency',
    heroLines: [
      { text: '24/7 emergency.' },
      { text: 'A person answers.' },
      { accent: 'Crews dispatch.' },
    ],
    heroSub: 'Day or night, a person picks up. Crews dispatch from Phoenix. On site for contracted properties within 3 hours.',
    heroImage: 'work/19-emergency-a.jpg',
    heroAlt: 'Wolfpack technician rolling a drain machine to a storefront at night',
    photos: [
      { image: 'work/20-emergency-b.jpg', alt: 'Crew running a drain machine at a commercial cleanout after dark', label: 'After-hours cleanout' },
    ],
    benefits: {
      heading: 'Why response time is everything.',
      intro: 'A broken line at 2 AM in a 100-unit hotel is not a maintenance ticket. It is lost revenue, displaced guests, and water damage compounding by the minute. Response time is the only metric that matters in an emergency.',
      cards: [
        { title: 'A person answers', desc: 'No phone tree, no voicemail, no after-hours service. A real person answers and dispatches.' },
        { title: 'Phoenix-based crews', desc: 'Trucks and equipment staged in Phoenix. Not routed from another city.' },
        { title: '3-hour on-site', desc: 'Contracted properties get on-site response within 3 hours, day or night. That clock starts when you call.' },
      ],
    },
    steps: {
      heading: 'How it works. Documented.',
      items: [
        { title: 'Call', desc: '602-550-5452. A person answers, 24 hours a day. Describe what is happening.' },
        { title: 'Dispatch', desc: 'Crew assigned and rolling. You get a name and an ETA.' },
        { title: 'Arrive and contain', desc: 'Stop the damage first. Isolate the problem, manage water, protect the building.' },
        { title: 'Fix and document', desc: 'Permanent repair or temporary stabilization with a plan for permanent. Documented for insurance.' },
      ],
    },
    offer: {
      lines: ['Plumbing emergency?', 'Call now.'],
      cta: 'Request a walkthrough',
    },
  },
]

export function findService(slug) {
  return services.find(service => service.slug === slug)
}

// Services overview grid. Names and descriptions verbatim from the live
// services page; the Air Compressor card (absent from the live grid) uses the
// air-compressor page's own hero copy so every service page is linked.
export const serviceIndex = {
  eyebrow: 'What we do',
  heroLines: [
    { text: 'Commercial plumbing' },
    { accent: 'services.' },
  ],
  heroSub: 'Licensed, bonded, and insured. AZ ROC #326629. Every service below is available 24/7 for contracted properties across the Phoenix metro.',
  cards: [
    {
      name: 'Hydro Jetting', href: '/hydro-jetting/', image: 'work/02-hydro-jetting-b.jpg',
      desc: 'High-pressure water scours the full bore of commercial drain and sewer lines, removing grease, roots, scale and debris back to bare pipe.',
    },
    {
      name: 'Drain Cleaning & Camera Inspection', href: '/drain-cleaning/', image: 'work/05-drain-camera-a.jpg',
      desc: 'Clear blockages mechanically or with water, then inspect the full run with HD camera to document condition and locate problems.',
    },
    {
      name: 'Air Compressor Installation', href: '/air-compressor/', image: 'work/08-air-compressor-a.jpg',
      desc: 'Commercial and industrial air compressor systems. Sizing, piping, electrical coordination, and commissioning.',
    },
    {
      name: 'Maintenance Contracts', href: '/property-managers/', image: 'work/10-maintenance-a.jpg',
      desc: 'One agreement covers the whole portfolio. Scheduled service cadence set per address from real volume, not a blanket rule.',
    },
    {
      name: 'Backflow Testing & Repair', href: '/backflow-testing/', image: 'work/12-backflow-a.jpg',
      desc: 'Certified backflow testing and repair to keep your properties compliant with municipal requirements.',
    },
    {
      name: 'Water Heaters & Boilers', href: '/water-heaters/', image: 'work/16-water-heater-b.jpg',
      desc: 'Commercial water heater and boiler installation, repair and routine maintenance for multi-unit and commercial properties.',
    },
    {
      name: 'Under-Slab Leak Detection', href: '/leak-detection/', image: 'work/17-leak-detection-a.jpg',
      desc: 'Non-invasive electronic and acoustic leak location to pinpoint under-slab leaks without unnecessary demolition.',
    },
    {
      name: '24/7 Emergency Response', href: '/emergency/', image: 'work/19-emergency-a.jpg',
      desc: 'A person answers the phone, day or night. Crews dispatch from Phoenix. On-site within 3 hours for contracted properties.',
    },
    {
      name: 'General Contracting', href: '/general-contractors/', image: 'gc/target.jpg',
      desc: 'Commercial build-outs and tenant improvements end to end. Same crews, licensing and documentation that stand behind the plumbing.',
    },
  ],
  offer: {
    lines: ['Need a service not listed?', 'Call and ask.'],
    cta: 'Request a walkthrough',
  },
}
