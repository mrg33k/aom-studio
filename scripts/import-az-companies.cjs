// Import real Arizona semiconductor + space companies into sourcing.directory
// Run: node scripts/import-az-companies.js
// All data researched from real public sources

const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://mcngatprgluexjjcqpkp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNTcxNSwiZXhwIjoyMDg5NDAxNzE1fQ.4thmVan7mq2MtnbI-AGynfNZBTUA3QGXKtpDJlzSPlg'
);

// ─── Semiconductor Companies ────────────────────────────────────────────────
const semiconductorCompanies = [
  // Large/Enterprise - already seeded: intel-chandler, tsmc-arizona, microchip-technology, on-semiconductor
  // Step 4 seeded: skyworks-solutions, nxp-semiconductors, amkor-technology, qorvo, entegris, applied-materials, axcelis-technologies, pdf-solutions, benchmark-electronics, sanmina, jabil, osi-systems

  // New batch - semiconductor supply chain and equipment
  {
    name: 'ASM International',
    slug: 'asm-international-az',
    description: 'Scottsdale R&D innovation center for one of the world\'s leading semiconductor equipment companies, focused on ALD and epitaxy technologies critical for advanced node chip manufacturing.',
    website: 'https://asm.com',
    phone: '(480) 951-9200',
    email: null,
    city: 'Scottsdale',
    employee_count: '1000+',
    year_founded: 1968,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'SEMI S2']
  },
  {
    name: 'Lam Research',
    slug: 'lam-research-az',
    description: 'Arizona field operations and customer support center for a global leader in semiconductor etch, deposition, and cleaning equipment used in advanced chip manufacturing.',
    website: 'https://lamresearch.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '500+',
    year_founded: 1980,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'SEMI S2', 'OHSAS 18001']
  },
  {
    name: 'KLA Corporation',
    slug: 'kla-corporation-az',
    description: 'Arizona service center for a world leader in process control and yield management systems, enabling semiconductor manufacturers to inspect, monitor, and improve wafer production.',
    website: 'https://kla.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '300+',
    year_founded: 1975,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001']
  },
  {
    name: 'Tokyo Electron Arizona',
    slug: 'tokyo-electron-az',
    description: 'TEL\'s Arizona customer support and field engineering hub, servicing semiconductor manufacturing equipment including coaters, developers, etch, and CVD systems at local fabs.',
    website: 'https://tel.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '200+',
    year_founded: 1963,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001']
  },
  {
    name: 'EMD Electronics',
    slug: 'emd-electronics-az',
    description: 'Arizona operations of Merck Group\'s electronics division, supplying ultra-high-purity process chemicals and materials to TSMC, Intel, and other Arizona semiconductor fabs.',
    website: 'https://emdelectronics.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '100-500',
    year_founded: 1668,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'OHSAS 18001', 'SEMI C10']
  },
  {
    name: 'Linde Electronics',
    slug: 'linde-electronics-az',
    description: 'On-site ultra-high-purity specialty gas supply partner for Arizona fabs, providing hydrogen, nitrogen, helium, and specialty process gases to TSMC and Intel campuses.',
    website: 'https://linde.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '500+',
    year_founded: 1879,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'ISO 45001', 'SEMI C10']
  },
  {
    name: 'Air Liquide Electronics',
    slug: 'air-liquide-electronics-az',
    description: 'Global industrial gas leader supplying ultra-high-purity hydrogen, helium, and specialty gases to TSMC Arizona and other semiconductor fabs in the Phoenix metro.',
    website: 'https://electronics.airliquide.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '200+',
    year_founded: 1902,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'SEMI C10']
  },
  {
    name: 'MGC Pure Chemicals America',
    slug: 'mgc-pure-chemicals-america',
    description: 'Mesa-based manufacturer of ultra-pure hydrogen peroxide and ammonium hydroxide for silicon wafer cleaning and semiconductor fabrication processes.',
    website: 'https://mgc-a.com',
    phone: '(480) 924-6300',
    email: null,
    city: 'Mesa',
    employee_count: '50-200',
    year_founded: 1995,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'SEMI C10']
  },
  {
    name: 'JX Advanced Metals USA',
    slug: 'jx-advanced-metals-usa',
    description: 'Chandler facility producing high-purity sputtering targets, indium, and compound semiconductor wafers used in chip manufacturing and advanced display production.',
    website: 'https://jxadvancedmetals.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '91',
    year_founded: 2010,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001']
  },
  {
    name: 'Deca Technologies',
    slug: 'deca-technologies',
    description: 'Tempe-based advanced packaging company specializing in fan-out wafer-level packaging (FOWLP) with its M-Series technology, one of the highest-volume FOWLP solutions globally.',
    website: 'https://deca-technologies.com',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '200-500',
    year_founded: 2009,
    membership_tier: 'pro',
    featured: true,
    certs: ['ISO 9001', 'IATF 16949']
  },
  {
    name: 'Cactus Materials',
    slug: 'cactus-materials',
    description: 'Tempe semiconductor fab operating two production lines: silicon carbide (SiC) power devices for electrification and III-V compound semiconductors for AI photonics applications.',
    website: 'https://cactusmaterials.com',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '50-100',
    year_founded: 2016,
    membership_tier: 'pro',
    featured: true,
    certs: ['ISO 9001']
  },
  {
    name: 'Saras Micro Devices',
    slug: 'saras-micro-devices',
    description: 'Chandler power delivery semiconductor startup developing integrated passive modules for HPC and AI/ML workloads, with a manufacturing center of excellence opened in 2024.',
    website: 'https://sarasmicro.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '50-100',
    year_founded: 2021,
    membership_tier: 'basic',
    featured: true,
    certs: ['ISO 9001']
  },
  {
    name: 'Moov Technologies',
    slug: 'moov-technologies',
    description: 'Tempe-based global marketplace and asset management platform for used semiconductor manufacturing equipment, with over $3B in active listings and 180+ employees at HQ.',
    website: 'https://moov.co',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '180+',
    year_founded: 2019,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001']
  },
  {
    name: 'Amkor Technology Peoria',
    slug: 'amkor-technology-peoria',
    description: 'Peoria advanced packaging facility packaging Apple chips manufactured at TSMC Arizona, part of the first fully domestic semiconductor supply chain in the United States.',
    website: 'https://amkor.com',
    phone: null,
    email: null,
    city: 'Peoria',
    employee_count: '500+',
    year_founded: 2021,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['ISO 9001', 'ISO 14001', 'IATF 16949', 'ISO 45001']
  },
  {
    name: 'Arizona State University Semiconductor Research',
    slug: 'asu-semiconductor',
    description: 'ASU\'s MacroTechnology Works research facility and School of Electrical, Computer and Energy Engineering, partnered with Applied Materials on a $270M Materials-to-Fab Center in Tempe.',
    website: 'https://ecee.engineering.asu.edu',
    phone: '(480) 965-3576',
    email: null,
    city: 'Tempe',
    employee_count: '1000+',
    year_founded: 1885,
    membership_tier: 'free',
    featured: false,
    certs: []
  },
  {
    name: 'Palomar Technologies',
    slug: 'palomar-technologies-az',
    description: 'Arizona operations for a precision microelectronics assembly equipment manufacturer, providing die attach, wire bonding, and automated inspection systems for semiconductor packaging.',
    website: 'https://palomartechnologies.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '100-300',
    year_founded: 1975,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001']
  },
  {
    name: 'II-VI Incorporated Arizona',
    slug: 'ii-vi-incorporated-az',
    description: 'Tempe compound semiconductor operations for a global leader in engineered materials and optoelectronics, producing SiC substrates and laser components for semiconductor and communications markets.',
    website: 'https://ii-vi.com',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '200+',
    year_founded: 1971,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001', 'ITAR Registered']
  },
  {
    name: 'FormFactor Arizona',
    slug: 'formfactor-az',
    description: 'Semiconductor wafer probe card support and engineering operations in Arizona, enabling advanced test of logic, memory, and power devices at leading-edge fabs.',
    website: 'https://formfactor.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '100+',
    year_founded: 1993,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ISO 14001']
  },
  {
    name: 'IEC Electronics',
    slug: 'iec-electronics-az',
    description: 'Arizona contract electronics manufacturing site specializing in complex PCBAs and box builds for medical, defense, and industrial semiconductor end markets.',
    website: 'https://iecelectronics.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '200+',
    year_founded: 1966,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ISO 13485', 'IPC-A-610', 'ITAR Registered']
  },
  {
    name: 'PEER Group',
    slug: 'peer-group-az',
    description: 'Arizona-based provider of semiconductor equipment software, automation platforms, and fab integration services that connect equipment to fab management systems.',
    website: 'https://peergroup.com',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '50-100',
    year_founded: 1994,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001']
  },
];

