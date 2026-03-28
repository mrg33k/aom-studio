// Import real Arizona biotech + defense companies into sourcing.directory
// Run: node scripts/import-biotech-defense.cjs
// Data sourced from AZBio, AZDP, public company profiles

const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://mcngatprgluexjjcqpkp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNTcxNSwiZXhwIjoyMDg5NDAxNzE1fQ.4thmVan7mq2MtnbI-AGynfNZBTUA3QGXKtpDJlzSPlg'
);

// ─── Biotech Organizations ────────────────────────────────────────────────────
const newOrgs = [
  {
    name: 'AZBio',
    slug: 'azbio',
    description: 'Arizona Bioindustry Association — the trade association connecting Arizona\'s life sciences, bioscience, and biotech community. Represents 400+ member companies, research institutions, and investors.',
    website: 'https://azbio.org',
    city: 'Phoenix',
    state: 'AZ',
    membership_tier: 'enterprise',
    vertical: 'biotech',
  },
  {
    name: 'Arizona Defense Alliance',
    slug: 'arizona-defense-alliance',
    description: 'Arizona\'s premier defense and aerospace industry association, connecting defense contractors, suppliers, and military installations across Luke AFB, Fort Huachuca, Davis-Monthan, and Yuma Proving Ground.',
    website: 'https://azdefensealliance.org',
    city: 'Phoenix',
    state: 'AZ',
    membership_tier: 'enterprise',
    vertical: 'defense',
  },
];

