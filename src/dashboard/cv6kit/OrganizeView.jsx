import React, { useState } from 'react';

/**
 * CV6 kit Organize — projects tree + files list + preview (desktop) or
 * Files/Projects toggle (mobile). Kit-faithful to ui_kits/tools/organize.html.
 *
 * Desktop layout: 3-column (projects tree | file list | markdown preview)
 * Mobile layout: Files/Projects toggle + card list
 *
 * Props:
 *   projects[] = { id, slug, name, color, status?, isShared?, tasks?, children?: [missions] }
 *   files[]    = { id, name, type, updated, size, content? }
 *   selectedProjectId (slug or id)
 *   selectedFileId (file id or name)
 *   onSelectProject(project)
 *   onSelectFile(file)
 *   onBack()
 */

function getMissionIcon(slug) {
  if (!slug) return '▸'
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i)
    hash = hash & hash
  }
  const icons = ['▸', '➤', '➘', '⚡', '◉', '◆', '◈']
  return icons[Math.abs(hash) % icons.length]
}

function getFileIcon(name) {
  if (!name) return 'document'
  const lower = name.toLowerCase()
  if (lower.endsWith('.md')) return 'document'
  if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return 'image'
  if (lower.match(/\.(mp4|mov|mkv)$/i)) return 'video'
  return 'document'
}

function FolderIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color || 'var(--accent)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>
    </svg>
  );
}

function FileIcon({ name }) {
  const icon = getFileIcon(name);
  if (icon === 'image') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="m9 11 2 2 4-4"/>
      </svg>
    );
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <path d="M14 2v6h6"/>
    </svg>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function OrganizeView({
  projects = [],
  files = [],
  selectedProjectId,
  selectedFileId,
  onSelectProject,
  onSelectFile,
  onBack,
  onNew,
}) {
  // Open on Projects when there are no files to show yet (so the screen leads with
  // real data instead of an empty Files tab); Files once a files source is wired.
  const [mobileTab, setMobileTab] = useState(files.length ? 'files' : 'projects'); // 'files' | 'projects'
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectedProject = projects.find(p => p.slug === selectedProjectId || p.id === selectedProjectId);
  const selectedFile = files.find(f => f.id === selectedFileId || f.name === selectedFileId);

  // Mobile view
  if (isNarrow) {
    return (
      <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        {/* status bar + top safe-area */}
        <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {onBack && (
                <button onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Organize</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {selectedProject ? `${selectedProject.name} · ${files.length} files` : 'Select a project'}
                </div>
              </div>
            </div>
            <button onClick={onNew} aria-label="New" style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 11, padding: 4, marginBottom: 18 }}>
            <button
              onClick={() => setMobileTab('files')}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: mobileTab === 'files' ? 'var(--accent)' : 'transparent',
                color: mobileTab === 'files' ? '#fff' : 'var(--muted)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Files
            </button>
            <button
              onClick={() => setMobileTab('projects')}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: mobileTab === 'projects' ? 'var(--accent)' : 'transparent',
                color: mobileTab === 'projects' ? '#fff' : 'var(--muted)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Projects
            </button>
          </div>

          {mobileTab === 'files' && selectedProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
              <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{selectedProject.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6"/>
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 12px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {mobileTab === 'files' ? (
            <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
              {files.length === 0 ? (
                <div style={{ padding: '18px 16px', fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
                  No files. Create one or select a project.
                </div>
              ) : (
                files.map((f, i) => (
                  <div
                    key={f.id || i}
                    onClick={() => onSelectFile && onSelectFile(f)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '0 15px',
                      height: 56,
                      borderBottom: i < files.length - 1 ? '1px solid var(--divider)' : 'none',
                      background: selectedFile?.id === f.id || selectedFile?.name === f.name ? 'var(--accent-weak)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <FileIcon name={f.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                        {[f.updated, f.size && formatFileSize(f.size)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
              {projects.length === 0 ? (
                <div style={{ padding: '18px 16px', fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
                  No projects.
                </div>
              ) : (
                projects.map((p, i) => (
                  <div
                    key={p.id || p.slug || i}
                    onClick={() => onSelectProject && onSelectProject(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '0 15px',
                      height: 56,
                      borderBottom: i < projects.length - 1 ? '1px solid var(--divider)' : 'none',
                      background: selectedProject?.slug === p.slug || selectedProject?.id === p.id ? 'var(--accent-weak)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <FolderIcon color={p.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || p.slug}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {p.tasks?.length || 0} items
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view: 3-column layout
  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* top bar */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 22, padding: '14px 24px', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)', whiteSpace: 'nowrap' }}>Organize</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/>
              <path d="m20 20-3.5-3.5"/>
            </svg>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            P
          </div>
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ display: 'flex', height: 'calc(100% - 66px)' }}>
        {/* tree: projects */}
        <div style={{ width: 280, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 14px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 6px 12px' }}>
            Projects
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {projects.map((p, i) => (
              <div
                key={p.id || p.slug || i}
                onClick={() => onSelectProject && onSelectProject(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px',
                  borderRadius: 8,
                  fontSize: 14,
                  color: selectedProject?.slug === p.slug || selectedProject?.id === p.id ? 'var(--fg)' : 'var(--fg)',
                  background: selectedProject?.slug === p.slug || selectedProject?.id === p.id ? 'var(--surface-2)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: selectedProject?.slug === p.slug || selectedProject?.id === p.id ? 600 : 400,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6"/>
                </svg>
                <FolderIcon color={p.color} />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name || p.slug}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* file list */}
        <div style={{ width: 380, flex: 'none', borderRight: '1px solid var(--divider)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px' }}>
            <span style={{ color: 'var(--fg)', fontWeight: 600, fontSize: 15 }}>
              {selectedProject ? selectedProject.name : 'Files'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--faint)' }}>
              {files.length} files
            </span>
          </div>
          <div style={{ padding: '0 12px' }}>
            {files.length === 0 ? (
              <div style={{ padding: '18px 16px', fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
                No files
              </div>
            ) : (
              files.map((f, i) => (
                <div
                  key={f.id || i}
                  onClick={() => onSelectFile && onSelectFile(f)}
                  className="glassy"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '11px 12px',
                    borderRadius: 9,
                    marginBottom: i < files.length - 1 ? 8 : 0,
                    background: selectedFile?.id === f.id || selectedFile?.name === f.name ? 'var(--accent-weak)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <FileIcon name={f.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
                      {f.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                      {[f.updated, f.size && formatFileSize(f.size)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* preview */}
        <div style={{ flex: 1, minWidth: 0, background: '#0d0d0f', display: 'flex', justifyContent: 'center', padding: '32px 0', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {selectedFile && selectedFile.content ? (
            <div style={{ width: 520, background: '#fbfbfa', borderRadius: 6, boxShadow: '0 12px 40px rgba(0,0,0,.4)', padding: '44px 48px', color: '#1a1a1a' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#999', marginBottom: 18 }}>
                {selectedFile.name}
              </div>
              {selectedFile.preview ? (
                <div dangerouslySetInnerHTML={{ __html: selectedFile.preview }} />
              ) : (
                <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {selectedFile.content}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--faint)', fontSize: 13.5 }}>
              Select a file to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
