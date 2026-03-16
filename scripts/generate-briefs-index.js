/**
 * generate-briefs-index.js
 *
 * Scans AOM-EA .md files for YAML frontmatter, filters to status: "published",
 * converts markdown to HTML, and writes:
 *   - src/data/briefs-index.json  (metadata for BriefsHub accordion)
 *   - src/data/briefs/[slug].json (full content per brief page)
 *
 * Run: node scripts/generate-briefs-index.js
 * Triggered automatically via npm prebuild.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Source: AOM-EA repo. Check env var, then submodule path, then sibling directory.
const EA_PATHS = [
  process.env.AOM_EA_PATH,
  path.resolve(ROOT, 'AOM-EA'),
  path.resolve(ROOT, '..', 'AOM-EA'),
].filter(Boolean);

let EA_ROOT = null;
for (const p of EA_PATHS) {
  if (fs.existsSync(p)) {
    EA_ROOT = p;
    break;
  }
}

if (!EA_ROOT) {
  console.warn('[briefs] AOM-EA repo not found. Writing empty index.');
  const emptyIndex = { generated: new Date().toISOString(), categories: [] };
  fs.writeFileSync(path.join(ROOT, 'src/data/briefs-index.json'), JSON.stringify(emptyIndex, null, 2));
  process.exit(0);
}

console.log(`[briefs] Scanning ${EA_ROOT} for published .md files...`);

// Category display order (fixed, per Steffen spec)
const CATEGORY_ORDER = [
  'Strategy',
  'Design Specs',
  'Audits',
  'Client Reports',
  'Outreach',
  'Technical',
  'Content',
  'Council',
];

// Valid statuses
const VALID_STATUSES = ['draft', 'published', 'archived'];

// Directories to scan inside AOM-EA
const SCAN_DIRS = [
  'projects',
  'references',
  'briefs',
  'outreach',
  'council',
];

// Files/directories to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  'archives',
  'AGENT.md',
  'latest-result.md',
  'last-conversation.md',
  'CLAUDE.md',
  'MEMORY.md',
  'README.md',
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(fullPath)) continue;

    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Collect all .md files from scan directories
let allFiles = [];
for (const dir of SCAN_DIRS) {
  const fullDir = path.join(EA_ROOT, dir);
  allFiles.push(...getAllMdFiles(fullDir));
}

// Also scan root-level .md files (but not recursively into unspecified dirs)
const rootEntries = fs.readdirSync(EA_ROOT, { withFileTypes: true });
for (const entry of rootEntries) {
  if (entry.isFile() && entry.name.endsWith('.md') && !shouldSkip(entry.name)) {
    allFiles.push(path.join(EA_ROOT, entry.name));
  }
}

console.log(`[briefs] Found ${allFiles.length} .md files total.`);

// Parse frontmatter and filter
const briefs = [];
const slugsSeen = new Set();

for (const filePath of allFiles) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // Must have frontmatter with required fields
    if (!data.title || !data.slug || !data.category || !data.agent || !data.date || !data.status) {
      continue;
    }

    // Only published items
    if (data.status !== 'published') continue;

    // Validate category
    if (!CATEGORY_ORDER.includes(data.category)) {
      console.warn(`[briefs] Unknown category "${data.category}" in ${filePath}. Skipping.`);
      continue;
    }

    // Check for duplicate slugs
    if (slugsSeen.has(data.slug)) {
      console.warn(`[briefs] Duplicate slug "${data.slug}" in ${filePath}. Skipping.`);
      continue;
    }
    slugsSeen.add(data.slug);

    // Convert markdown to HTML
    const html = marked.parse(content);

    briefs.push({
      title: data.title,
      slug: data.slug,
      category: data.category,
      agent: data.agent,
      date: data.date,
      summary: data.summary || '',
      updated: data.updated || null,
      tags: data.tags || [],
      priority: data.priority || 5,
      content: html,
      sourcePath: path.relative(EA_ROOT, filePath),
    });
  } catch (err) {
    console.warn(`[briefs] Error parsing ${filePath}: ${err.message}`);
  }
}

console.log(`[briefs] ${briefs.length} published briefs found.`);

// Sort briefs within categories: by priority (ascending), then by date (descending)
briefs.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return new Date(b.date) - new Date(a.date);
});

// Format date for display: "Mar 10" or "Mar 10, 2025" if different year
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return `${month} ${day}, ${year}`;
  }
  return `${month} ${day}`;
}

// Build category index
const categoryMap = {};
for (const cat of CATEGORY_ORDER) {
  categoryMap[cat] = [];
}

for (const brief of briefs) {
  categoryMap[brief.category].push({
    title: brief.title,
    slug: brief.slug,
    agent: brief.agent,
    date: brief.date,
    dateFormatted: formatDate(brief.date),
    summary: brief.summary,
    path: `/briefs/${brief.slug}`,
    hasPage: true,
  });
}

const indexData = {
  generated: new Date().toISOString(),
  categories: CATEGORY_ORDER.map(name => ({
    name,
    items: categoryMap[name],
  })),
};

// Write briefs-index.json
const indexPath = path.join(ROOT, 'src/data/briefs-index.json');
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
console.log(`[briefs] Wrote ${indexPath}`);

// Write individual brief JSON files
const briefsDir = path.join(ROOT, 'src/data/briefs');
fs.mkdirSync(briefsDir, { recursive: true });

// Clean old briefs
const existingFiles = fs.readdirSync(briefsDir).filter(f => f.endsWith('.json'));
for (const f of existingFiles) {
  fs.unlinkSync(path.join(briefsDir, f));
}

for (const brief of briefs) {
  const briefData = {
    title: brief.title,
    slug: brief.slug,
    category: brief.category,
    agent: brief.agent,
    date: brief.date,
    dateFormatted: formatDate(brief.date),
    updated: brief.updated,
    summary: brief.summary,
    tags: brief.tags,
    content: brief.content,
  };

  const briefPath = path.join(briefsDir, `${brief.slug}.json`);
  fs.writeFileSync(briefPath, JSON.stringify(briefData, null, 2));
}

console.log(`[briefs] Wrote ${briefs.length} individual brief files to ${briefsDir}`);
console.log('[briefs] Done.');