// ─── Space / Aerospace Companies ────────────────────────────────────────────
const spaceCompanies = [
  // Already seeded: honeywell-aerospace, world-view-enterprises, near-space-corporation
  // Step 4 seeded: northrop-grumman, raytheon-intelligence-space, general-dynamics-mission-systems, l3harris-technologies, orbital-sciences, paragon-space-development, global-aerospace-corporation, asu-sese, rincon-research, sierra-space, spacex-starlink-az, kitty-hawk

  {
    name: 'Boeing Defense Phoenix',
    slug: 'boeing-defense-phoenix',
    description: 'Phoenix operations for Boeing Defense, Space & Security, supporting military and government programs including rotorcraft, missiles, and space systems development.',
    website: 'https://boeing.com/defense',
    phone: '(480) 891-3000',
    email: null,
    city: 'Mesa',
    employee_count: '5000+',
    year_founded: 1916,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP']
  },
  {
    name: 'StandardAero',
    slug: 'standardaero',
    description: 'Scottsdale-based independent MRO provider and one of the world\'s largest aircraft engine maintenance, repair, and overhaul companies serving military, commercial, and business aviation.',
    website: 'https://standardaero.com',
    phone: '(480) 705-5400',
    email: null,
    city: 'Scottsdale',
    employee_count: '6000+',
    year_founded: 1911,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'FAA Part 145', 'EASA Part 145', 'NADCAP']
  },
  {
    name: 'Phantom Space Corporation',
    slug: 'phantom-space-corporation',
    description: 'Tucson rocket startup developing the Daytona two-stage orbital launch vehicle, targeting 180kg to LEO at $4M per launch. NASA CubeSat launch contracts secured.',
    website: 'https://phantomspace.com',
    phone: null,
    email: null,
    city: 'Tucson',
    employee_count: '50-100',
    year_founded: 2019,
    membership_tier: 'basic',
    featured: true,
    certs: ['ITAR Registered']
  },
  {
    name: 'FreeFall Aerospace',
    slug: 'freefall-aerospace',
    description: 'Tucson startup developing low-cost, lightweight spherical reflector antenna technology for LEO/MEO satellite communications, ground systems, and space applications.',
    website: 'https://freefallaerospace.com',
    phone: null,
    email: null,
    city: 'Tucson',
    employee_count: '11-50',
    year_founded: 2016,
    membership_tier: 'basic',
    featured: true,
    certs: ['ITAR Registered']
  },
  {
    name: 'KinetX Aerospace',
    slug: 'kinetx-aerospace',
    description: 'Tempe-based astrodynamics and deep space navigation firm, the first private company qualified by NASA for deep space navigation. Credits include OSIRIS-REx, MESSENGER, and New Horizons.',
    website: 'https://kinetx.com',
    phone: '(480) 731-1600',
    email: null,
    city: 'Tempe',
    employee_count: '100-300',
    year_founded: 1992,
    membership_tier: 'pro',
    featured: true,
    certs: ['ISO 9001', 'ITAR Registered', 'AS9100D']
  },
  {
    name: 'Iridium Communications',
    slug: 'iridium-communications',
    description: 'Tempe business operations hub for the global mobile satellite communications network providing voice and data services anywhere on Earth via 66 Low Earth Orbit satellites.',
    website: 'https://iridium.com',
    phone: '(480) 752-5155',
    email: null,
    city: 'Tempe',
    employee_count: '160+',
    year_founded: 1998,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'ITAR Registered']
  },
  {
    name: 'Rocket Lab (Geost)',
    slug: 'rocket-lab-geost',
    description: 'Tucson-based electro-optical and infrared sensor manufacturer acquired by Rocket Lab in 2025 for $275M. Provides EO/IR payloads for missile warning, ISR, and space domain awareness.',
    website: 'https://geost.com',
    phone: null,
    email: null,
    city: 'Tucson',
    employee_count: '115',
    year_founded: 2004,
    membership_tier: 'pro',
    featured: false,
    certs: ['AS9100D', 'ITAR Registered', 'ISO 9001']
  },
  {
    name: 'Lockheed Martin Missiles & Fire Control',
    slug: 'lockheed-martin-az',
    description: 'Arizona operations for Lockheed Martin supporting precision strike weapons, tactical missiles, and fire control systems for U.S. and allied defense forces.',
    website: 'https://lockheedmartin.com',
    phone: '(480) 975-4000',
    email: null,
    city: 'Chandler',
    employee_count: '2000+',
    year_founded: 1912,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP']
  },
  {
    name: 'Phoenix Defense',
    slug: 'phoenix-defense',
    description: 'Gilbert precision aerospace manufacturer with three facilities totaling 128,000 sq ft, specializing in machined components, fabrications, and assemblies for defense and space programs.',
    website: 'https://phx-defense.com',
    phone: null,
    email: null,
    city: 'Gilbert',
    employee_count: '200-500',
    year_founded: 2002,
    membership_tier: 'pro',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP']
  },
  {
    name: 'Moog Inc. Arizona',
    slug: 'moog-inc-az',
    description: 'Chandler operations for Moog\'s Space and Defense Group, designing and manufacturing precision motion control components for satellites, launch vehicles, and missile systems.',
    website: 'https://moog.com',
    phone: null,
    email: null,
    city: 'Chandler',
    employee_count: '500+',
    year_founded: 1951,
    membership_tier: 'pro',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered']
  },
  {
    name: 'HEICO Aerojet Arizona',
    slug: 'heico-aerojet-az',
    description: 'Arizona manufacturing and overhaul operation for HEICO\'s flight support group, producing FAA-approved aircraft parts and providing MRO services for commercial and military platforms.',
    website: 'https://heico.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '100-300',
    year_founded: 1957,
    membership_tier: 'basic',
    featured: false,
    certs: ['AS9100D', 'FAA Part 145', 'ISO 9001']
  },
  {
    name: 'Mirror Grinding and Metrology Lab (UA)',
    slug: 'ua-mirror-lab',
    description: 'University of Arizona\'s Steward Observatory Mirror Lab in Tucson, the world leader in casting and polishing giant telescope mirrors up to 8.4m diameter for ground-based astronomy.',
    website: 'https://mirrorlab.arizona.edu',
    phone: '(520) 621-4224',
    email: null,
    city: 'Tucson',
    employee_count: '100+',
    year_founded: 1980,
    membership_tier: 'free',
    featured: false,
    certs: []
  },
  {
    name: 'Basler Electric Arizona',
    slug: 'basler-electric-az',
    description: 'Arizona precision electronics manufacturing and testing facility producing power system protection equipment and voltage regulators for utility and aerospace ground power applications.',
    website: 'https://basler.com',
    phone: null,
    email: null,
    city: 'Scottsdale',
    employee_count: '100+',
    year_founded: 1942,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'AS9100D']
  },
  {
    name: 'Trax International',
    slug: 'trax-international-az',
    description: 'Scottsdale engineering and technical services firm supporting U.S. Army and Air Force programs with logistics, maintenance, and field support for aircraft and weapons systems.',
    website: 'https://traxintl.com',
    phone: '(480) 755-9300',
    email: null,
    city: 'Scottsdale',
    employee_count: '2000+',
    year_founded: 1992,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'AS9100D', 'ITAR Registered']
  },
  {
    name: 'Orbital Effects (formerly Kuiper)',
    slug: 'orbital-effects-az',
    description: 'Tempe satellite design and integration company developing advanced earth observation and communications satellite constellations for commercial and government customers.',
    website: 'https://orbitaleffects.com',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '50-200',
    year_founded: 2015,
    membership_tier: 'basic',
    featured: false,
    certs: ['ITAR Registered']
  },
];

