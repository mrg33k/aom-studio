#!/usr/bin/env node
'use strict';

/*
 * Tour topology analyzer.
 * Operates at the FILE level (types: file, config, document).
 * Function/class nodes are used ONLY to lift function-level edges (calls) up
 * to their containing file, enriching the file-level dependency graph.
 */

const fs = require('fs');

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error('usage: node ua-tour-analyze.js <input.json> <output.json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(inPath, 'utf8');
  const input = JSON.parse(raw);
  const nodes = input.nodes || [];
  const edges = input.edges || [];
  const layers = input.layers || [];

  const FILE_TYPES = new Set(['file', 'config', 'document']);
  const ENTRY_NAMES = new Set([
    'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js',
    'server.ts', 'server.js', 'mod.rs', 'main.go', 'main.py', 'main.rs',
    'manage.py', 'app.py', 'wsgi.py', 'asgi.py', 'run.py', '__main__.py',
    'Application.java', 'Main.java', 'Program.cs', 'config.ru', 'index.php',
    'App.swift', 'Application.kt', 'main.cpp', 'main.c'
  ]);

  // Index all nodes by id.
  const nodeById = new Map();
  for (const n of nodes) nodeById.set(n.id, n);

  // File-level node set.
  const fileNodes = nodes.filter(n => FILE_TYPES.has(n.type));
  const fileNodeSet = new Set(fileNodes.map(n => n.id));

  // Map any node id -> its containing file-level node id.
  // File-level nodes map to themselves. Function/class nodes map to file:<filePath>.
  function toFile(id) {
    if (fileNodeSet.has(id)) return id;
    const n = nodeById.get(id);
    if (n && n.filePath) {
      const candidate = 'file:' + n.filePath;
      if (fileNodeSet.has(candidate)) return candidate;
    }
    return null; // endpoint has no file-level home we track
  }

  // Build lifted DEPENDENCY graph (imports + calls, forward direction), file-level,
  // self-loops removed, deduped. This is the "A depends on B" spine.
  const depOut = new Map();   // fileId -> Set(fileId)
  const depIn = new Map();
  for (const id of fileNodeSet) { depOut.set(id, new Set()); depIn.set(id, new Set()); }

  const DEP_TYPES = new Set(['imports', 'calls']);
  for (const e of edges) {
    if (!DEP_TYPES.has(e.type)) continue;
    const s = toFile(e.source);
    const t = toFile(e.target);
    if (!s || !t || s === t) continue;
    depOut.get(s).add(t);
    depIn.get(t).add(s);
  }

  const nameOf = id => (nodeById.get(id) || {}).name || id;
  const summaryOf = id => (nodeById.get(id) || {}).summary || '';

  // A. Fan-in ranking (in-degree in dependency graph).
  const fanInRanking = [...fileNodeSet]
    .map(id => ({ id, fanIn: depIn.get(id).size, name: nameOf(id) }))
    .filter(x => x.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || a.id.localeCompare(b.id))
    .slice(0, 20);

  // B. Fan-out ranking (out-degree in dependency graph).
  const fanOutRanking = [...fileNodeSet]
    .map(id => ({ id, fanOut: depOut.get(id).size, name: nameOf(id) }))
    .filter(x => x.fanOut > 0)
    .sort((a, b) => b.fanOut - a.fanOut || a.id.localeCompare(b.id))
    .slice(0, 20);

  // Precompute fan-out values and thresholds for entry scoring.
  const fanOutVal = new Map([...fileNodeSet].map(id => [id, depOut.get(id).size]));
  const fanInVal = new Map([...fileNodeSet].map(id => [id, depIn.get(id).size]));
  const sortedFanOut = [...fanOutVal.values()].sort((a, b) => b - a);
  const sortedFanIn = [...fanInVal.values()].sort((a, b) => a - b);
  const topDecileFanOut = sortedFanOut.length
    ? sortedFanOut[Math.floor(sortedFanOut.length * 0.10)] : 0;
  const bottomQuartileFanIn = sortedFanIn.length
    ? sortedFanIn[Math.floor(sortedFanIn.length * 0.25)] : 0;

  // C. Entry point candidates.
  function depth(fp) { return (fp || '').split('/').filter(Boolean).length; }
  const entryScored = fileNodes.map(n => {
    let score = 0;
    const fp = n.filePath || '';
    const tags = n.tags || [];
    if (n.type === 'document') {
      const base = (n.name || '').toLowerCase();
      if (base === 'readme.md' && depth(fp) <= 1) score += 5;
      else if (base.endsWith('.md') && depth(fp) <= 1) score += 2;
    } else {
      if (ENTRY_NAMES.has(n.name)) score += 3;
      if (tags.includes('entry-point') || tags.includes('root-component')) score += 3;
      const d = depth(fp);
      if (d <= 2) score += 1; // root or one/two deep
      if ((fanOutVal.get(n.id) || 0) >= topDecileFanOut && topDecileFanOut > 0) score += 1;
      if ((fanInVal.get(n.id) || 0) <= bottomQuartileFanIn) score += 1;
    }
    return { id: n.id, score, name: n.name, type: n.type, summary: summaryOf(n.id) };
  });
  const entryPointCandidates = entryScored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (fanOutVal.get(b.id) || 0) - (fanOutVal.get(a.id) || 0))
    .slice(0, 5);

  // D. BFS from top CODE entry point (skip document entries).
  const codeEntries = entryScored
    .filter(x => x.type !== 'document' && x.score > 0)
    .sort((a, b) => b.score - a.score || (fanOutVal.get(b.id) || 0) - (fanOutVal.get(a.id) || 0));
  let startNode = codeEntries.length ? codeEntries[0].id : null;
  // Prefer the known documented root if present.
  if (fileNodeSet.has('file:CornerCV6.jsx')) startNode = 'file:CornerCV6.jsx';

  const order = [];
  const depthMap = {};
  if (startNode) {
    const q = [startNode];
    depthMap[startNode] = 0;
    while (q.length) {
      const cur = q.shift();
      order.push(cur);
      const nexts = [...depOut.get(cur)].sort();
      for (const nx of nexts) {
        if (!(nx in depthMap)) {
          depthMap[nx] = depthMap[cur] + 1;
          q.push(nx);
        }
      }
    }
  }
  const byDepth = {};
  for (const [id, d] of Object.entries(depthMap)) {
    (byDepth[d] = byDepth[d] || []).push(id);
  }

  // E. Non-code file inventory.
  const invEntry = n => ({ id: n.id, name: n.name, type: n.type, summary: summaryOf(n.id) });
  const nonCodeFiles = {
    documentation: fileNodes.filter(n => n.type === 'document').map(invEntry),
    infrastructure: fileNodes.filter(n => ['service', 'pipeline', 'resource'].includes(n.type)).map(invEntry),
    data: fileNodes.filter(n => ['table', 'schema', 'endpoint'].includes(n.type)).map(invEntry),
    config: fileNodes.filter(n => n.type === 'config').map(invEntry)
  };

  // F. Tightly coupled clusters.
  // Seed with bidirectional dependency pairs, then expand with nodes connected
  // (either direction) to 2+ current members.
  const undirected = new Map(); // id -> Set(neighbors, either direction)
  for (const id of fileNodeSet) undirected.set(id, new Set());
  for (const id of fileNodeSet) {
    for (const t of depOut.get(id)) { undirected.get(id).add(t); undirected.get(t).add(id); }
  }
  const seeds = [];
  const seenPair = new Set();
  for (const a of fileNodeSet) {
    for (const b of depOut.get(a)) {
      if (depOut.get(b).has(a)) { // bidirectional
        const key = [a, b].sort().join('|');
        if (!seenPair.has(key)) { seenPair.add(key); seeds.push(new Set([a, b])); }
      }
    }
  }
  function expand(cluster) {
    let changed = true;
    while (changed && cluster.size < 5) {
      changed = false;
      let best = null, bestCount = 0;
      for (const cand of fileNodeSet) {
        if (cluster.has(cand)) continue;
        let cnt = 0;
        for (const m of cluster) if (undirected.get(cand).has(m)) cnt++;
        if (cnt >= 2 && cnt > bestCount) { bestCount = cnt; best = cand; }
      }
      if (best) { cluster.add(best); changed = true; }
    }
    return cluster;
  }
  const clustersRaw = seeds.map(s => expand(new Set(s)));
  // Dedup identical clusters, count internal edges.
  const clusterKeys = new Set();
  const clusters = [];
  for (const c of clustersRaw) {
    const arr = [...c].sort();
    const key = arr.join('|');
    if (clusterKeys.has(key)) continue;
    clusterKeys.add(key);
    let edgeCount = 0;
    for (const a of arr) for (const b of arr) if (a !== b && depOut.get(a).has(b)) edgeCount++;
    clusters.push({ nodes: arr, edgeCount });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount || b.nodes.length - a.nodes.length);
  const topClusters = clusters.slice(0, 10);

  // G. Layer list.
  const layerList = layers.map(l => ({ id: l.id, name: l.name, description: l.description }));

  // H. Node summary index (file-level only — tour candidates).
  const nodeSummaryIndex = {};
  for (const n of fileNodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || '' };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: topClusters,
    layers: { count: layerList.length, list: layerList },
    nodeSummaryIndex,
    totalNodes: fileNodes.length,
    totalEdges: edges.length,
    meta: {
      allNodesInInput: nodes.length,
      fileLevelNodes: fileNodes.length,
      liftedDepEdges: [...depOut.values()].reduce((s, set) => s + set.size, 0),
      topDecileFanOutThreshold: topDecileFanOut,
      bottomQuartileFanInThreshold: bottomQuartileFanIn
    }
  };

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.error('OK: file-nodes=' + fileNodes.length +
    ' depEdges=' + result.meta.liftedDepEdges +
    ' bfsReached=' + order.length +
    ' start=' + startNode);
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error('FATAL: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
}