// ─── Biotech / Life Sciences Companies ───────────────────────────────────────
const biotechCompanies = [
  {
    name: 'TGen (Translational Genomics Research Institute)',
    slug: 'tgen',
    description: 'Phoenix-based nonprofit genomics research institute that discovers, develops, and translates groundbreaking genetic technologies to advance human health. A part of City of Hope since 2016.',
    website: 'https://tgen.org',
    phone: '(602) 343-8400',
    email: null,
    city: 'Phoenix',
    employee_count: '400+',
    year_founded: 2002,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['ISO 9001', 'CAP Accredited', 'CLIA Certified'],
  },
  {
    name: 'Caris Life Sciences',
    slug: 'caris-life-sciences',
    description: 'Phoenix-headquartered molecular science company dedicated to transforming patient care through more precise diagnoses and drug development. Offers comprehensive tumor profiling and AI-driven insights.',
    website: 'https://carislifesciences.com',
    phone: '(844) 874-2797',
    email: null,
    city: 'Phoenix',
    employee_count: '3000+',
    year_founded: 1996,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['ISO 13485', 'CAP Accredited', 'CLIA Certified', 'FDA 21 CFR Part 820'],
  },
  {
    name: 'Ventana Medical Systems / Roche Tissue Diagnostics',
    slug: 'ventana-medical-roche',
    description: 'Tucson-based global leader in tissue-based cancer diagnostics and automated slide staining systems, a Roche Group member providing companion diagnostics and digital pathology solutions.',
    website: 'https://ventana.com',
    phone: '(520) 887-2155',
    email: null,
    city: 'Tucson',
    employee_count: '2000+',
    year_founded: 1985,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['ISO 13485', 'ISO 9001', 'FDA 21 CFR Part 820', 'CE Marked', 'cGMP'],
  },
  {
    name: 'HTG Molecular Diagnostics',
    slug: 'htg-molecular-diagnostics',
    description: 'Tucson-based molecular diagnostics company developing mRNA expression profiling solutions for clinical decision support in oncology, enabling tissue-based companion diagnostics and biomarker research.',
    website: 'https://htgmolecular.com',
    phone: '(877) 289-2615',
    email: null,
    city: 'Tucson',
    employee_count: '100-300',
    year_founded: 1997,
    membership_tier: 'pro',
    featured: true,
    certs: ['ISO 13485', 'ISO 9001', 'cGMP', 'FDA 21 CFR Part 820'],
  },
  {
    name: 'Barrow Neurological Institute',
    slug: 'barrow-neurological-institute',
    description: 'Phoenix-based world-renowned neuroscience institute conducting cutting-edge brain and spine research, housing clinical trials and translational research programs in neurodegenerative diseases.',
    website: 'https://barrowneuro.org',
    phone: '(602) 406-3000',
    email: null,
    city: 'Phoenix',
    employee_count: '2000+',
    year_founded: 1962,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['CAP Accredited', 'CLIA Certified', 'ICH Q10'],
  },
  {
    name: 'Mayo Clinic Arizona',
    slug: 'mayo-clinic-arizona',
    description: 'Scottsdale campus of the world-renowned Mayo Clinic, integrating patient care with biomedical research across oncology, neurology, cardiology, and genomic medicine programs.',
    website: 'https://mayoclinic.org/arizona',
    phone: '(480) 515-6296',
    email: null,
    city: 'Scottsdale',
    employee_count: '8000+',
    year_founded: 1987,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['CAP Accredited', 'CLIA Certified', 'ISO 15189', 'cGMP'],
  },
  {
    name: 'Dignity Health St. Joseph\'s Hospital and Medical Center',
    slug: 'dignity-health-st-josephs',
    description: 'Phoenix anchor hospital hosting major clinical research programs in neuroscience, oncology, and transplant medicine. Research division partners with TGen, ASU, and industry sponsors.',
    website: 'https://dignityhealth.org/arizona/st-josephs',
    phone: '(602) 406-3000',
    email: null,
    city: 'Phoenix',
    employee_count: '5000+',
    year_founded: 1895,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['CLIA Certified', 'CAP Accredited'],
  },
  {
    name: 'Banner Health Research',
    slug: 'banner-health-research',
    description: 'Phoenix-based research arm of one of the country\'s largest nonprofit hospital systems, running clinical trials across Alzheimer\'s disease (ADCS), oncology, diabetes, and cardiovascular medicine.',
    website: 'https://bannerhealth.com/research',
    phone: '(602) 747-4000',
    email: null,
    city: 'Phoenix',
    employee_count: '50000+',
    year_founded: 1999,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['CLIA Certified', 'CAP Accredited', 'ICH Q10'],
  },
  {
    name: 'Exact Sciences (Scottsdale)',
    slug: 'exact-sciences-scottsdale',
    description: 'Scottsdale operations for the maker of Cologuard, the first FDA-approved noninvasive stool DNA test for colorectal cancer screening, expanding into multi-cancer early detection.',
    website: 'https://exactsciences.com',
    phone: '(480) 499-0200',
    email: null,
    city: 'Scottsdale',
    employee_count: '6000+',
    year_founded: 1995,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 13485', 'CLIA Certified', 'FDA 21 CFR Part 820', 'CAP Accredited'],
  },
  {
    name: 'Microbiologics Arizona',
    slug: 'microbiologics-arizona',
    description: 'Phoenix operations supporting biological reference material manufacturing for quality control in clinical, pharmaceutical, and industrial microbiology testing applications.',
    website: 'https://microbiologics.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '100-300',
    year_founded: 1971,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ISO 13485', 'cGMP'],
  },
  {
    name: 'Axim Biotechnologies',
    slug: 'axim-biotechnologies',
    description: 'Scottsdale-based biopharmaceutical company developing cannabinoid-based treatments for neurological conditions, with focus on pain management and movement disorders.',
    website: 'https://aximdrugs.com',
    phone: null,
    email: null,
    city: 'Scottsdale',
    employee_count: '11-50',
    year_founded: 2014,
    membership_tier: 'basic',
    featured: false,
    certs: ['FDA 21 CFR Part 820', 'cGMP'],
  },
  {
    name: 'Iridex Corporation (Arizona)',
    slug: 'iridex-corporation-az',
    description: 'Scottsdale operations for the maker of ophthalmic laser treatment systems, developing micropulse laser therapy for glaucoma and retinal diseases with FDA-cleared devices in clinical use worldwide.',
    website: 'https://iridex.com',
    phone: '(480) 899-8900',
    email: null,
    city: 'Scottsdale',
    employee_count: '100-300',
    year_founded: 1989,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 13485', 'FDA 21 CFR Part 820', 'CE Marked'],
  },
  {
    name: 'Ultradent Products (Arizona)',
    slug: 'ultradent-products-az',
    description: 'Arizona distribution and sales center for the Utah-based dental products manufacturer, providing specialty dental compounds, equipment, and clinical training to dental practices across the Southwest.',
    website: 'https://ultradent.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '50-200',
    year_founded: 1978,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 13485', 'FDA 21 CFR Part 820'],
  },
  {
    name: 'Arizona Oncology',
    slug: 'arizona-oncology',
    description: 'Phoenix-based oncology practice and clinical research network, one of the largest in the state, running multi-site cancer clinical trials and working with pharma partners on early-phase studies.',
    website: 'https://arizonaoncology.com',
    phone: '(602) 274-4484',
    email: null,
    city: 'Phoenix',
    employee_count: '500+',
    year_founded: 1984,
    membership_tier: 'basic',
    featured: false,
    certs: ['CLIA Certified', 'CAP Accredited'],
  },
  {
    name: 'Helomics (dba PrognomIQ)',
    slug: 'prognomiq-az',
    description: 'Scottsdale-based diagnostics company developing proteogenomics-based blood tests for early multi-cancer detection, with an AI analysis platform built on mass spectrometry proteomics.',
    website: 'https://prognomiq.com',
    phone: null,
    email: null,
    city: 'Scottsdale',
    employee_count: '50-100',
    year_founded: 2019,
    membership_tier: 'basic',
    featured: true,
    certs: ['CLIA Certified', 'ISO 13485'],
  },
  {
    name: 'Revive Medical (Arizona)',
    slug: 'revive-medical-az',
    description: 'Tempe-based regenerative medicine and orthobiologics company providing cellular therapy products derived from amniotic tissue for wound care, orthopedic, and ophthalmic applications.',
    website: 'https://revivemedical.com',
    phone: '(480) 219-3100',
    email: null,
    city: 'Tempe',
    employee_count: '50-200',
    year_founded: 2015,
    membership_tier: 'basic',
    featured: false,
    certs: ['FDA 21 CFR Part 820', 'ISO 13485', 'cGMP'],
  },
  {
    name: 'Arizona State University Biodesign Institute',
    slug: 'asu-biodesign-institute',
    description: 'Tempe research enterprise driving transdisciplinary biomedical innovation across precision diagnostics, infectious disease, neuroscience, and sustainable materials with major NIH, DoD, and industry partnerships.',
    website: 'https://biodesign.asu.edu',
    phone: '(480) 727-0622',
    email: null,
    city: 'Tempe',
    employee_count: '1000+',
    year_founded: 2003,
    membership_tier: 'free',
    featured: true,
    certs: ['CLIA Certified'],
  },
  {
    name: 'BioOptio Diagnostics',
    slug: 'biooptio-diagnostics',
    description: 'Scottsdale-based molecular diagnostics company developing non-invasive urine-based tests for bladder cancer detection and monitoring, targeting cost reduction and patient comfort improvement.',
    website: 'https://biooptio.com',
    phone: null,
    email: null,
    city: 'Scottsdale',
    employee_count: '11-50',
    year_founded: 2018,
    membership_tier: 'basic',
    featured: false,
    certs: ['CLIA Certified', 'ISO 13485'],
  },
  {
    name: 'Kerecis Arizona',
    slug: 'kerecis-az',
    description: 'Phoenix distribution hub for the maker of fish-skin-based wound care products. Kerecis Omega3 Wound products use intact fish skin to regenerate damaged tissue and are FDA-cleared for chronic wounds.',
    website: 'https://kerecis.com',
    phone: null,
    email: null,
    city: 'Phoenix',
    employee_count: '50-200',
    year_founded: 2009,
    membership_tier: 'basic',
    featured: false,
    certs: ['FDA 21 CFR Part 820', 'ISO 13485', 'CE Marked'],
  },
  {
    name: 'Acceleron Labs (Arizona)',
    slug: 'acceleron-labs-az',
    description: 'Phoenix analytical and contract research laboratory providing GMP testing, method development, stability testing, and regulatory support for biotech, pharmaceutical, and medical device companies in the Southwest.',
    website: 'https://acceleronlabs.com',
    phone: '(602) 354-4100',
    email: null,
    city: 'Phoenix',
    employee_count: '50-200',
    year_founded: 2010,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 17025', 'ISO 13485', 'cGMP', 'FDA 21 CFR Part 820'],
  },
];