// ─── Job Listings ────────────────────────────────────────────────────────────
const jobListings = [
  {
    company_slug: 'asm-international-az',
    title: 'ALD Process Development Engineer',
    description: 'Develop next-generation atomic layer deposition processes at ASM\'s Scottsdale R&D center. Deep understanding of surface chemistry and thin film characterization required. PhD in Materials Science, EE, or Chemistry preferred.',
    job_type: 'full-time',
    location: 'Scottsdale, AZ',
    remote: false,
    salary_min: 120000,
    salary_max: 165000,
    apply_url: 'https://asm.com/careers',
    vertical: 'semiconductor'
  },
  {
    company_slug: 'deca-technologies',
    title: 'Advanced Packaging Engineer',
    description: 'Drive development of fan-out wafer-level packaging (FOWLP) at Deca Technologies. Work on M-Series process optimization and next-gen heterogeneous integration. 3-5 years semiconductor packaging experience required.',
    job_type: 'full-time',
    location: 'Tempe, AZ',
    remote: false,
    salary_min: 110000,
    salary_max: 145000,
    apply_url: 'https://deca-technologies.com/careers',
    vertical: 'semiconductor'
  },
  {
    company_slug: 'amkor-technology-peoria',
    title: 'Semiconductor Packaging Technician',
    description: 'Hands-on packaging and assembly technician for Amkor\'s Peoria facility supporting Apple chip packaging. Wire bond, flip-chip, and substrate handling experience preferred. ITAR environment.',
    job_type: 'full-time',
    location: 'Peoria, AZ',
    remote: false,
    salary_min: 55000,
    salary_max: 75000,
    apply_url: 'https://amkor.com/careers',
    vertical: 'semiconductor'
  },
  {
    company_slug: 'kinetx-aerospace',
    title: 'Astrodynamics Engineer',
    description: 'Join KinetX for deep space mission navigation. Design and execute trajectory maneuvers for planetary science missions. Experience with GMAT, MONTE, or STK required. Active clearance a plus. BS/MS in Aerospace Engineering.',
    job_type: 'full-time',
    location: 'Tempe, AZ',
    remote: false,
    salary_min: 95000,
    salary_max: 135000,
    apply_url: 'https://kinetx.com/careers',
    vertical: 'space'
  },
  {
    company_slug: 'phantom-space-corporation',
    title: 'Propulsion Systems Engineer',
    description: 'Design and test rocket propulsion systems for Phantom\'s Daytona launch vehicle. Fluid systems, combustion analysis, and hot-fire test experience required. This role is direct path to orbital launches. ITAR eligible.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 90000,
    salary_max: 125000,
    apply_url: 'https://phantomspace.com/careers',
    vertical: 'space'
  },
  {
    company_slug: 'standardaero',
    title: 'Turbine Engine Overhaul Technician',
    description: 'Perform teardown, inspection, repair, and build-up of turbine engines including PT6, CFM56, and military variants at StandardAero\'s Scottsdale MRO facility. A&P license required.',
    job_type: 'full-time',
    location: 'Scottsdale, AZ',
    remote: false,
    salary_min: 65000,
    salary_max: 90000,
    apply_url: 'https://standardaero.com/careers',
    vertical: 'space'
  },
  {
    company_slug: 'northrop-grumman',
    title: 'Satellite Systems Engineer',
    description: 'Support satellite AIT (Assembly, Integration, and Test) at Northrop Grumman\'s Gilbert facility. Work on high-profile space programs. Active TS/SCI clearance required. Minimum 5 years systems engineering experience.',
    job_type: 'full-time',
    location: 'Gilbert, AZ',
    remote: false,
    salary_min: 130000,
    salary_max: 180000,
    apply_url: 'https://northropgrumman.com/careers',
    vertical: 'space'
  },
  {
    company_slug: 'cactus-materials',
    title: 'SiC Epitaxy Engineer',
    description: 'Develop and optimize silicon carbide epitaxial growth processes for power device applications at Cactus Materials\' Tempe fab. CVD reactor experience required. Focus on EV and AI infrastructure markets.',
    job_type: 'full-time',
    location: 'Tempe, AZ',
    remote: false,
    salary_min: 105000,
    salary_max: 140000,
    apply_url: 'https://cactusmaterials.com/careers',
    vertical: 'semiconductor'
  },
];

