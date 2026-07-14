import {
  buildFileRefIdentityMap,
  fileRefFromProjectFileRow,
  fileRefFromUploadRow,
  reviewIdentityEntries,
} from './fileRef.js'

function clean(value) {
  return String(value == null ? '' : value).trim()
}

function uploadMissionKey(missionSlug, projectSlug) {
  const segs = clean(missionSlug).split(':').filter(Boolean)
  if (segs.length && segs[0] === projectSlug) segs.shift()
  return segs[0] || null
}

function missionOf(relPath, projectSlug) {
  const segs = clean(relPath).split('/').filter(Boolean)
  if (projectSlug === 'missions') return segs[0] || null
  return segs[0] === 'missions' && segs[1] ? segs[1] : null
}

function rowTimestamp(row, fileRef) {
  return clean(row?.updated_at || row?.date || fileRef?.updatedAt)
}

function decorateMirrorRow(row, tenantId) {
  const fileRef = row?.file_ref || fileRefFromProjectFileRow(row, { tenantId })
  return {
    ...row,
    file_ref: fileRef,
    health_status: fileRef.health?.status || row?.health_status || 'ready',
  }
}

function decorateUploadRow(row, tenantId) {
  const fileRef = row?.file_ref || fileRefFromUploadRow(row, { tenantId })
  return {
    ...row,
    file_ref: fileRef,
    health_status: fileRef.health?.status || row?.health_status || 'ready',
  }
}

function reviewIdentitySet(fileRef, row = {}) {
  const keys = new Set(reviewIdentityEntries(fileRef))
  for (const v of [row.id, row.path, row.url, row.source_path, row.sourcePath, row.upload_url]) {
    const s = clean(v)
    if (s) keys.add(s)
  }
  return [...keys]
}

function reviewItemId(item) {
  return clean(item?.id || item?.path || item?.reviewId || item?.file_ref?.review?.id)
}

function reviewItemProject(item) {
  return clean(item?.project || item?.whoRaw || item?.file_ref?.project)
}

function reviewItemMission(item) {
  return clean(item?.mission || item?.missionRaw || item?.file_ref?.mission)
}

function normalizeReviewItem(item) {
  const fileRef = item?.file_ref || item?.fileRef || null
  const id = reviewItemId(item)
  return {
    ...item,
    id,
    path: clean(item?.path || id),
    project: reviewItemProject(item),
    mission: reviewItemMission(item),
    last_modified: clean(item?.last_modified || item?.ts || item?.file_ref?.updatedAt),
    file_ref: fileRef || item?.file_ref,
  }
}

function addProjectCount(counts, project, key, n = 1) {
  const slug = clean(project) || '__personal'
  if (!counts.byProject[slug]) counts.byProject[slug] = {
    files: 0,
    uploads: 0,
    needsReview: 0,
    ghosts: 0,
  }
  counts.byProject[slug][key] += n
}

// Backend-owned Files truth snapshot. A file can enter the Files surface from the
// disk mirror, user-upload messages, or the Review queue's waiting set. The same
// FileRef identity pass decorates visible rows and produces badge counts, so the
// count and list cannot drift onto different eligibility rules.
export function buildFilesTruthSnapshot({
  tenantId = '',
  mirrorRows = [],
  uploadRows = [],
  reviewItems = [],
  reviewTotal = null,
} = {}) {
  const tenant = clean(tenantId)
  const mirror = (Array.isArray(mirrorRows) ? mirrorRows : []).map((row) => decorateMirrorRow(row, tenant))
  const uploads = (Array.isArray(uploadRows) ? uploadRows : []).map((row) => decorateUploadRow(row, tenant))
  const waiting = (Array.isArray(reviewItems) ? reviewItems : []).map(normalizeReviewItem).filter((item) => reviewItemId(item))

  const waitingMap = buildFileRefIdentityMap(waiting.map((item) => ({
    id: reviewItemId(item),
    path: item.path,
    source_path: item.source_path,
    ts: clean(item.last_modified || item.ts),
    fileRef: item.file_ref,
  })), (item) => ({
    id: reviewItemId(item),
    ts: clean(item.ts),
  }))
  const joinedReviewIds = new Set()

  const counts = {
    files: 0,
    uploads: 0,
    needsReview: 0,
    ghosts: 0,
    waitingTotal: Number.isFinite(Number(reviewTotal)) ? Number(reviewTotal) : waiting.length,
    byProject: {},
  }

  for (const row of mirror) {
    counts.files += 1
    addProjectCount(counts, row.project, 'files')
    const hit = reviewIdentitySet(row.file_ref, row).map((key) => waitingMap.get(key)).find(Boolean)
    if (hit) {
      row.needs_review = true
      row.review_id = hit.id
      row.review_ts = hit.ts
      joinedReviewIds.add(hit.id)
      counts.needsReview += 1
      addProjectCount(counts, row.project, 'needsReview')
    }
  }

  for (const row of uploads) {
    counts.files += 1
    counts.uploads += 1
    addProjectCount(counts, row.project || '__personal', 'files')
    addProjectCount(counts, row.project || '__personal', 'uploads')
    const hit = reviewIdentitySet(row.file_ref, row).map((key) => waitingMap.get(key)).find(Boolean)
    if (hit) {
      row.needs_review = true
      row.review_id = hit.id
      row.review_ts = hit.ts
      joinedReviewIds.add(hit.id)
      counts.needsReview += 1
      addProjectCount(counts, row.project || '__personal', 'needsReview')
    }
  }

  const ghosts = []
  for (const item of waiting) {
    const id = reviewItemId(item)
    if (!id || joinedReviewIds.has(id)) continue
    const project = reviewItemProject(item) || '__personal'
    const mission = uploadMissionKey(reviewItemMission(item), project) || missionOf(item.file_ref?.path, project)
    const ghost = {
      id,
      name: clean(item.name || item.title) || id.split('/').pop() || 'File',
      path: clean(item.path || id),
      project,
      mission,
      date: clean(item.last_modified || item.ts),
      mime: clean(item.mime || item.file_ref?.mime) || null,
      size: item.size ?? item.file_ref?.sizeBytes ?? null,
      needs_review: true,
      review_id: id,
      review_ts: clean(item.last_modified || item.ts),
      ghost: true,
      file_ref: item.file_ref || null,
    }
    ghosts.push(ghost)
    counts.needsReview += 1
    counts.ghosts += 1
    addProjectCount(counts, project, 'needsReview')
    addProjectCount(counts, project, 'ghosts')
  }

  return {
    contract: 'corner.files_truth.v1',
    tenantId: tenant,
    files: mirror,
    uploads,
    ghosts,
    reviewItems: waiting,
    counts,
    visibleCount: counts.files,
  }
}
