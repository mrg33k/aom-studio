// City service-area pages (kind 'city') — 15 records rendered by templates/city.mjs
// from the approved "Scottsdale.dc.html" comp (design-v2-2026-08-27).
//
// Body copy is the verbatim template used by every live city page
// (public/wolfpack-site/<slug>/index.html): the same sentences with the city
// name swapped in. `copyFor()` reproduces those sentences exactly — never
// rewrite them. Titles follow 'Commercial Plumbing in {City}, AZ'; every
// description is unique per city. `nearbyCities` are 3-4 geographic
// neighbors used for the nearby links row.

const records = [
  {
    slug: 'phoenix',
    name: 'Phoenix',
    description: 'Commercial plumbing in Phoenix, AZ from Wolfpack’s home base: hydro jetting, drain cleaning, backflow testing, and water heaters across Greater Phoenix, with a live 24/7 answer at 602-550-5452.',
    nearbyCities: ['scottsdale', 'tempe', 'glendale', 'paradise-valley'],
  },
  {
    slug: 'scottsdale',
    name: 'Scottsdale',
    description: 'Wolfpack covers Scottsdale as daily commercial plumbing territory for offices, resorts, and retail. Greater Phoenix crews, and the 24/7 emergency line at 602-550-5452 always reaches a person.',
    nearbyCities: ['paradise-valley', 'phoenix', 'tempe', 'mesa'],
  },
  {
    slug: 'tempe',
    name: 'Tempe',
    description: 'Commercial plumbing for Tempe properties from Phoenix-based crews minutes up the freeway. Full Greater Phoenix coverage, and calling 602-550-5452 gets a live answer 24/7.',
    nearbyCities: ['phoenix', 'mesa', 'chandler', 'scottsdale'],
  },
  {
    slug: 'mesa',
    name: 'Mesa',
    description: 'Mesa commercial plumbing without the wait: Wolfpack’s Greater Phoenix crews handle jetting, drains, backflow, and water heaters, and the 24/7 line at 602-550-5452 is answered day or night.',
    nearbyCities: ['tempe', 'chandler', 'gilbert', 'apache-junction'],
  },
  {
    slug: 'chandler',
    name: 'Chandler',
    description: 'Commercial plumbing service in Chandler, AZ on Wolfpack’s daily Greater Phoenix routes, from routine maintenance to emergencies dispatched 24/7 through 602-550-5452.',
    nearbyCities: ['gilbert', 'tempe', 'mesa', 'san-tan-valley'],
  },
  {
    slug: 'gilbert',
    name: 'Gilbert',
    description: 'Wolfpack brings commercial plumbing to Gilbert as part of its Greater Phoenix service area: jetting, camera inspection, backflow, and water heaters, with the 24/7 number 602-550-5452 always staffed.',
    nearbyCities: ['chandler', 'mesa', 'san-tan-valley', 'tempe'],
  },
  {
    slug: 'glendale',
    name: 'Glendale',
    description: 'Glendale commercial properties get the same Greater Phoenix commercial plumbing coverage as our home city, including 24/7 emergency response when you call 602-550-5452.',
    nearbyCities: ['peoria', 'phoenix', 'surprise', 'litchfield-park'],
  },
  {
    slug: 'peoria',
    name: 'Peoria',
    description: 'Commercial plumbing in Peoria, AZ handled by Wolfpack’s Greater Phoenix crews already working the West Valley. Emergencies go to 602-550-5452, where a person answers 24/7.',
    nearbyCities: ['glendale', 'surprise', 'phoenix'],
  },
  {
    slug: 'surprise',
    name: 'Surprise',
    description: 'Wolfpack runs commercial plumbing service to Surprise on its regular Greater Phoenix rotation: jetting, drains, backflow, and heaters, backed by a 24/7 live answer at 602-550-5452.',
    nearbyCities: ['peoria', 'glendale', 'litchfield-park'],
  },
  {
    slug: 'goodyear',
    name: 'Goodyear',
    description: 'Goodyear businesses call Wolfpack for commercial plumbing across the West Valley side of Greater Phoenix. Reach the 24/7 emergency line at 602-550-5452 at any hour.',
    nearbyCities: ['avondale', 'litchfield-park', 'surprise'],
  },
  {
    slug: 'avondale',
    name: 'Avondale',
    description: 'Commercial plumbing in Avondale, AZ from a Greater Phoenix contractor that answers its own phone: 602-550-5452, live, 24 hours a day.',
    nearbyCities: ['goodyear', 'litchfield-park', 'phoenix'],
  },
  {
    slug: 'paradise-valley',
    name: 'Paradise Valley',
    description: 'Paradise Valley commercial properties sit minutes from Wolfpack’s Phoenix yard, inside the Greater Phoenix daily service area for commercial plumbing, with 24/7 emergency dispatch through 602-550-5452.',
    nearbyCities: ['scottsdale', 'phoenix', 'tempe'],
  },
  {
    slug: 'apache-junction',
    name: 'Apache Junction',
    description: 'Apache Junction marks the east edge of Wolfpack’s Greater Phoenix service area and gets full commercial plumbing coverage, including the 24/7 emergency line at 602-550-5452.',
    nearbyCities: ['mesa', 'gilbert', 'san-tan-valley'],
  },
  {
    slug: 'litchfield-park',
    name: 'Litchfield Park',
    description: 'Litchfield Park anchors the west end of Wolfpack’s Greater Phoenix commercial plumbing routes. For emergencies, 602-550-5452 is answered live around the clock.',
    nearbyCities: ['goodyear', 'avondale', 'surprise'],
  },
  {
    slug: 'san-tan-valley',
    name: 'San Tan Valley',
    description: 'Commercial plumbing reaches San Tan Valley on Wolfpack’s Greater Phoenix routes: jetting, drains, backflow, and water heaters, plus 24/7 emergency response at 602-550-5452.',
    nearbyCities: ['gilbert', 'chandler', 'apache-junction', 'mesa'],
  },
]

