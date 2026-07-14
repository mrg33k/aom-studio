const TYPE_MAP = {
  image: { key: 'image', label: 'Image', color: '#8B5CF6' },
  video: { key: 'video', label: 'Video', color: '#EC4899' },
  audio: { key: 'audio', label: 'Audio', color: '#14B8A6' },
  doc: { key: 'doc', label: 'Document', color: '#0066FF' },
  copy: { key: 'copy', label: 'Copy', color: '#F59E0B' },
  code: { key: 'code', label: 'Code', color: '#10B981' },
  sheet: { key: 'sheet', label: 'Spreadsheet', color: '#22C55E' },
  link: { key: 'link', label: 'Link', color: '#38BDF8' },
  sitelive: { key: 'sitelive', label: 'Live site', color: '#38BDF8' },
}

const EXT_KIND = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.heic', '.tiff', '.bmp'],
  video: ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'],
  audio: ['.wav', '.mp3', '.aac', '.m4a', '.ogg', '.flac', '.aiff', '.opus'],
  doc: ['.pdf', '.docx', '.doc', '.pptx', '.ppt'],
  sheet: ['.csv', '.xlsx', '.xls', '.tsv'],
  copy: ['.md', '.txt', '.json', '.jsonl', '.ndjson', '.yaml', '.yml', '.toml', '.xml', '.ini', '.log'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java'],
}

function clean(value) {
  return String(value == null ? '' : value).trim()
}

function basename(value) {
  const s = clean(value).split('?')[0].replace(/\/+$/, '')
  try { return decodeURIComponent(s.split('/').pop() || '') } catch { return s.split('/').pop() || '' }
}

function extOf(name) {
  const m = clean(name).toLowerCase().match(/(\.[a-z0-9]+)$/)
  return m ? m[1] : ''
}

export function fileKindFromNameMime(name, mime, url = '') {
  const ext = extOf(name || basename(url))
  for (const [kind, exts] of Object.entries(EXT_KIND)) {
    if (exts.includes(ext)) return kind
  }
  const m = clean(mime).toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m === 'application/pdf') return 'doc'
  if (/^https?:\/\//i.test(clean(url || name)) && !ext) return 'sitelive'
  return 'doc'
}

export function fileTypeDescriptor(kind) {
  return TYPE_MAP[kind] || TYPE_MAP.doc
}

export function cornerStorageKeyFromProjectFile(row, tenantId) {
  if (!row || !row.project || !row.name || !tenantId) return ''
  const ref = clean(row.storage_ref)
  if (ref.startsWith('ea://')) return ref.slice(5)
  const rel = row.rel_path ? `${row.rel_path}/` : ''
  const root = row.project === 'missions' ? 'missions' : `projects/${row.project}`
  return `corner/users/${tenantId}/${root}/${rel}${row.name}`
}

export function reviewIdentityEntries(fileRef) {
  const ref = fileRef || {}
  const ids = []
  const push = (v) => {
    const s = clean(v)
    if (s && !ids.includes(s)) ids.push(s)
  }
  push(ref.review?.id)
  push(ref.url)
  push(ref.storageKey)
  push(ref.path)
  push(ref.sourcePath)
  const sourcePath = clean(ref.sourcePath)
  const ix = sourcePath.indexOf('corner/')
  if (ix >= 0) push(sourcePath.slice(ix))
  return ids
}

export function createFileRef(input = {}) {
  const storageKey = clean(input.storageKey || input.storage_key || input.sourcePath || input.source_path || input.path)
  const url = clean(input.url || input.publicUrl || input.public_url)
  const name = clean(input.name || input.filename || basename(url || storageKey || input.path)) || 'File'
  const mime = clean(input.mime || input.contentType || input.content_type)
  const sizeBytes = Number.isFinite(Number(input.sizeBytes ?? input.size ?? input.file_size))
    ? Number(input.sizeBytes ?? input.size ?? input.file_size)
    : null
  const rawKind = clean(input.kind)
  const kind = TYPE_MAP[rawKind] ? rawKind : fileKindFromNameMime(name, mime, url || storageKey)
  const updatedAt = clean(input.updatedAt || input.updated_at || input.last_modified || input.date || input.timestamp)
  const tenantId = clean(input.tenantId || input.tenant_id || input.clientId || input.client_id || input.world || input.world_id)
  const sourcePath = clean(input.sourcePath || input.source_path || storageKey)
  const reviewId = clean(input.reviewId || input.review_id || url || storageKey || input.path || input.id)
  const healthStatus = clean(input.healthStatus || input.status) || (reviewId ? 'ready' : 'missing')
  const fileRef = {
    contract: 'corner.file_ref.v1',
    id: clean(input.id || input.recordId || input.record_id || reviewId),
    tenantId,
    project: clean(input.project || input.project_slug),
    mission: clean(input.mission || input.mission_slug),
    agent: clean(input.agent || input.agent_slug),
    source: clean(input.source || input.source_kind || input.sourceKind || 'file'),
    sourceKind: clean(input.sourceKind || input.source_kind || input.source || 'file'),
    record: {
      table: clean(input.table || input.recordTable || input.record_table),
      id: clean(input.recordId || input.record_id || input.id),
    },
    storageKey,
    path: clean(input.path || storageKey || url),
    url,
    previewUrl: clean(input.previewUrl || input.preview_url || url),
    name,
    mime: mime || null,
    sizeBytes,
    kind,
    type: fileTypeDescriptor(kind),
    sourcePath: sourcePath || null,
    sha256: clean(input.sha256) || null,
    updatedAt: updatedAt || null,
    health: {
      status: healthStatus,
      label: healthStatus.toUpperCase(),
      reason: clean(input.healthReason || input.health_reason),
    },
    review: {
      id: reviewId,
      sourcePath: sourcePath || null,
      sha256: clean(input.sha256) || null,
      eligible: input.reviewEligible !== false,
      status: clean(input.reviewStatus || input.review_status || healthStatus),
      decisionId: clean(input.decisionId || input.decision_id),
    },
  }
  fileRef.identities = reviewIdentityEntries(fileRef)
  return fileRef
}

