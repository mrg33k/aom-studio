#!/usr/bin/env node
// Mirror src/dashboard/cv4-explore-v2/ -> public/cv4-static/
// Keeps the static-fragment surface served at /cv4-static (per vercel.json
// rewrite) in lockstep with the React-mounted source. Without this, edits
// to src views never reach the deployed /cv4-static/views/*.html and the
// fragment surface drifts from the live React surface.
//
// Runs in `npm run prebuild` so every Vercel build picks up latest source.
// Idempotent: re-running mirrors current state, removes deleted files.
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '..', 'src', 'dashboard', 'cv4-explore-v2')
const DEST = path.resolve(__dirname, '..', 'public', 'cv4-static')

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

function copyTree(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    ensureDir(dest)
    const srcEntries = new Set(fs.readdirSync(src))
    // Remove files in dest that no longer exist in src
    if (fs.existsSync(dest)) {
      for (const e of fs.readdirSync(dest)) {
        if (!srcEntries.has(e)) {
          fs.rmSync(path.join(dest, e), { recursive: true, force: true })
        }
      }
    }
    for (const e of srcEntries) copyTree(path.join(src, e), path.join(dest, e))
  } else {
    fs.copyFileSync(src, dest)
  }
}

if (!fs.existsSync(SRC)) {
  console.warn('[sync-cv4-static] source missing:', SRC, '— skipping')
  process.exit(0)
}

ensureDir(DEST)
copyTree(SRC, DEST)
const count = (function walk(d) {
  let n = 0
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e)
    if (fs.statSync(p).isDirectory()) n += walk(p)
    else n++
  }
  return n
})(DEST)
console.log(`[sync-cv4-static] mirrored ${count} files -> ${path.relative(process.cwd(), DEST)}`)
