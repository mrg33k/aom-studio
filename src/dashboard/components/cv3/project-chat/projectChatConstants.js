// Shared helpers for the project-chat files panel. Extracted from
// ProjectChatView verbatim during R2d so the shell + FilesPanel + anything
// else that needs them stays mechanical.

export const formatFileSize = (bytes) => {
  const value = Number(bytes)
 if (!Number.isFinite(value) || value <= 0) return '·'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value >= 1024 * 100 ? 0 : 1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value >= 1024 * 1024 * 100 ? 0 : 1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export const getFileMeta = (file) => {
  const rawName = file?.filename || file?.name || file?.path || 'Unnamed file'
  const extension = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : ''
  const mimeType = file?.mime_type || file?.file_mime_type || ''
  const size = file?.size_bytes ?? file?.size ?? file?.metadata?.size ?? file?.file_size

  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(extension)) {
    return { name: rawName, size, icon: '🖼️' }
  }
  if (mimeType.includes('pdf') || extension === 'pdf') {
    return { name: rawName, size, icon: '📕' }
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm', 'm4v'].includes(extension)) {
    return { name: rawName, size, icon: '🎬' }
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac'].includes(extension)) {
    return { name: rawName, size, icon: '🎵' }
  }
  if (['fig', 'sketch', 'xd', 'psd', 'ai'].includes(extension)) {
    return { name: rawName, size, icon: '🎨' }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return { name: rawName, size, icon: '🗜️' }
  }
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(extension)) {
    return { name: rawName, size, icon: '📝' }
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return { name: rawName, size, icon: '📊' }
  }

  return { name: rawName, size, icon: '📄' }
}