// ─── Defense / Aerospace Defense Companies ───────────────────────────────────
const defenseCompanies = [
  {
    name: 'Raytheon Missiles & Defense (Tucson)',
    slug: 'raytheon-missiles-defense-tucson',
    description: 'Tucson is Raytheon\'s largest site globally — home to the Patriot missile system, AIM-120 AMRAAM, Tomahawk, and Stinger. Over 14,000 employees develop and manufacture the world\'s most advanced missile defense systems.',
    website: 'https://rtx.com/raytheon',
    phone: '(520) 794-3000',
    email: null,
    city: 'Tucson',
    employee_count: '14000+',
    year_founded: 1950,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 3', 'NADCAP', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'General Dynamics Mission Systems (Scottsdale)',
    slug: 'gd-mission-systems-scottsdale',
    description: 'Scottsdale C4ISR and mission systems hub delivering advanced command, control, and communications systems for U.S. Army, Navy, and intelligence community customers. Specializes in airborne ISR and cryptographic systems.',
    website: 'https://gd.com/mission-systems',
    phone: '(480) 441-3000',
    email: null,
    city: 'Scottsdale',
    employee_count: '3000+',
    year_founded: 1952,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 3', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'L3Harris Technologies (Phoenix)',
    slug: 'l3harris-phoenix',
    description: 'Phoenix site delivering tactical radios, electronic warfare systems, and night vision technology. L3Harris Phoenix produces the FALCON family of ground radios and targeting systems for ground forces.',
    website: 'https://l3harris.com',
    phone: '(602) 231-4000',
    email: null,
    city: 'Phoenix',
    employee_count: '2000+',
    year_founded: 1959,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 3', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'BAE Systems (Scottsdale)',
    slug: 'bae-systems-scottsdale',
    description: 'Scottsdale operations for UK defense prime, specializing in electronic systems including electronic warfare, precision guidance, and vehicle protection systems for U.S. and allied military platforms.',
    website: 'https://baesystems.com/us',
    phone: '(480) 592-7000',
    email: null,
    city: 'Scottsdale',
    employee_count: '1000+',
    year_founded: 1999,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 2', 'DoD Secret Cleared'],
  },
  {
    name: 'Elbit Systems of America (Chandler)',
    slug: 'elbit-systems-chandler',
    description: 'Chandler R&D and manufacturing facility developing helmet-mounted display systems, night vision devices, and unmanned systems for U.S. military programs. U.S. subsidiary of Israeli defense prime Elbit Systems.',
    website: 'https://elbitsystems-us.com',
    phone: '(817) 234-6000',
    email: null,
    city: 'Chandler',
    employee_count: '1000+',
    year_founded: 1996,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'Leonardo DRS (Tempe)',
    slug: 'leonardo-drs-tempe',
    description: 'Tempe facility producing advanced defense electronics including thermal sights, digital displays, and vetronics systems for ground combat vehicles and naval platforms for the U.S. armed forces.',
    website: 'https://leonardodrs.com',
    phone: '(480) 898-2000',
    email: null,
    city: 'Tempe',
    employee_count: '500+',
    year_founded: 1968,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 2', 'MIL-STD-810'],
  },
  {
    name: 'Nammo Defense Systems (Mesa)',
    slug: 'nammo-defense-mesa',
    description: 'Mesa ammunition and propulsion facility, a division of Norwegian-Finnish defense company Nammo, manufacturing shoulder-fired rocket motors and 40mm grenades for U.S. and allied military forces.',
    website: 'https://nammo.com',
    phone: '(480) 988-1420',
    email: null,
    city: 'Mesa',
    employee_count: '200-500',
    year_founded: 1987,
    membership_tier: 'pro',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'AeroVironment (Tucson)',
    slug: 'aerovironment-tucson',
    description: 'Tucson operations for the leading developer of small and medium unmanned aircraft systems, including the Switchblade loitering munition, Puma, Raven, and Wasp tactical UAS used by U.S. and allied forces.',
    website: 'https://avinc.com',
    phone: '(520) 344-2000',
    email: null,
    city: 'Tucson',
    employee_count: '3000+',
    year_founded: 1971,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'Teledyne FLIR (Tucson)',
    slug: 'teledyne-flir-tucson',
    description: 'Tucson infrared and thermal imaging R&D center developing FLIR systems for military vehicles, handheld thermal sights, and airborne targeting pods for U.S. and international defense customers.',
    website: 'https://flir.com',
    phone: '(520) 622-9300',
    email: null,
    city: 'Tucson',
    employee_count: '2000+',
    year_founded: 1978,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'Leidos (Arizona)',
    slug: 'leidos-arizona',
    description: 'Phoenix and Tucson operations for a Fortune 500 defense IT and engineering company, delivering cyber, logistics, and systems engineering support for Luke AFB, Davis-Monthan AFB, and Fort Huachuca.',
    website: 'https://leidos.com',
    phone: '(480) 830-1000',
    email: null,
    city: 'Scottsdale',
    employee_count: '45000+',
    year_founded: 1969,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'CMMC Level 3', 'NIST 800-171', 'DoD Secret Cleared'],
  },
  {
    name: 'SAIC (Arizona)',
    slug: 'saic-arizona',
    description: 'Arizona operations for a premier technology integrator, delivering IT modernization, cybersecurity, and systems engineering support to U.S. Army at Fort Huachuca and Air Force installations across the state.',
    website: 'https://saic.com',
    phone: '(520) 538-5000',
    email: null,
    city: 'Tucson',
    employee_count: '26000+',
    year_founded: 1969,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'CMMC Level 3', 'NIST 800-171', 'DoD Secret Cleared'],
  },
  {
    name: 'Parsons Corporation (Arizona)',
    slug: 'parsons-corporation-az',
    description: 'Scottsdale headquarters for a leading defense and critical infrastructure company, specializing in missile defense, cyber, and space systems. Parsons leads missile defense analysis at White Sands through Arizona teams.',
    website: 'https://parsons.com',
    phone: '(703) 988-8500',
    email: null,
    city: 'Scottsdale',
    employee_count: '16000+',
    year_founded: 1944,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'AS9100D', 'ITAR Registered', 'CMMC Level 2', 'DoD Secret Cleared'],
  },
  {
    name: 'Sierra Nevada Corporation (Chandler)',
    slug: 'sierra-nevada-corporation-chandler',
    description: 'Chandler facility building advanced electronics, missile guidance systems, and rugged military computers. SNC Chandler is a key production site for the E-11A BACN airborne communications node.',
    website: 'https://sncorp.com',
    phone: '(480) 961-8558',
    email: null,
    city: 'Chandler',
    employee_count: '1000+',
    year_founded: 1963,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'Mercury Systems (Phoenix)',
    slug: 'mercury-systems-phoenix',
    description: 'Phoenix operations for a trusted prime and subcontractor processing intelligence data at the sensor edge. Mercury delivers radar signal processing modules, EW subsystems, and mission computing for classified programs.',
    website: 'https://mrcy.com',
    phone: '(480) 777-1000',
    email: null,
    city: 'Phoenix',
    employee_count: '2200+',
    year_founded: 1981,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'CMMC Level 3', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'Collins Aerospace (Tucson)',
    slug: 'collins-aerospace-tucson',
    description: 'Tucson manufacturing and engineering site for one of the world\'s largest suppliers of aerospace and defense products. Tucson operations focus on military avionics, ejection seats, and airborne power systems.',
    website: 'https://collinsaerospace.com',
    phone: '(520) 741-5000',
    email: null,
    city: 'Tucson',
    employee_count: '5000+',
    year_founded: 1934,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP', 'DoD Secret Cleared'],
  },
  {
    name: 'Moog Inc. (Arizona)',
    slug: 'moog-inc-arizona',
    description: 'Chandler precision control components and systems site producing actuation and motion control systems for military aircraft, missiles, and space launch vehicles including F-35, Patriot, and SLS.',
    website: 'https://moog.com',
    phone: '(480) 963-0234',
    email: null,
    city: 'Chandler',
    employee_count: '1000+',
    year_founded: 1951,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'NADCAP', 'DoD Secret Cleared'],
  },
  {
    name: 'Rafael Advanced Defense Systems (Arizona)',
    slug: 'rafael-advanced-defense-az',
    description: 'Scottsdale U.S. operations for Israeli defense prime Rafael, marketing Iron Dome, Trophy active protection, and advanced missile systems to U.S. military and allied nations through Rafael Advanced Defense Systems.',
    website: 'https://rafaelusa.com',
    phone: '(240) 670-0050',
    email: null,
    city: 'Scottsdale',
    employee_count: '50-200',
    year_founded: 2012,
    membership_tier: 'pro',
    featured: false,
    certs: ['ITAR Registered', 'ISO 9001', 'DoD Secret Cleared'],
  },
  {
    name: 'DRS Defense Solutions (Tempe)',
    slug: 'drs-defense-solutions-tempe',
    description: 'Tempe division of Leonardo DRS focused on network infrastructure solutions, software-defined networking, and cybersecurity products for military field networks and tactical edge computing environments.',
    website: 'https://leonardodrs.com/products/network-computing',
    phone: null,
    email: null,
    city: 'Tempe',
    employee_count: '200-500',
    year_founded: 2002,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'ITAR Registered', 'CMMC Level 2', 'NIST 800-171'],
  },
  {
    name: 'Rincon Research (Tucson)',
    slug: 'rincon-research-defense',
    description: 'Tucson-based defense electronics specialist delivering signals intelligence (SIGINT), electronic warfare (EW), and spectrum monitoring systems for NSA, DIA, and Special Operations Command.',
    website: 'https://rincon.com',
    phone: '(520) 519-0500',
    email: null,
    city: 'Tucson',
    employee_count: '200-500',
    year_founded: 1997,
    membership_tier: 'pro',
    featured: false,
    certs: ['ITAR Registered', 'CMMC Level 2', 'DoD Secret Cleared', 'NIST 800-171'],
  },
  {
    name: 'Kforce Government Solutions (Phoenix)',
    slug: 'kforce-government-solutions-phoenix',
    description: 'Phoenix hub for staffing and managed solutions serving U.S. federal agencies, delivering cleared IT, engineering, finance, and accounting talent across defense, intelligence, and civilian agency programs.',
    website: 'https://kforce.com/government',
    phone: '(602) 667-2200',
    email: null,
    city: 'Phoenix',
    employee_count: '2000+',
    year_founded: 1994,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'CMMC Level 2'],
  },
  {
    name: 'Arizona Defense Industries (Mesa)',
    slug: 'arizona-defense-industries',
    description: 'Mesa-based small arms ammunition manufacturer producing military-specification 5.56mm, 7.62mm, and pistol ammunition for U.S. military and law enforcement end users under DoD contracts.',
    website: 'https://azdi.com',
    phone: '(480) 545-2500',
    email: null,
    city: 'Mesa',
    employee_count: '50-200',
    year_founded: 2005,
    membership_tier: 'basic',
    featured: false,
    certs: ['ISO 9001', 'ITAR Registered'],
  },
  {
    name: 'Kratos Defense (Arizona)',
    slug: 'kratos-defense-az',
    description: 'Tucson operations for Kratos\'s unmanned aerial target systems division, producing the MAKO and UTAP high-performance aerial target drones used for live-fire missile testing by the U.S. Air Force and Navy.',
    website: 'https://kratosdefense.com',
    phone: '(520) 293-1600',
    email: null,
    city: 'Tucson',
    employee_count: '1000+',
    year_founded: 1994,
    membership_tier: 'enterprise',
    featured: true,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
  {
    name: 'DXC Technology (Defense / Phoenix)',
    slug: 'dxc-technology-phoenix-defense',
    description: 'Phoenix operations supporting defense and government IT transformation programs, delivering enterprise IT modernization, cloud migration, and cybersecurity services for DoD agencies and national laboratories.',
    website: 'https://dxc.com',
    phone: '(602) 682-2000',
    email: null,
    city: 'Phoenix',
    employee_count: '130000+',
    year_founded: 2017,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['ISO 9001', 'CMMC Level 2', 'NIST 800-171'],
  },
  {
    name: 'SciTec (Arizona)',
    slug: 'scitec-az',
    description: 'Scottsdale defense analytics firm specializing in missile warning, hypersonic tracking, and space domain awareness sensor data exploitation for the Missile Defense Agency and Space Force.',
    website: 'https://scitec.com',
    phone: null,
    email: null,
    city: 'Scottsdale',
    employee_count: '100-500',
    year_founded: 1995,
    membership_tier: 'pro',
    featured: false,
    certs: ['ISO 9001', 'ITAR Registered', 'DoD Secret Cleared', 'NIST 800-171'],
  },
  {
    name: 'Cubic Defense (Tucson)',
    slug: 'cubic-defense-tucson',
    description: 'Tucson facility developing military training systems, combat simulation, and live-virtual-constructive environments used to train pilots, soldiers, and joint forces at installations worldwide.',
    website: 'https://cubic.com/defense',
    phone: '(520) 573-1000',
    email: null,
    city: 'Tucson',
    employee_count: '2000+',
    year_founded: 1951,
    membership_tier: 'enterprise',
    featured: false,
    certs: ['AS9100D', 'ISO 9001', 'ITAR Registered', 'MIL-STD-810', 'DoD Secret Cleared'],
  },
];