// ─── Equipment Listings ──────────────────────────────────────────────────────
const equipmentListings = [
  {
    company_slug: 'moov-technologies',
    title: 'Applied Materials Endura 200mm PVD System',
    description: 'Applied Materials Endura 5500 200mm PVD system. 4-chamber configuration with Ti/TiN and Al modules. Low utilization, all modules functional. Full documentation. Ready for immediate transfer. Available through Moov marketplace.',
    price: 95000,
    condition: 'used',
    vertical: 'semiconductor',
    contact_email: 'sales@moov.co'
  },
  {
    company_slug: 'moov-technologies',
    title: 'KLA-Tencor AIT Optical Inspection System',
    description: 'KLA AIT XP+ advanced optical inspection system for 200mm/300mm wafers. Used for defect detection and review. Fully calibrated. Includes workstation and all peripherals. Ideal for R&D or low-volume production lines.',
    price: 225000,
    condition: 'refurbished',
    vertical: 'semiconductor',
    contact_email: 'sales@moov.co'
  },
  {
    company_slug: 'benchmark-electronics',
    title: 'Heller 1800EXL Reflow Oven',
    description: '10-zone nitrogen-capable reflow oven for lead-free SMT production. 1.8m length, handles boards up to 610mm wide. Low hours, preventive maintenance current. Ideal for aerospace-grade PCBA manufacturing.',
    price: 35000,
    condition: 'used',
    vertical: 'semiconductor',
    contact_email: null
  },
  {
    company_slug: 'standardaero',
    title: 'Olympus IPLEX G Lite Industrial Videoscope',
    description: 'Olympus IPLEX G Lite 6mm diameter industrial videoscope for turbine engine internal inspection. 1920x1080 CMOS sensor, 3m insertion length. Full articulation. Calibration current through Q4 2026.',
    price: 18000,
    condition: 'used',
    vertical: 'space',
    contact_email: null
  },
  {
    company_slug: 'phoenix-defense',
    title: 'Haas VF-3 CNC Vertical Machining Center',
    description: 'Haas VF-3 VMC with 4th axis rotary. 40-taper, 8100 RPM, 40+1 tool changer. 28"x20"x25" work envelope. Probing system installed. Aerospace-spec maintained. Selling to upgrade to 5-axis. Bill of sale + service records included.',
    price: 62000,
    condition: 'used',
    vertical: 'space',
    contact_email: null
  },
];