// Verbatim body copy template shared by every live city page — only the city
// name varies between pages.
function copyFor(name) {
  return {
    eyebrow: `Service Area · ${name}, Arizona`,
    heroLines: [
      { text: 'Commercial plumbing' },
      { text: 'in ', accent: `${name}.` },
    ],
    heroSub: `Hydro jetting, drain cleaning, backflow testing, water heaters, and 24/7 emergency plumbing for commercial properties in ${name}, AZ.`,
    heroAlt: `Wolfpack crew on a commercial job in ${name}`,
    whyHeading: 'Phoenix-based crews.',
    whyHeadingDim: `${name} service.`,
    whyCards: [
      {
        icon: 'truck',
        title: 'Local crews',
        desc: `Our trucks and equipment are based in Phoenix. ${name} is in our daily service area, not a special trip.`,
      },
      {
        icon: 'clock',
        title: '24/7 response',
        desc: `Emergency line down in ${name}? A person answers. Crews dispatch. On-site within 3 hours for contracted properties.`,
      },
      {
        icon: 'doc',
        title: 'Licensed statewide',
        desc: `AZ ROC #326629. Licensed, bonded and insured for commercial work anywhere in Arizona. ${name} is home territory.`,
      },
    ],
    areaHeading: 'Across Greater Phoenix.',
    areaHeadingDim: 'Statewide on request.',
    areaLead: 'From Apache Junction to Litchfield Park, and most of Arizona on request.',
    offer: {
      lines: ['Commercial plumbing', `in ${name}. Call direct.`],
      cta: 'Request a walkthrough',
    },
  }
}

export const cities = records.map(record => ({
  ...record,
  title: `Commercial Plumbing in ${record.name}, AZ`,
  copy: copyFor(record.name),
}))

export function findCity(slug) {
  return cities.find(city => city.slug === slug)
}

export function cityPage(slug) {
  const city = findCity(slug)
  if (!city) throw new Error(`No city record for slug "${slug}"`)
  return { slug: city.slug, title: city.title, description: city.description, kind: 'city' }
}