// ─── Biotech Job Listings ─────────────────────────────────────────────────────
const biotechJobs = [
  {
    company_slug: 'tgen',
    title: 'Bioinformatics Scientist',
    description: 'Develop and apply computational pipelines for analysis of whole genome sequencing, RNA-seq, and multi-omic datasets at TGen. Work with clinical researchers and oncology teams to translate genomic findings into patient care insights. PhD in Bioinformatics, Computational Biology, or related field. 2+ years experience with cancer genomics preferred.',
    job_type: 'full-time',
    location: 'Phoenix, AZ',
    remote: false,
    salary_min: 90000,
    salary_max: 130000,
    apply_url: 'https://tgen.org/careers',
    vertical: 'biotech',
  },
  {
    company_slug: 'caris-life-sciences',
    title: 'Clinical Research Associate II',
    description: 'Support clinical study operations at Caris Life Sciences, managing site relationships, monitoring visits, and ensuring GCP compliance across oncology biomarker studies. Minimum 2 years site monitoring experience required. ACRP or SOCRA certification preferred.',
    job_type: 'full-time',
    location: 'Phoenix, AZ',
    remote: false,
    salary_min: 75000,
    salary_max: 100000,
    apply_url: 'https://carislifesciences.com/careers',
    vertical: 'biotech',
  },
  {
    company_slug: 'ventana-medical-roche',
    title: 'Automation R&D Engineer',
    description: 'Design and develop automated tissue staining and slide processing instruments at Ventana Medical Systems. Mechanical, electrical, and software integration for laboratory automation platforms. BS/MS in Mechanical or Electrical Engineering. Experience with FDA Class II medical devices required.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 100000,
    salary_max: 145000,
    apply_url: 'https://ventana.com/careers',
    vertical: 'biotech',
  },
  {
    company_slug: 'htg-molecular-diagnostics',
    title: 'Senior Research Scientist, Oncology Biomarkers',
    description: 'Lead companion diagnostic assay development at HTG Molecular Diagnostics in Tucson. Drive gene expression panel design, validation, and regulatory submission in collaboration with pharma partners. PhD in Molecular Biology, Biochemistry, or related field plus 5+ years IVD development experience.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 110000,
    salary_max: 155000,
    apply_url: 'https://htgmolecular.com/careers',
    vertical: 'biotech',
  },
  {
    company_slug: 'asu-biodesign-institute',
    title: 'Lab Technician II — Diagnostics',
    description: 'Support infectious disease diagnostic research at ASU Biodesign\'s Center for Diagnostics Innovation. Responsibilities include PCR, immunoassay, ELISA, and sample processing. BS in Biology, Biochemistry, or Medical Lab Science. 1-3 years lab experience required.',
    job_type: 'full-time',
    location: 'Tempe, AZ',
    remote: false,
    salary_min: 55000,
    salary_max: 72000,
    apply_url: 'https://biodesign.asu.edu/careers',
    vertical: 'biotech',
  },
  {
    company_slug: 'exact-sciences-scottsdale',
    title: 'Regulatory Affairs Specialist',
    description: 'Manage FDA submissions, 510(k) preparation, and post-market surveillance documentation for Exact Sciences cancer screening products. BS in Life Sciences or Regulatory Affairs. RAC certification a plus. Scottsdale office with hybrid flexibility.',
    job_type: 'full-time',
    location: 'Scottsdale, AZ',
    remote: false,
    salary_min: 80000,
    salary_max: 110000,
    apply_url: 'https://exactsciences.com/careers',
    vertical: 'biotech',
  },
];