export function fileRefFromChatAttachment({ attachment = {}, message = {}, sourceKind = 'upload', tenantId = '' } = {}) {
  const meta = message?.metadata && typeof message.metadata === 'object' ? message.metadata : {}
  const url = clean(attachment.url || attachment.path)
  return createFileRef({
    id: url,
    tenantId: tenantId || message.client_id,
    table: 'messages',
    recordId: message.id,
    source: sourceKind,
    sourceKind,
    url,
    path: url,
    name: attachment.name,
    mime: attachment.mime,
    sizeBytes: attachment.size,
    project: message.project || meta.project_slug,
    mission: meta.mission_slug,
    agent: meta.agent_slug,
    sourcePath: attachment.source_path || meta.source_path || url,
    sha256: attachment.sha256,
    updatedAt: message.timestamp,
    reviewStatus: sourceKind === 'handoff' ? 'waiting' : 'available',
  })
}

export function fileRefFromProjectFileRow(row = {}, { tenantId = '' } = {}) {
  const storageKey = cornerStorageKeyFromProjectFile(row, tenantId)
  return createFileRef({
    id: row.id,
    tenantId,
    table: 'project_files',
    recordId: row.id,
    source: 'mirror',
    sourceKind: 'mirror',
    storageKey,
    path: storageKey || row.path,
    name: row.name,
    mime: row.mime,
    sizeBytes: row.size,
    kind: row.kind,
    project: row.project,
    mission: row.mission,
    sourcePath: storageKey,
    updatedAt: row.updated_at || row.last_modified,
  })
}

export function fileRefFromUploadRow(row = {}, { tenantId = '' } = {}) {
  return createFileRef({
    id: row.id || row.url,
    tenantId,
    source: 'upload',
    sourceKind: 'upload',
    url: row.url,
    path: row.url || row.path,
    name: row.name,
    mime: row.mime,
    sizeBytes: row.size,
    project: row.project,
    mission: row.mission,
    agent: row.agent,
    updatedAt: row.date || row.updated_at,
    reviewStatus: 'available',
  })
}

export function fileRefToReviewQueueItem(fileRef, extra = {}) {
  const ref = fileRef || createFileRef({})
  return {
    name: ref.name,
    path: ref.review.id || ref.path,
    project: ref.project || '',
    mission: ref.mission || null,
    kind: 'deliverable',
    type: ref.type,
    mime: ref.mime || null,
    size: ref.sizeBytes,
    source_kind: ref.sourceKind || ref.source,
    source_path: ref.sourcePath || null,
    sha256: ref.sha256 || null,
    last_modified: ref.updatedAt,
    health_status: ref.health.status,
    file_ref: ref,
    ...extra,
  }
}

export function buildFileRefIdentityMap(items, valueFor) {
  const map = new Map()
  for (const item of items || []) {
    const value = typeof valueFor === 'function' ? valueFor(item) : valueFor
    const ref = item?.fileRef || item?.file_ref || item?.fileRefCompat || null
    const keys = ref ? reviewIdentityEntries(ref) : []
    if (item?.id) keys.push(item.id)
    if (item?.path) keys.push(item.path)
    if (item?.sourcePath) keys.push(item.sourcePath)
    if (item?.source_path) keys.push(item.source_path)
    const sourcePath = clean(item?.sourcePath || item?.source_path)
    const ix = sourcePath.indexOf('corner/')
    if (ix >= 0) keys.push(sourcePath.slice(ix))
    for (const key of keys) {
      const cleanKey = clean(key)
      if (cleanKey && !map.has(cleanKey)) map.set(cleanKey, value)
    }
  }
  return map
}
