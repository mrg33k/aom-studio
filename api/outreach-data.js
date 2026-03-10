// AOM Outreach Data API
// Reads cold-outreach-log.md from AOM-EA repo and returns parsed pipeline data
// Vercel serverless function

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

async function fetchGitHubFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

// ICP industries (everything else is off-ICP)
const ICP_INDUSTRIES = [
  'construction', 'real estate', 'hospitality', 'nonprofit', 'healthcare',
  'events', 'fitness', 'chamber', 'labor/nonprofit', 'education',
]

const OFF_ICP_INDUSTRIES = [
  'tech', 'tech/saas', 'finance', 'finance/tech', 'ai/tech', 'cybersecurity',
  'edtech', 'hr tech', 'data/tech', 'adtech', 'sports tech', 'events/tech',
  'agtech', 'cleantech', 'media', 'media/nonprofit', 'defense/tech', 'consulting',
  'marketing agency', 'unknown', 'nonprofit/tech',
  'defense', 'aerospace', 'research', 'energy', 'science',
]

function classifyIndustry(raw) {
  const lower = (raw || '').toLowerCase().trim()

  // Direct ICP matches
  if (lower.includes('construction')) return { industry: 'Construction', icp: true }
  if (lower.includes('real estate')) return { industry: 'Real Estate', icp: true }
  if (lower.includes('hospitality') || lower.includes('restaurant')) return { industry: 'Hospitality', icp: true }
  if (lower === 'events') return { industry: 'Events', icp: true }
  if (lower.includes('fitness')) return { industry: 'Healthcare', icp: true }
  if (lower.includes('healthcare') || lower.includes('health') && !lower.includes('tech')) return { industry: 'Healthcare', icp: true }

  // Nonprofit (ICP)
  if (lower.includes('nonprofit') && !lower.includes('tech')) return { industry: 'Nonprofit', icp: true }
  if (lower === 'chamber' || lower === 'labor/nonprofit' || lower === 'education') return { industry: 'Nonprofit', icp: true }

  // Off-ICP
  if (lower.includes('tech') || lower.includes('saas') || lower.includes('ai')) return { industry: 'Tech/SaaS', icp: false }
  if (lower.includes('defense') || lower.includes('aerospace')) return { industry: 'Defense', icp: false }
  if (lower.includes('finance') || lower.includes('insurance')) return { industry: 'Finance', icp: false }
  if (lower.includes('media') || lower.includes('agency') || lower.includes('marketing')) return { industry: 'Media/Agency', icp: false }
  if (lower.includes('research') || lower.includes('energy') || lower.includes('science')) return { industry: 'Research/Energy', icp: false }
  if (lower.includes('consulting')) return { industry: 'Consulting', icp: false }

  // Events/tech is borderline, mark as off-ICP
  if (lower.includes('events/tech')) return { industry: 'Tech/SaaS', icp: false }

  // Default: off-ICP
  return { industry: 'Other', icp: false }
}

function parseOutreachLog(markdown) {
  const contacts = []
  const lines = markdown.split('\n')

  let currentBatch = null
  let currentSection = null
  let inTable = false
  let headerCols = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect batch headers (### lines with dates)
    if (line.startsWith('### ')) {
      const batchMatch = line.match(/### (.+?)(?:\s*--\s*(.+))?$/)
      if (batchMatch) {
        const dateStr = batchMatch[1].replace(/^#+\s*/, '').trim()
        currentBatch = dateStr
        currentSection = batchMatch[2] || ''
      }
      inTable = false
      headerCols = []
      continue
    }

    // Detect section headers within batches
    if (line.startsWith('**') && line.endsWith('**')) {
      currentSection = line.replace(/\*\*/g, '').replace(/:$/, '').trim()
      inTable = false
      headerCols = []
      continue
    }

    // Skip the DO NOT CONTACT section
    if (line.includes('DO NOT CONTACT')) {
      break
    }

    // Table header detection
    if (line.startsWith('|') && line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c)

      // Check if this is a separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        continue
      }

      // Check if this is a header row
      const lowerCells = cells.map(c => c.toLowerCase())
      if (lowerCells.some(c => c === 'name' || c === 'company' || c === 'email' || c === 'date' || c === 'status' || c === 'industry')) {
        headerCols = lowerCells
        inTable = true
        continue
      }

      // Data row
      if (inTable && headerCols.length > 0) {
        const row = {}
        cells.forEach((cell, idx) => {
          if (idx < headerCols.length) {
            row[headerCols[idx]] = cell
          }
        })

        // Extract contact data
        const contact = {
          name: row['name'] || row['contact'] || '',
          company: row['company'] || '',
          email: row['email'] || '',
          industry: row['industry'] || '',
          date: row['date'] || '',
          status: row['status'] || 'no_response',
          batch: currentBatch || '',
          notes: row['notes'] || row['note'] || row['recovery'] || '',
        }

        // Try to infer industry from section name if not in table
        if (!contact.industry && currentSection) {
          const secLower = currentSection.toLowerCase()
          if (secLower.includes('agency') || secLower.includes('agencies')) contact.industry = 'marketing agency'
          else if (secLower.includes('defense') || secLower.includes('aerospace')) contact.industry = 'defense'
          else if (secLower.includes('real estate') || secLower.includes('development')) contact.industry = 'real estate'
          else if (secLower.includes('healthcare') || secLower.includes('biotech') || secLower.includes('medtech')) contact.industry = 'healthcare'
          else if (secLower.includes('tech') || secLower.includes('saas')) contact.industry = 'tech/saas'
          else if (secLower.includes('nonprofit') || secLower.includes('community')) contact.industry = 'nonprofit'
          else if (secLower.includes('event') || secLower.includes('culture')) contact.industry = 'events'
          else if (secLower.includes('research') || secLower.includes('energy') || secLower.includes('science')) contact.industry = 'research'
          else if (secLower.includes('hospitality')) contact.industry = 'hospitality'
        }

        // Skip empty rows and strikethrough entries
        if (contact.email && !contact.company.startsWith('~~')) {
          // Clean up strikethrough from name/company
          contact.name = contact.name.replace(/~~/g, '')
          contact.company = contact.company.replace(/~~/g, '')

          contacts.push(contact)
        }
      }
    }
  }

  return contacts
}