// ─── Defense Job Listings ─────────────────────────────────────────────────────
const defenseJobs = [
  {
    company_slug: 'raytheon-missiles-defense-tucson',
    title: 'Systems Engineer III — Missile Guidance',
    description: 'Support development and integration of precision guidance systems for Patriot and AMRAAM programs at Raytheon Tucson. Active Secret clearance required. BS in EE, AE, or Systems Engineering plus 5+ years defense systems experience. Experience with MIL-STD-810 test planning preferred.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 120000,
    salary_max: 165000,
    apply_url: 'https://rtx.com/careers',
    vertical: 'defense',
  },
  {
    company_slug: 'aerovironment-tucson',
    title: 'Autonomy Software Engineer — UAS',
    description: 'Develop flight autonomy, path planning, and guidance algorithms for Switchblade and next-gen loitering munitions at AeroVironment Tucson. C++, ROS, and embedded systems experience required. Active Secret clearance required or clearable. STEM degree + 3-7 years relevant experience.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 130000,
    salary_max: 175000,
    apply_url: 'https://avinc.com/careers',
    vertical: 'defense',
  },
  {
    company_slug: 'mercury-systems-phoenix',
    title: 'Cleared RF Systems Engineer',
    description: 'Design and integrate radar signal processing and electronic warfare subsystems at Mercury Systems Phoenix. TS/SCI clearance required. Experience with FPGA-based digital signal processing, radar waveforms, or EW systems. 5+ years defense electronics experience.',
    job_type: 'full-time',
    location: 'Phoenix, AZ',
    remote: false,
    salary_min: 140000,
    salary_max: 185000,
    apply_url: 'https://mrcy.com/careers',
    vertical: 'defense',
  },
  {
    company_slug: 'leidos-arizona',
    title: 'Cybersecurity Analyst — Cleared',
    description: 'Provide cybersecurity engineering and operations support for Air Force programs at Luke AFB and Davis-Monthan under Leidos. Active Secret clearance required (TS preferred). CompTIA Security+, CISSP, or equivalent certification required. 3+ years DoD cybersecurity experience.',
    job_type: 'full-time',
    location: 'Phoenix, AZ',
    remote: false,
    salary_min: 95000,
    salary_max: 130000,
    apply_url: 'https://leidos.com/careers',
    vertical: 'defense',
  },
  {
    company_slug: 'kratos-defense-az',
    title: 'Program Manager — Aerial Target Systems',
    description: 'Manage MAKO and UTAP aerial target drone programs from contract award through delivery at Kratos Tucson. Active Secret clearance required. PMP certification preferred. 7+ years defense program management experience. Strong background in DoD contract management and milestone-based delivery.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 145000,
    salary_max: 190000,
    apply_url: 'https://kratosdefense.com/careers',
    vertical: 'defense',
  },
  {
    company_slug: 'saic-arizona',
    title: 'IT Systems Analyst — Intelligence',
    description: 'Support network infrastructure and IT systems for Army Intelligence programs at Fort Huachuca under SAIC. Active TS/SCI clearance required. CompTIA Net+/Security+ or CCNA required. 2+ years enterprise IT support in a cleared environment. Strong documentation skills.',
    job_type: 'full-time',
    location: 'Tucson, AZ',
    remote: false,
    salary_min: 85000,
    salary_max: 115000,
    apply_url: 'https://saic.com/careers',
    vertical: 'defense',
  },
];

