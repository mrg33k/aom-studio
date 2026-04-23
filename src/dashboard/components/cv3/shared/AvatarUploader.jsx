// AvatarUploader -- R64 (session 20). Click-to-upload avatar used on the
// agent info screen (AgentProfileOverlay) and the project info screen
// (ProjectSettingsModal). File stays client-side as a data-URL and is
// persisted per-(world, kind, slug) in localStorage.
//
// R64-persist (deferred sub-round): move storage to a DB column
// (agent_status.avatar_url + projects.avatar_url). Today's slice proves
// the UX without requiring a DDL migration this session; the column
// add + /api/dashboard/upload-avatar endpoint + storage bucket writes
// land in the follow-up.
//
// Testid contract:
//   [data-testid="avatar-uploader-<kind>-<slug>"]   on the wrapper
//   [data-testid="avatar-uploader-input-<kind>-<slug>"] on the <input type=file>
//   [data-testid="avatar-image"] on the rendered <img> (only when a URL is set)
import { useEffect, useRef, useState } from 'react'

const KEY = (world, kind, slug) => `aom_avatar_${world || 'default'}_${kind}_${slug}`

export function readAvatarUrl(world, kind, slug) {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(KEY(world, kind, slug)) || null } catch { return null }
}

export default function AvatarUploader({
  world,
  kind, // 'agent' | 'project'
  slug,
  fallback,           // JSX rendered when no avatar (e.g. the letter circle)
  size = 40,
  onChange,
}) {
  const [url, setUrl] = useState(() => readAvatarUrl(world, kind, slug))
  const inputRef = useRef(null)

  useEffect(() => {
    setUrl(readAvatarUrl(world, kind, slug))
  }, [world, kind, slug])

  const handlePick = () => inputRef.current?.click()
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return
      try { localStorage.setItem(KEY(world, kind, slug), dataUrl) } catch {}
      setUrl(dataUrl)
      onChange?.(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      data-testid={`avatar-uploader-${kind}-${slug}`}
      onClick={handlePick}
      title="Click to change profile picture"
      role="button"
      tabIndex={0}
      style={{
        width: size, height: size, borderRadius: '50%',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {url ? (
        <img
          data-testid="avatar-image"
          src={url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        fallback
      )}
      <input
        ref={inputRef}
        data-testid={`avatar-uploader-input-${kind}-${slug}`}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}