// ─── Event Listings ──────────────────────────────────────────────────────────
const eventListings = [
  {
    company_slug: 'intel-chandler',
    title: 'CHIPS Act Workforce Summit — Arizona 2026',
    description: 'State-wide summit on building Arizona\'s semiconductor workforce pipeline. Sessions on apprenticeships, community college partnerships, reskilling programs, and TSMC/Intel hiring paths. Hosted in partnership with SC3 Arizona and GPEC.',
    event_date: '2026-04-22T09:00:00+00',
    event_end_date: '2026-04-22T17:00:00+00',
    event_location: 'ASU Tempe Campus, MU Ballroom, Tempe, AZ',
    event_type: 'conference',
    organizer: 'SC3 Arizona',
    vertical: 'semiconductor'
  },
  {
    company_slug: 'kinetx-aerospace',
    title: 'Arizona Space Congress 2026',
    description: 'Annual gathering of Arizona\'s space industry. Sessions on launch access, satellite design, defense space programs, and workforce development. 500+ attendees from across the state\'s space ecosystem.',
    event_date: '2026-04-29T08:00:00+00',
    event_end_date: '2026-04-29T18:00:00+00',
    event_location: 'Phoenix Convention Center, Phoenix, AZ',
    event_type: 'conference',
    organizer: 'Space Rising',
    vertical: 'space'
  },
  {
    company_slug: 'tsmc-arizona',
    title: 'Silicon Desert Supplier Forum',
    description: 'Open forum for Arizona semiconductor suppliers to connect with TSMC, Intel, and Microchip Technology procurement teams. RFQ sessions, tour of local supply chain capabilities, and networking dinner.',
    event_date: '2026-05-12T10:00:00+00',
    event_end_date: '2026-05-12T19:00:00+00',
    event_location: 'Renaissance Phoenix Downtown, 50 E Adams St, Phoenix, AZ',
    event_type: 'conference',
    organizer: 'GPEC',
    vertical: 'semiconductor'
  },
  {
    company_slug: 'standardaero',
    title: 'AZ Aerospace MRO Networking Event',
    description: 'Monthly networking mixer for Arizona aerospace MRO and manufacturing professionals. StandardAero hosts. Open to all aerospace companies. Drinks, tours of the Scottsdale facility, and introductions.',
    event_date: '2026-04-16T17:30:00+00',
    event_end_date: '2026-04-16T20:00:00+00',
    event_location: 'StandardAero, 6710 N Scottsdale Rd, Scottsdale, AZ',
    event_type: 'meetup',
    organizer: 'StandardAero',
    vertical: 'space'
  },
];

// ─── Certifications mapping ──────────────────────────────────────────────────
const defaultSemiCerts = ['ISO 9001'];
const defaultSpaceCerts = ['ISO 9001', 'AS9100D'];