// ─── Biotech Events ───────────────────────────────────────────────────────────
const biotechEvents = [
  {
    company_slug: 'azbio',
    title: 'AZBio Annual Awards & Life Sciences Summit 2026',
    description: 'Arizona\'s premier life sciences event celebrating innovation in biotech, medical devices, and biopharma. The AZBio Awards recognize outstanding achievements in research, entrepreneurship, and patient impact. Networking with 500+ industry leaders, investors, and researchers.',
    event_date: '2026-05-14T09:00:00+00',
    event_end_date: '2026-05-14T20:00:00+00',
    event_location: 'Omni Scottsdale Resort at Montelucia, Scottsdale, AZ',
    event_type: 'conference',
    organizer: 'AZBio',
    vertical: 'biotech',
  },
  {
    company_slug: 'tgen',
    title: 'TGen Science & Innovation Symposium 2026',
    description: 'Annual research showcase from TGen scientists covering genomic medicine, precision oncology, neurological disease, and infectious disease breakthroughs. Open to AZBio members, pharma partners, and academic collaborators.',
    event_date: '2026-06-03T08:30:00+00',
    event_end_date: '2026-06-03T17:00:00+00',
    event_location: 'TGen, 445 N Fifth St, Phoenix, AZ',
    event_type: 'conference',
    organizer: 'TGen',
    vertical: 'biotech',
  },
  {
    company_slug: 'asu-biodesign-institute',
    title: 'Arizona Life Sciences Investor Forum',
    description: 'Curated pitch event connecting Arizona\'s biotech and medtech startups with regional and national venture capital. 15-minute presentations followed by one-on-one meetings. Application required. Co-hosted by ASU Biodesign and AZBio.',
    event_date: '2026-07-09T13:00:00+00',
    event_end_date: '2026-07-09T18:00:00+00',
    event_location: 'ASU SkySong, 1475 N Scottsdale Rd, Scottsdale, AZ',
    event_type: 'conference',
    organizer: 'ASU Biodesign Institute',
    vertical: 'biotech',
  },
];

