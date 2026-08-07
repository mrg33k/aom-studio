#!/usr/bin/env node
'use strict';

const fs = require('fs');

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error('usage: analyze.js <input.json> <output.json>');
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const fileNodes = input.fileNodes || [];
  const importEdges = input.importEdges || [];
  const allEdges = input.allEdges || [];

  const byId = {};
  for (const n of fileNodes) byId[n.id] = n;

  // ---- common prefix over directory portions ----
  const paths = fileNodes.map(n => n.filePath || '');
  const splitPaths = paths.map(p => p.split('/'));
  // dir segments = all but last
  const dirSegs = splitPaths.map(s => s.slice(0, -1));
  let commonPrefix = [];
  if (dirSegs.length) {
    const first = dirSegs[0];
    for (let i = 0; i < first.length; i++) {
      const seg = first[i];
      if (dirSegs.every(d => d[i] === seg)) commonPrefix.push(seg);
      else break;
    }
  }

  function groupOf(node) {
    const segs = (node.filePath || '').split('/');
    const dir = segs.slice(0, -1);
    const rel = dir.slice(commonPrefix.length);
    if (rel.length === 0) return '(root)';
    return rel[0];
  }

  // ---- A. directory grouping ----
  const directoryGroups = {};
  for (const n of fileNodes) {
    const g = groupOf(n);
    (directoryGroups[g] = directoryGroups[g] || []).push(n.id);
  }

  // ---- B. node type grouping ----
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);
  }

  // ---- C. adjacency / fan in-out ----
  const fanOut = {}, fanIn = {};
  for (const n of fileNodes) { fanOut[n.id] = 0; fanIn[n.id] = 0; }
  for (const e of importEdges) {
    if (fanOut[e.source] !== undefined) fanOut[e.source]++;
    if (fanIn[e.target] !== undefined) fanIn[e.target]++;
  }

  // ---- E. inter-group import frequency ----
  const interMap = {}; // "from->to" : count
  const groupImportsFrom = {}; // group -> set
  const groupImportedBy = {};
  for (const e of importEdges) {
    const s = byId[e.source], t = byId[e.target];
    if (!s || !t) continue;
    const gs = groupOf(s), gt = groupOf(t);
    if (gs === gt) continue;
    const key = gs + '->' + gt;
    interMap[key] = (interMap[key] || 0) + 1;
    (groupImportsFrom[gs] = groupImportsFrom[gs] || new Set()).add(gt);
    (groupImportedBy[gt] = groupImportedBy[gt] || new Set()).add(gs);
  }
  const interGroupImports = Object.entries(interMap)
    .map(([k, c]) => { const [from, to] = k.split('->'); return { from, to, count: c }; })
    .sort((a, b) => b.count - a.count);

  // ---- F. intra-group density ----
  const intraGroupDensity = {};
  for (const g of Object.keys(directoryGroups)) {
    intraGroupDensity[g] = { internalEdges: 0, totalEdges: 0, density: 0 };
  }
  for (const e of importEdges) {
    const s = byId[e.source], t = byId[e.target];
    if (!s || !t) continue;
    const gs = groupOf(s), gt = groupOf(t);
    if (gs === gt) {
      intraGroupDensity[gs].internalEdges++;
      intraGroupDensity[gs].totalEdges++;
    } else {
      intraGroupDensity[gs].totalEdges++;
      intraGroupDensity[gt].totalEdges++;
    }
  }
  for (const g of Object.keys(intraGroupDensity)) {
    const d = intraGroupDensity[g];
    d.density = d.totalEdges ? +(d.internalEdges / d.totalEdges).toFixed(3) : 0;
  }

  // ---- D. cross-category edges (by node type) ----
  const crossMap = {};
  for (const e of allEdges) {
    const s = byId[e.source], t = byId[e.target];
    if (!s || !t) continue;
    if (s.type === t.type) continue;
    const key = s.type + '|' + t.type + '|' + e.type;
    crossMap[key] = (crossMap[key] || 0) + 1;
  }
  const crossCategoryEdges = Object.entries(crossMap).map(([k, c]) => {
    const [fromType, toType, edgeType] = k.split('|');
    return { fromType, toType, edgeType, count: c };
  }).sort((a, b) => b.count - a.count);

  // ---- G. directory pattern matching ----
  const dirPatterns = [
    [['routes','api','controllers','endpoints','handlers'], 'api'],
    [['services','core','lib','domain','logic'], 'service'],
    [['models','db','data','persistence','repository','entities'], 'data'],
    [['components','views','pages','ui','layouts','screens'], 'ui'],
    [['middleware','plugins','interceptors','guards'], 'middleware'],
    [['utils','helpers','common','shared','tools'], 'utility'],
    [['config','constants','env','settings'], 'config'],
    [['__tests__','test','tests','spec','specs'], 'test'],
    [['types','interfaces','schemas','contracts','dtos'], 'types'],
    [['hooks'], 'hooks'],
    [['store','state','reducers','actions','slices'], 'state'],
    [['assets','static','public'], 'assets'],
    [['migrations'], 'data'],
    [['providers','provider','context'], 'state'],
    [['templates'], 'documentation'],
    [['docs','documentation','wiki'], 'documentation'],
  ];
  function patternForDir(name) {
    const low = name.toLowerCase();
    for (const [names, label] of dirPatterns) {
      if (names.includes(low)) return label;
    }
    return null;
  }
  const patternMatches = {};
  for (const g of Object.keys(directoryGroups)) {
    const p = patternForDir(g);
    if (p) patternMatches[g] = p;
  }

  // file-level pattern signals
  const filePatternMatches = {};
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const base = fp.split('/').pop();
    if (/\.(test|spec)\./.test(base) || /_test\.|_spec\./.test(base)) filePatternMatches[n.id] = 'test';
    else if (/\.d\.ts$/.test(base)) filePatternMatches[n.id] = 'types';
    else if (/\.(md|rst)$/.test(base)) filePatternMatches[n.id] = 'documentation';
    else if (/\.html?$/.test(base)) filePatternMatches[n.id] = 'documentation';
    else if (/\.css$/.test(base)) filePatternMatches[n.id] = 'styling';
    else if (/\.json$/.test(base)) filePatternMatches[n.id] = 'config';
  }

  // ---- H. deployment topology ----
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const base = fp.split('/').pop();
    if (/^Dockerfile/.test(base)) { hasDockerfile = true; infraFiles.push(fp); }
    if (/^docker-compose/.test(base)) { hasCompose = true; infraFiles.push(fp); }
    if (/\.tf$|\.tfvars$/.test(base)) { hasTerraform = true; infraFiles.push(fp); }
    if (/workflows\//.test(fp) || /\.gitlab-ci\.yml$/.test(base) || /Jenkinsfile/.test(base)) { hasCI = true; infraFiles.push(fp); }
    if (/k8s|kubernetes|helm/.test(fp)) { hasK8s = true; infraFiles.push(fp); }
  }
  const deploymentTopology = { hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI, infraFiles };

  // ---- I. data pipeline ----
  const schemaFiles = [], migrationFiles = [], dataModelFiles = [], apiHandlerFiles = [];
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const base = fp.split('/').pop();
    const tags = (n.tags || []).join(',');
    if (/\.(sql|graphql|gql|proto)$/.test(base) || /schema/i.test(tags)) schemaFiles.push(fp);
    if (/migrations\//.test(fp)) migrationFiles.push(fp);
    if (/data-model|schema-definition/.test(tags)) dataModelFiles.push(fp);
    if (/api-client|api-handler|data-fetching/.test(tags)) apiHandlerFiles.push(fp);
  }
  const dataPipeline = { schemaFiles, migrationFiles, dataModelFiles, apiHandlerFiles };

  // ---- J. doc coverage ----
  const docGroups = new Set();
  for (const n of fileNodes) {
    if (n.type === 'document') docGroups.add(groupOf(n));
  }
  const totalGroups = Object.keys(directoryGroups).length;
  const undocumentedGroups = Object.keys(directoryGroups).filter(g => !docGroups.has(g));
  const docCoverage = {
    groupsWithDocs: docGroups.size,
    totalGroups,
    coverageRatio: totalGroups ? +(docGroups.size / totalGroups).toFixed(2) : 0,
    undocumentedGroups,
  };

  // ---- K. dependency direction ----
  const pairSeen = new Set();
  const dependencyDirection = [];
  for (const { from, to } of interGroupImports) {
    const key = [from, to].sort().join('::');
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    const fwd = interMap[from + '->' + to] || 0;
    const bwd = interMap[to + '->' + from] || 0;
    if (fwd >= bwd) dependencyDirection.push({ dependent: from, dependsOn: to });
    else dependencyDirection.push({ dependent: to, dependsOn: from });
  }

  // ---- stats ----
  const filesPerGroup = {};
  for (const g of Object.keys(directoryGroups)) filesPerGroup[g] = directoryGroups[g].length;
  const nodeTypeCounts = {};
  for (const t of Object.keys(nodeTypeGroups)) nodeTypeCounts[t] = nodeTypeGroups[t].length;

  const result = {
    scriptCompleted: true,
    commonPrefix: commonPrefix.join('/'),
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    filePatternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts,
    },
    fileFanIn: fanIn,
    fileFanOut: fanOut,
    groupImportsFrom: Object.fromEntries(Object.entries(groupImportsFrom).map(([k, v]) => [k, [...v]])),
    groupImportedBy: Object.fromEntries(Object.entries(groupImportedBy).map(([k, v]) => [k, [...v]])),
  };

  fs.writeFileSync(outPath, JSON.stringify(result, null, 1));
  process.exit(0);
}

try { main(); } catch (e) { console.error(e.stack || String(e)); process.exit(1); }