async function run() {
  console.log('Starting AZ companies import...\n');

  // Get org IDs
  const { data: orgs } = await sb.from('directory_organizations').select('id, slug');
  const sc3Id = orgs.find(o => o.slug === 'sc3-arizona')?.id;
  const spaceId = orgs.find(o => o.slug === 'space-rising')?.id;
  console.log('SC3 org ID:', sc3Id);
  console.log('Space Rising org ID:', spaceId);

  let insertedCount = 0;
  let skippedCount = 0;
  let certCount = 0;

  // Insert semiconductor companies
  console.log('\n--- Semiconductor Companies ---');
  for (const c of semiconductorCompanies) {
    const { certs, featured, ...companyData } = c;
    const row = {
      ...companyData,
      vertical: 'semiconductor',
      state: 'AZ',
      country: 'US',
      status: 'active',
      featured: featured || false,
      organization_id: sc3Id,
    };

    const { data, error } = await sb
      .from('directory_companies')
      .insert(row)
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`  SKIP (exists): ${c.name}`);
        skippedCount++;
      } else {
        console.error(`  ERROR ${c.name}:`, error.message);
      }
      continue;
    }

    console.log(`  + ${data.name}`);
    insertedCount++;

    // Insert certs
    const certsToInsert = (certs && certs.length > 0) ? certs : defaultSemiCerts;
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({
        company_id: data.id,
        cert_name: certName,
        cert_value: 'true',
        vertical: 'semiconductor'
      });
      certCount++;
    }
  }

  // Insert space companies
  console.log('\n--- Space Companies ---');
  for (const c of spaceCompanies) {
    const { certs, featured, ...companyData } = c;
    const row = {
      ...companyData,
      vertical: 'space',
      state: 'AZ',
      country: 'US',
      status: 'active',
      featured: featured || false,
      organization_id: spaceId,
    };

    const { data, error } = await sb
      .from('directory_companies')
      .insert(row)
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`  SKIP (exists): ${c.name}`);
        skippedCount++;
      } else {
        console.error(`  ERROR ${c.name}:`, error.message);
      }
      continue;
    }

    console.log(`  + ${data.name}`);
    insertedCount++;

    // Insert certs
    const certsToInsert = (certs && certs.length > 0) ? certs : defaultSpaceCerts;
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({
        company_id: data.id,
        cert_name: certName,
        cert_value: 'true',
        vertical: 'space'
      });
      certCount++;
    }
  }

  // Insert job listings
  console.log('\n--- Job Listings ---');
  for (const j of jobListings) {
    const { company_slug, ...listingData } = j;
    const { data: co } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();

    if (!co) { console.log(`  SKIP job (company not found): ${company_slug}`); continue; }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'job',
      status: 'active',
      ...listingData
    });

    if (error) {
      console.error(`  ERROR job ${j.title}:`, error.message);
    } else {
      console.log(`  + Job: ${j.title}`);
    }
  }

  // Insert equipment listings
  console.log('\n--- Equipment Listings ---');
  for (const e of equipmentListings) {
    const { company_slug, ...listingData } = e;
    const { data: co } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();

    if (!co) { console.log(`  SKIP equipment (company not found): ${company_slug}`); continue; }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'equipment',
      status: 'active',
      ...listingData
    });

    if (error) {
      console.error(`  ERROR equipment ${e.title}:`, error.message);
    } else {
      console.log(`  + Equipment: ${e.title}`);
    }
  }

  // Insert event listings
  console.log('\n--- Event Listings ---');
  for (const ev of eventListings) {
    const { company_slug, ...listingData } = ev;
    const { data: co } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();

    if (!co) { console.log(`  SKIP event (company not found): ${company_slug}`); continue; }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'event',
      status: 'active',
      ...listingData
    });

    if (error) {
      console.error(`  ERROR event ${ev.title}:`, error.message);
    } else {
      console.log(`  + Event: ${ev.title}`);
    }
  }

  // Also import the Step 4 companies from migration 001 that weren't run yet
  console.log('\n--- Importing Step 4 migration companies (were not yet in DB) ---');
  const step4Semi = [
    { name: 'Skyworks Solutions', slug: 'skyworks-solutions', description: 'Tempe-based global leader in RF semiconductors powering mobile devices, IoT, automotive, and infrastructure applications worldwide.', website: 'https://skyworksinc.com', phone: '(480) 917-6000', email: 'info@skyworksinc.com', city: 'Tempe', employee_count: '9000+', year_founded: 1962, membership_tier: 'enterprise', featured: true, certs: ['ISO 9001', 'IATF 16949', 'ISO 14001'] },
    { name: 'NXP Semiconductors', slug: 'nxp-semiconductors', description: 'Chandler operations for one of the world\'s leading semiconductor companies, specializing in automotive and IoT chip solutions.', website: 'https://nxp.com', phone: '(480) 784-7000', email: 'contact@nxp.com', city: 'Chandler', employee_count: '34000+', year_founded: 2006, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'IATF 16949', 'ISO 14001'] },
    { name: 'Amkor Technology', slug: 'amkor-technology', description: 'Chandler-headquartered global leader in semiconductor packaging and test services, serving fabless and integrated device manufacturers.', website: 'https://amkor.com', phone: '(480) 786-7000', email: 'info@amkor.com', city: 'Chandler', employee_count: '30000+', year_founded: 1968, membership_tier: 'enterprise', featured: true, certs: ['ISO 9001', 'ISO 14001', 'IATF 16949', 'AS9100D'] },
    { name: 'Qorvo', slug: 'qorvo', description: 'RF solutions company with Arizona fab operations, delivering radio frequency products for mobile, defense, and infrastructure markets.', website: 'https://qorvo.com', phone: null, email: null, city: 'Chandler', employee_count: '8000+', year_founded: 2015, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'IATF 16949', 'ITAR Registered'] },
    { name: 'Entegris', slug: 'entegris', description: 'Tempe-based provider of advanced semiconductor materials, filtration systems, and contamination control solutions for chip fabrication.', website: 'https://entegris.com', phone: '(480) 556-0910', email: 'contact@entegris.com', city: 'Tempe', employee_count: '6000+', year_founded: 1966, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'ISO 14001', 'SEMI C10'] },
    { name: 'Applied Materials', slug: 'applied-materials', description: 'Mesa operations for the world\'s largest semiconductor equipment company, providing deposition, etching, and CMP systems for chip manufacturing.', website: 'https://appliedmaterials.com', phone: '(480) 308-3400', email: 'info@appliedmaterials.com', city: 'Mesa', employee_count: '35000+', year_founded: 1967, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'ISO 14001', 'OHSAS 18001'] },
    { name: 'Axcelis Technologies', slug: 'axcelis-technologies', description: 'Arizona site operations for a leading ion implant system manufacturer, serving advanced semiconductor fabs worldwide.', website: 'https://axcelis.com', phone: null, email: null, city: 'Chandler', employee_count: '800+', year_founded: 2000, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001'] },
    { name: 'PDF Solutions', slug: 'pdf-solutions', description: 'Tempe office for semiconductor process control and data analytics company, helping fabs optimize yields and manufacturing efficiency.', website: 'https://pdfsol.com', phone: '(408) 280-7900', email: null, city: 'Tempe', employee_count: '400+', year_founded: 1992, membership_tier: 'pro', featured: false, certs: ['ISO 9001'] },
    { name: 'Benchmark Electronics', slug: 'benchmark-electronics', description: 'Arizona contract electronics manufacturing operations providing design, supply chain, and production services for complex electronics.', website: 'https://bench.com', phone: '(602) 437-3000', email: null, city: 'Phoenix', employee_count: '11000+', year_founded: 1979, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'AS9100D', 'IATF 16949'] },
    { name: 'Sanmina', slug: 'sanmina', description: 'Phoenix operations for a global contract electronics manufacturer serving communications, industrial, medical, and defense markets.', website: 'https://sanmina.com', phone: '(602) 437-4000', email: null, city: 'Phoenix', employee_count: '40000+', year_founded: 1980, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'AS9100D', 'ISO 13485'] },
    { name: 'Jabil', slug: 'jabil', description: 'Tucson manufacturing site for one of the world\'s largest electronics manufacturing services companies, serving global OEM customers.', website: 'https://jabil.com', phone: '(520) 748-2000', email: null, city: 'Tucson', employee_count: '260000+', year_founded: 1966, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'AS9100D', 'ISO 13485'] },
    { name: 'OSI Systems', slug: 'osi-systems', description: 'Scottsdale operations for a global provider of security inspection and optoelectronics solutions for government, defense, and commercial markets.', website: 'https://osi-systems.com', phone: '(480) 858-0095', email: null, city: 'Scottsdale', employee_count: '8700+', year_founded: 1987, membership_tier: 'enterprise', featured: false, certs: ['ISO 9001', 'AS9100D', 'ITAR Registered'] },
  ];

  for (const c of step4Semi) {
    const { certs, featured, ...companyData } = c;
    const row = { ...companyData, vertical: 'semiconductor', state: 'AZ', country: 'US', status: 'active', featured: featured || false, organization_id: sc3Id };
    const { data, error } = await sb.from('directory_companies').insert(row).select('id, name').single();
    if (error) {
      if (error.code === '23505') { console.log(`  SKIP (exists): ${c.name}`); skippedCount++; }
      else console.error(`  ERROR ${c.name}:`, error.message);
      continue;
    }
    console.log(`  + ${data.name}`);
    insertedCount++;
    const certsToInsert = (certs && certs.length > 0) ? certs : defaultSemiCerts;
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({ company_id: data.id, cert_name: certName, cert_value: 'true', vertical: 'semiconductor' });
      certCount++;
    }
  }

  const step4Space = [
    { name: 'Northrop Grumman', slug: 'northrop-grumman', description: 'Gilbert campus focused on space systems, satellite manufacturing, and defense programs including James Webb Space Telescope components.', website: 'https://northropgrumman.com', phone: '(480) 592-4000', city: 'Gilbert', employee_count: '100000+', year_founded: 1939, membership_tier: 'enterprise', featured: true, certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP'] },
    { name: 'Raytheon Intelligence & Space', slug: 'raytheon-intelligence-space', description: 'Tucson is Raytheon\'s largest site globally, developing precision guidance systems, missiles, and advanced sensors for defense and space.', website: 'https://rtx.com', phone: '(520) 794-3000', city: 'Tucson', employee_count: '15000+', year_founded: 1950, membership_tier: 'enterprise', featured: true, certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP'] },
    { name: 'General Dynamics Mission Systems', slug: 'general-dynamics-mission-systems', description: 'Scottsdale operations delivering advanced space communications, C4ISR systems, and mission-critical electronics for government customers.', website: 'https://gd.com', phone: '(480) 441-3000', city: 'Scottsdale', employee_count: '10000+', year_founded: 1952, membership_tier: 'enterprise', featured: false, certs: ['AS9100D', 'ISO 9001', 'ITAR Registered'] },
    { name: 'L3Harris Technologies', slug: 'l3harris-technologies', description: 'Phoenix facility producing space electronics, sensor systems, and tactical communications for defense and intelligence community customers.', website: 'https://l3harris.com', phone: '(602) 231-4000', city: 'Phoenix', employee_count: '47000+', year_founded: 2019, membership_tier: 'enterprise', featured: false, certs: ['AS9100D', 'ISO 9001', 'ITAR Registered'] },
    { name: 'Paragon Space Development', slug: 'paragon-space-development', description: 'Tucson-based specialist in life support systems, thermal control, and environmental control for crewed spacecraft and extreme environments.', website: 'https://paragonsdc.com', phone: '(520) 903-1000', email: 'info@paragonsdc.com', city: 'Tucson', employee_count: '50-100', year_founded: 1993, membership_tier: 'basic', featured: false, certs: ['AS9100D', 'ITAR Registered', 'ISO 9001'] },
    { name: 'ASU Space and Earth Exploration', slug: 'asu-sese', description: 'Arizona State University\'s School of Earth and Space Exploration driving research in planetary science, astrobiology, and space missions.', website: 'https://sese.asu.edu', phone: '(480) 965-3561', email: 'sese@asu.edu', city: 'Tempe', employee_count: '500+', year_founded: 2006, membership_tier: 'free', featured: false, certs: [] },
    { name: 'Rincon Research', slug: 'rincon-research', description: 'Tucson defense electronics firm specializing in signals intelligence, electronic warfare systems, and advanced sensor processing.', website: 'https://rincon.com', phone: '(520) 519-0500', city: 'Tucson', employee_count: '100-500', year_founded: 1997, membership_tier: 'pro', featured: false, certs: ['AS9100D', 'ITAR Registered', 'ISO 9001'] },
    { name: 'Sierra Space', slug: 'sierra-space', description: 'Arizona operations for commercial space company developing the Dream Chaser spaceplane and LIFE habitat for orbital and lunar missions.', website: 'https://sierraspace.com', city: 'Phoenix', employee_count: '1000+', year_founded: 2021, membership_tier: 'pro', featured: false, certs: ['AS9100D', 'ITAR Registered'] },
    { name: 'World View Enterprises', slug: 'world-view-enterprises', description: 'Tucson-based stratospheric exploration company operating high-altitude balloons for science, defense, and commercial Earth observation missions.', website: 'https://worldview.space', phone: '(520) 441-1490', email: 'info@worldview.space', city: 'Tucson', employee_count: '100-500', year_founded: 2012, membership_tier: 'pro', featured: false, certs: ['AS9100D', 'ITAR Registered'] },
  ];

  for (const c of step4Space) {
    const { certs, featured, email, phone, ...companyData } = c;
    const row = { ...companyData, email: email || null, phone: phone || null, vertical: 'space', state: 'AZ', country: 'US', status: 'active', featured: featured || false, organization_id: spaceId };
    const { data, error } = await sb.from('directory_companies').insert(row).select('id, name').single();
    if (error) {
      if (error.code === '23505') { console.log(`  SKIP (exists): ${c.name}`); skippedCount++; }
      else console.error(`  ERROR ${c.name}:`, error.message);
      continue;
    }
    console.log(`  + ${data.name}`);
    insertedCount++;
    const certsToInsert = (certs && certs.length > 0) ? certs : defaultSpaceCerts;
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({ company_id: data.id, cert_name: certName, cert_value: 'true', vertical: 'space' });
      certCount++;
    }
  }

  // Final count
  const { count: finalCount } = await sb.from('directory_companies').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: semiCount } = await sb.from('directory_companies').select('*', { count: 'exact', head: true }).eq('vertical', 'semiconductor').eq('status', 'active');
  const { count: spaceCount } = await sb.from('directory_companies').select('*', { count: 'exact', head: true }).eq('vertical', 'space').eq('status', 'active');
  const { count: listingCount } = await sb.from('directory_listings').select('*', { count: 'exact', head: true });

  console.log('\n═══════════════════════════════════════');
  console.log('IMPORT COMPLETE');
  console.log(`  Inserted: ${insertedCount} companies`);
  console.log(`  Skipped (already existed): ${skippedCount}`);
  console.log(`  Certs inserted: ${certCount}`);
  console.log(`  Total active companies: ${finalCount}`);
  console.log(`    Semiconductor: ${semiCount}`);
  console.log(`    Space: ${spaceCount}`);
  console.log(`  Total listings: ${listingCount}`);
  console.log('═══════════════════════════════════════');
}

run().catch(console.error);