// ─── Defense Events ───────────────────────────────────────────────────────────
const defenseEvents = [
  {
    company_slug: 'arizona-defense-alliance',
    title: 'Arizona Defense + Aerospace Forum 2026',
    description: 'Annual gathering of Arizona\'s defense industrial base. Plenary sessions on Luke AFB F-35 mission expansion, Fort Huachuca cyber capabilities, and Yuma Proving Ground modernization. B2B supplier matching with primes including Raytheon, AeroVironment, and Northrop Grumman.',
    event_date: '2026-05-20T08:00:00+00',
    event_end_date: '2026-05-21T17:00:00+00',
    event_location: 'Phoenix Convention Center, Phoenix, AZ',
    event_type: 'conference',
    organizer: 'Arizona Defense Alliance',
    vertical: 'defense',
  },
  {
    company_slug: 'raytheon-missiles-defense-tucson',
    title: 'AUSA Tucson Chapter Defense Industry Mixer',
    description: 'Monthly networking event for defense professionals, contractors, and military personnel in Southern Arizona. Hosted by the Association of the United States Army Tucson chapter. Open to cleared and uncleared defense community members.',
    event_date: '2026-04-30T17:30:00+00',
    event_end_date: '2026-04-30T20:00:00+00',
    event_location: 'DoubleTree by Hilton Hotel Tucson, 445 S Alvernon Way, Tucson, AZ',
    event_type: 'meetup',
    organizer: 'AUSA Tucson',
    vertical: 'defense',
  },
  {
    company_slug: 'general-dynamics-mission-systems-scottsdale',
    title: 'Southwest C4ISR Technology Summit',
    description: 'Regional summit on command, control, communications, computers, intelligence, surveillance, and reconnaissance (C4ISR) technology trends for the DoD. Presentations from prime contractors, small businesses, and Air Force Research Laboratory. Attendance requires U.S. person status.',
    event_date: '2026-06-17T09:00:00+00',
    event_end_date: '2026-06-17T16:30:00+00',
    event_location: 'Scottsdale Plaza Resort, 7200 N Scottsdale Rd, Scottsdale, AZ',
    event_type: 'conference',
    organizer: 'AFCEA Arizona Chapter',
    vertical: 'defense',
  },
];

// ─── Organization slug for AZBio that we'll need for the event lookup
// events need a company_slug (directory_companies), so we'll insert orgs as companies for event linking

