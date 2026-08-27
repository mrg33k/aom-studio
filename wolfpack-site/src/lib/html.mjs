export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

const assetVersions = new Map()

export function setAssetVersion(filePath, version) {
  assetVersions.set(String(filePath).replace(/^\/+/, ''), version)
}

export function asset(filePath = '') {
  const clean = String(filePath).replace(/^\/+/, '')
  const version = assetVersions.get(clean)
  return `/assets/${clean}${version ? `?v=${version}` : ''}`
}