function buildPipelineData(contacts) {
  // Classify each contact
  const classified = contacts.map(c => {
    const cls = classifyIndustry(c.industry)
    return { ...c, classifiedIndustry: cls.industry, isIcp: cls.icp }
  })

  // Status counts
  const statusCounts = { no_response: 0, replied: 0, meeting: 0, closed: 0, dead: 0 }
  classified.forEach(c => {
    const s = c.status.toLowerCase().trim()
    if (statusCounts.hasOwnProperty(s)) statusCounts[s]++
    else statusCounts.no_response++
  })

  // ICP vs off-ICP
  const icpContacts = classified.filter(c => c.isIcp)
  const offIcpContacts = classified.filter(c => !c.isIcp)

  // Industry breakdown (ICP only)
  const icpByIndustry = {}
  icpContacts.forEach(c => {
    if (!icpByIndustry[c.classifiedIndustry]) {
      icpByIndustry[c.classifiedIndustry] = { total: 0, no_response: 0, replied: 0, meeting: 0, closed: 0, dead: 0 }
    }
    icpByIndustry[c.classifiedIndustry].total++
    const s = c.status.toLowerCase().trim()
    if (icpByIndustry[c.classifiedIndustry].hasOwnProperty(s)) {
      icpByIndustry[c.classifiedIndustry][s]++
    }
  })

  // Off-ICP industry breakdown
  const offIcpByIndustry = {}
  offIcpContacts.forEach(c => {
    if (!offIcpByIndustry[c.classifiedIndustry]) {
      offIcpByIndustry[c.classifiedIndustry] = { total: 0 }
    }
    offIcpByIndustry[c.classifiedIndustry].total++
  })

  // Batch breakdown
  const batches = {}
  classified.forEach(c => {
    const batch = c.batch || 'Unknown'
    if (!batches[batch]) {
      batches[batch] = { total: 0, icp: 0, offIcp: 0, replied: 0, no_response: 0, statuses: {} }
    }
    batches[batch].total++
    if (c.isIcp) batches[batch].icp++
    else batches[batch].offIcp++
    const s = c.status.toLowerCase().trim()
    batches[batch].statuses[s] = (batches[batch].statuses[s] || 0) + 1
    if (s === 'replied') batches[batch].replied++
    if (s === 'no_response') batches[batch].no_response++
  })

  return {
    totalContacts: classified.length,
    icpContacts: icpContacts.length,
    offIcpContacts: offIcpContacts.length,
    statusCounts,
    icpByIndustry,
    offIcpByIndustry,
    batches,
    lastUpdated: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Cache for 5 minutes
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const markdown = await fetchGitHubFile('outreach/cold-outreach-log.md')
    if (!markdown) {
      return res.status(500).json({ error: 'Could not fetch outreach log' })
    }

    const contacts = parseOutreachLog(markdown)
    const pipeline = buildPipelineData(contacts)

    return res.status(200).json(pipeline)
  } catch (err) {
    console.error('Outreach data error:', err)
    return res.status(500).json({ error: 'Failed to parse outreach data' })
  }
}