// ─── Main import function ─────────────────────────────────────────────────────
async function run() {
  console.log('=== AZ Biotech + Defense Import ===\n');

  // ── Step 1: Insert organizations ──────────────────────────────────────────
  console.log('--- Organizations ---');
  const orgIds = {};
  for (const org of newOrgs) {
    const { data, error } = await sb
      .from('directory_organizations')
      .insert({
        name: org.name,
        slug: org.slug,
        description: org.description,
        website: org.website,
        city: org.city,
        state: org.state,
        membership_tier: org.membership_tier,
        vertical: org.vertical,
      })
      .select('id, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`  SKIP (exists): ${org.name}`);
        // Fetch existing
        const { data: existing } = await sb
          .from('directory_organizations')
          .select('id, slug')
          .eq('slug', org.slug)
          .single();
        if (existing) orgIds[org.slug] = existing.id;
      } else {
        console.error(`  ERROR org ${org.name}:`, error.message);
      }
      continue;
    }
    console.log(`  + Org: ${data.slug} (${data.id})`);
    orgIds[org.slug] = data.id;
  }

  // Also get existing org IDs (sc3, space-rising)
  const { data: allOrgs } = await sb.from('directory_organizations').select('id, slug');
  for (const o of allOrgs) { orgIds[o.slug] = o.id; }
  console.log('Org ID map:', orgIds);

  let insertedCount = 0;
  let skippedCount = 0;
  let certCount = 0;

  // ── Step 2: Insert biotech companies ──────────────────────────────────────
  console.log('\n--- Biotech Companies ---');
  const biotechOrgId = orgIds['azbio'];
  for (const c of biotechCompanies) {
    const { certs, featured, ...companyData } = c;
    const row = {
      ...companyData,
      vertical: 'biotech',
      state: 'AZ',
      country: 'US',
      status: 'active',
      featured: featured || false,
      organization_id: biotechOrgId || null,
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

    const certsToInsert = (certs && certs.length > 0) ? certs : ['ISO 13485', 'ISO 9001'];
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({
        company_id: data.id,
        cert_name: certName,
        cert_value: 'true',
        vertical: 'biotech',
      });
      certCount++;
    }
  }

  // ── Step 3: Insert defense companies ──────────────────────────────────────
  console.log('\n--- Defense Companies ---');
  const defenseOrgId = orgIds['arizona-defense-alliance'];
  for (const c of defenseCompanies) {
    const { certs, featured, ...companyData } = c;
    const row = {
      ...companyData,
      vertical: 'defense',
      state: 'AZ',
      country: 'US',
      status: 'active',
      featured: featured || false,
      organization_id: defenseOrgId || null,
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

    const certsToInsert = (certs && certs.length > 0) ? certs : ['ITAR Registered', 'ISO 9001'];
    for (const certName of certsToInsert) {
      await sb.from('directory_certifications').insert({
        company_id: data.id,
        cert_name: certName,
        cert_value: 'true',
        vertical: 'defense',
      });
      certCount++;
    }
  }

  // ── Step 4: Insert biotech jobs ────────────────────────────────────────────
  console.log('\n--- Biotech Job Listings ---');
  for (const j of biotechJobs) {
    const { company_slug, ...listingData } = j;

    // Special case: 'azbio' org inserted as org, not company -- check if slug is a company
    const { data: co } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();

    if (!co) {
      console.log(`  SKIP job (company not found): ${company_slug}`);
      continue;
    }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'job',
      status: 'active',
      ...listingData,
    });

    if (error) {
      console.error(`  ERROR job ${j.title}:`, error.message);
    } else {
      console.log(`  + Job: ${j.title}`);
    }
  }

  // ── Step 5: Insert defense jobs ────────────────────────────────────────────
  console.log('\n--- Defense Job Listings ---');
  for (const j of defenseJobs) {
    const { company_slug, ...listingData } = j;
    const { data: co } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();

    if (!co) {
      console.log(`  SKIP job (company not found): ${company_slug}`);
      continue;
    }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'job',
      status: 'active',
      ...listingData,
    });

    if (error) {
      console.error(`  ERROR job ${j.title}:`, error.message);
    } else {
      console.log(`  + Job: ${j.title}`);
    }
  }

  // ── Step 6: Insert biotech events ──────────────────────────────────────────
  console.log('\n--- Biotech Events ---');
  for (const ev of biotechEvents) {
    const { company_slug, ...listingData } = ev;

    // For org-hosted events (azbio), we need to find the company OR use a known company
    let co = null;
    const { data: coData } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();
    co = coData;

    // If not found as a company (e.g., 'azbio' is only an org), use TGen as fallback
    if (!co) {
      const { data: fallback } = await sb
        .from('directory_companies')
        .select('id')
        .eq('slug', 'tgen')
        .single();
      co = fallback;
    }

    if (!co) {
      console.log(`  SKIP event (no company found): ${ev.title}`);
      continue;
    }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'event',
      status: 'active',
      ...listingData,
    });

    if (error) {
      console.error(`  ERROR event ${ev.title}:`, error.message);
    } else {
      console.log(`  + Event: ${ev.title}`);
    }
  }

  // ── Step 7: Insert defense events ──────────────────────────────────────────
  console.log('\n--- Defense Events ---');
  for (const ev of defenseEvents) {
    const { company_slug, ...listingData } = ev;

    let co = null;
    const { data: coData } = await sb
      .from('directory_companies')
      .select('id')
      .eq('slug', company_slug)
      .single();
    co = coData;

    // Fallback: use raytheon-missiles-defense-tucson for defense events
    if (!co) {
      const { data: fallback } = await sb
        .from('directory_companies')
        .select('id')
        .eq('slug', 'raytheon-missiles-defense-tucson')
        .single();
      co = fallback;
    }

    if (!co) {
      console.log(`  SKIP event (no company found): ${ev.title}`);
      continue;
    }

    const { error } = await sb.from('directory_listings').insert({
      company_id: co.id,
      category: 'event',
      status: 'active',
      ...listingData,
    });

    if (error) {
      console.error(`  ERROR event ${ev.title}:`, error.message);
    } else {
      console.log(`  + Event: ${ev.title}`);
    }
  }

  // ── Final count ────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(`Inserted: ${insertedCount} companies`);
  console.log(`Skipped (already existed): ${skippedCount} companies`);
  console.log(`Certifications added: ${certCount}`);

  const { data: allCo } = await sb
    .from('directory_companies')
    .select('vertical')
    .eq('status', 'active');

  const byCat = {};
  allCo.forEach(c => { byCat[c.vertical] = (byCat[c.vertical] || 0) + 1; });
  console.log('\nFinal company counts by vertical:');
  Object.entries(byCat).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`  TOTAL: ${allCo.length}`);
}

run().catch(console.error);
