import React, { useState, useMemo } from 'react';

/**
 * CV6 kit Organize — mobile file browse, multi-select, move-to-folder, and view/review.
 * Pixel-faithful to ui_kits/tools/organize.html MOBILE A/B/C.
 *
 * Three states:
 *   1. Browse/organize: project breadcrumb + file list with multi-select + bottom action bar
 *   2. Move-to-folder: bottom sheet with destination picker
 *   3. View/review: file preview (text/markdown) with Open in Review, comment, move buttons
 *
 * Props:
 *   projects[] = { id, slug, name, color, tasks? }
 *   files[]    = { id, name, type, updated, size, content? }
 *   selectedProjectId
 *   selectedFileIds[] = file ids currently checked
 *   onSelectFile(file, checked)
 *   onSelectProject(project)
 *   onBack()
 *   onMove?(fileIds, destinationId)
 *   onRename?(fileIds)
 *   onShare?(fileIds)
 *   onDelete?(fileIds)
 *   activityAgent? = { name, action, status, progress, isLive }
 */

function FolderIcon({ color = 'var(--accent)', stroke = 2 }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>
    </svg>
  );
}

function FileIcon({ name, isChecked = false }) {
  // Image icon
  if (name?.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={isChecked ? 'var(--accent)' : 'var(--muted)'} strokeWidth={isChecked ? 1.9 : 1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.6"/>
        <path d="m21 15-5-5L5 21"/>
      </svg>
    );
  }
  // Default document icon
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={isChecked ? 'var(--accent)' : 'var(--muted)'} strokeWidth={isChecked ? 1.9 : 1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <path d="M14 2v6h6"/>
      <path d="M9 13h6M9 17h4"/>
    </svg>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      style={{
        width: 21,
        height: 21,
        borderRadius: 7,
        border: `2px solid ${checked ? 'var(--accent)' : 'var(--hair)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        cursor: 'pointer',
      }}
    >
      {checked && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 7"/>
        </svg>
      )}
    </span>
  );
}

function MoveToSheet({ projects = [], selectedProjectId, files = [], onClose, onMove }) {
  const selectedFiles = files.slice(0, 1); // Show first selected file
  const currentProject = projects.find(p => p.slug === selectedProjectId || p.id === selectedProjectId);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(4, 6, 9, 0.55)',
          zIndex: 100,
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--surface)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderTop: '1px solid var(--hair)',
        boxShadow: '0 -18px 50px -12px rgba(0,0,0,.6)',
        padding: '10px 0 16px',
        zIndex: 101,
      }}>
        {/* Handle */}
        <div style={{
          width: 38,
          height: 4,
          borderRadius: 2,
          background: 'var(--hair)',
          margin: '0 auto 14px',
        }} />

        {/* Title + close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px 12px',
        }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>
            Move to…
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6 6 18"/>
            </svg>
          </button>
        </div>

        {/* Moving file display */}
        {selectedFiles.length > 0 && (
          <div style={{
            margin: '0 16px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '11px 13px',
            border: '1px solid var(--accent-weak)',
            background: 'var(--accent-weak)',
            borderRadius: 13,
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
              <path d="M14 2v6h6"/>
              <path d="M9 13h6M9 17h4"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
                {selectedFiles[0].name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                from {currentProject?.name} · {currentProject?.id}
              </div>
            </div>
          </div>
        )}

        {/* Choose destination */}
        <div style={{ margin: '0 18px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.1 }}>
          Choose destination
        </div>
        <div style={{ padding: '0 12px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {projects.map((proj, idx) => (
            <div
              key={proj.id || idx}
              onClick={() => onMove(proj.id || proj.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px',
                height: 54,
                borderRadius: 11,
                background: proj.slug === selectedProjectId ? 'var(--accent-weak)' : 'transparent',
                cursor: 'pointer',
                marginBottom: idx < projects.length - 1 ? 4 : 0,
              }}
            >
              <FolderIcon
                color={proj.slug === selectedProjectId ? 'var(--accent)' : 'var(--muted)'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: proj.slug === selectedProjectId ? 600 : 500, color: 'var(--fg)' }}>
                  {proj.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {proj.slug === selectedProjectId ? `${proj.slug || proj.id} · Dashboard` : proj.slug || proj.id}
                </div>
              </div>
              <span style={{
                width: 21,
                height: 21,
                borderRadius: '50%',
                border: `2px solid ${proj.slug === selectedProjectId ? 'var(--accent)' : 'var(--hair)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}>
                {proj.slug === selectedProjectId && (
                  <span style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </span>
            </div>
          ))}

          {/* New folder */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 12px',
            height: 54,
            borderRadius: 11,
            color: 'var(--accent)',
            cursor: 'pointer',
            marginTop: 4,
          }}>
            <span style={{
              width: 19,
              height: 19,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              New folder…
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              flex: 'none',
              width: 104,
              height: 48,
              borderRadius: 13,
              border: '1px solid var(--hair)',
              background: 'var(--surface-2)',
              color: 'var(--fg)',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onMove(selectedProjectId)}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 13,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2"/>
              <path d="M13 17h8M18 14l3 3-3 3"/>
            </svg>
            Move to {selectedProject?.name || 'folder'}
          </button>
        </div>
      </div>
    </>
  );
}

function FilePreviewScreen({ file, projectName, onBack, onMove }) {
  if (!file) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--ground)',
      }}>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
          File not found
        </div>
      </div>
    );
  }

  // Simple markdown/text rendering
  const content = file.content || '';

  return (
    <div data-cv6kit data-theme="glass" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: 'var(--ground)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--fg)',
      overflow: 'hidden',
    }}>
      {/* Status bar */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 12px',
        fontSize: 15,
        fontWeight: 600,
      }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          {file.size && file.size > 1000 ? (file.size / 1024).toFixed(1) + ' KB' : file.size + ' B'}
        </span>
      </div>

      {/* Header */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 12px 16px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <button
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flex: 'none',
            marginLeft: -2,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
            {file.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {projectName}
          </div>
        </div>
        <button style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: 'none',
          background: 'transparent',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flex: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--faint)">
            <circle cx="12" cy="5" r="1.7"/>
            <circle cx="12" cy="12" r="1.7"/>
            <circle cx="12" cy="19" r="1.7"/>
          </svg>
        </button>
      </div>

      {/* File meta */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid var(--divider)',
        fontSize: 12,
        color: 'var(--muted)',
      }}>
        <span style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--success-weak)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          flex: 'none',
        }}>
          EL
        </span>
        <span style={{ flex: 1 }}>Edited by Elon · 34m ago</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>
            <circle cx="12" cy="12" r="2.6"/>
          </svg>
          Ready
        </span>
      </div>

      {/* Preview */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: 16,
      }}>
        <div style={{
          background: '#fbfbfa',
          borderRadius: 8,
          height: '100%',
          boxShadow: '0 12px 36px rgba(0,0,0,.4)',
          padding: '24px 22px',
          color: '#1a1a1a',
          overflowY: 'auto',
          fontFamily: 'var(--font-sans)',
          fontSize: 13.5,
          lineHeight: 1.6,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#999', marginBottom: 14 }}>
            {file.name}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{
        flex: 'none',
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 78,
        borderTop: '1px solid var(--divider)',
        background: 'var(--ground)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px calc(16px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}>
        <button style={{
          flex: 1,
          height: 48,
          borderRadius: 13,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>
            <circle cx="12" cy="12" r="2.6"/>
          </svg>
          Open in Review
        </button>
        <button style={{
          width: 48,
          height: 48,
          borderRadius: 13,
          border: '1px solid var(--hair)',
          background: 'var(--surface-2)',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>
          </svg>
        </button>
        <button
          onClick={onMove}
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            border: '1px solid var(--hair)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            cursor: 'pointer',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2"/>
            <path d="M13 17h8M18 14l3 3-3 3"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function OrganizeView({
  projects = [],
  files = [],
  selectedProjectId,
  selectedFileIds = [],
  onSelectFile,
  onSelectProject,
  onBack,
  activityAgent,
  onMove,
  onRename,
  onShare,
  onDelete,
}) {
  const selectedProject = projects.find(p => p.slug === selectedProjectId || p.id === selectedProjectId);
  const fileCount = selectedFileIds.length;
  const totalFiles = files.length;

  // UI state
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  const [previewFileId, setPreviewFileId] = useState(null);

  const previewFile = useMemo(() =>
    files.find(f => f.id === previewFileId),
    [files, previewFileId]
  );

  // If viewing a file, show the preview screen
  if (previewFileId) {
    return <FilePreviewScreen
      file={previewFile}
      projectName={selectedProject?.name}
      onBack={() => setPreviewFileId(null)}
      onMove={() => setShowMoveSheet(true)}
    />;
  }

  return (
    <div data-cv6kit data-theme="glass" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      background: 'var(--ground)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--fg)',
      overflow: 'hidden',
    }}>
      {/* status bar */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 12px',
        fontSize: 15,
        fontWeight: 600,
      }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>Corner</span>
      </div>

      {/* header */}
      <div style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 12px 16px',
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flex: 'none',
              marginLeft: -2,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
            {selectedProject?.name || 'Dashboard'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {totalFiles} files · 1 folder
          </div>
        </div>
        <button style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: 'none',
          background: 'var(--surface)',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flex: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="m20 20-3.5-3.5"/>
          </svg>
        </button>
        <button style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: 'none',
          background: 'var(--surface)',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flex: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M6 12h12M9 18h6"/>
          </svg>
        </button>
      </div>

      {/* activity dock (floating) */}
      {activityAgent && (
        <div style={{
          position: 'absolute',
          top: 120,
          left: 16,
          right: 16,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          borderRadius: 13,
          background: 'var(--surface)',
          border: '1px solid var(--divider)',
          boxShadow: '0 12px 32px rgba(0,0,0,.3)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent-weak)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 1.05s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.2-8.6"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {activityAgent.name} · {activityAgent.action}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {activityAgent.status}
            </div>
          </div>
          <button style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: 'none',
            background: 'rgba(255,255,255,.07)',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            cursor: 'pointer',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 15 6-6 6 6"/>
            </svg>
          </button>
          {activityAgent.isLive && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--accent-weak)',
              padding: '3px 8px',
              borderRadius: 8,
              flex: 'none',
            }}>
              LIVE
            </span>
          )}
        </div>
      )}

      {/* breadcrumb + tabs */}
      <div style={{
        flex: 'none',
        padding: '12px 16px 14px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--muted)',
          marginBottom: 12,
        }}>
          <span>Corner</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <button style={{
            height: 30,
            padding: '0 13px',
            borderRadius: 15,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}>
            All {totalFiles}
          </button>
          <button style={{
            height: 30,
            padding: '0 13px',
            borderRadius: 15,
            border: '1px solid var(--hair)',
            background: 'transparent',
            color: 'var(--muted)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}>
            Docs
          </button>
          <button style={{
            height: 30,
            padding: '0 13px',
            borderRadius: 15,
            border: '1px solid var(--hair)',
            background: 'transparent',
            color: 'var(--muted)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}>
            Images
          </button>
          <span style={{
            marginLeft: 'auto',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--accent)',
          }}>
            Done
          </span>
        </div>
      </div>

      {/* files list */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '12px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--hair)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* folder row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 14px',
            height: 58,
            borderBottom: '1px solid var(--divider)',
            cursor: 'pointer',
          }}
          onClick={() => onSelectProject && selectedProject && onSelectProject(selectedProject)}>
            <Checkbox checked={false} onChange={() => {}} />
            <FolderIcon color="var(--accent)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>cv6</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{totalFiles} files</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>

          {/* file rows */}
          {files.map((f, i) => {
            const isChecked = selectedFileIds?.includes(f.id) || selectedFileIds?.includes(f.name);
            return (
              <div
                key={f.id || i}
                onClick={() => {
                  // Checkbox or menu button: toggle selection
                  // Filename click: preview the file
                  setPreviewFileId(f.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 14px',
                  height: 58,
                  borderBottom: i < files.length - 1 ? '1px solid var(--divider)' : 'none',
                  background: isChecked ? 'var(--accent-weak)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Checkbox checked={isChecked} onChange={(val) => onSelectFile && onSelectFile(f, val)} />
                <FileIcon name={f.name} isChecked={isChecked} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                    {f.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>
                    {[f.updated, f.size].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Menu button: just toggle selection for now
                    onSelectFile && onSelectFile(f, !isChecked);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--faint)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--faint)">
                    <circle cx="12" cy="5" r="1.7"/>
                    <circle cx="12" cy="12" r="1.7"/>
                    <circle cx="12" cy="19" r="1.7"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom action bar (when files selected) */}
      {fileCount > 0 && (
        <div style={{
          flex: 'none',
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 82,
          borderTop: '1px solid var(--divider)',
          background: 'var(--ground)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
            {fileCount} selected
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 18 }}>
            <button
              onClick={() => {
                setShowMoveSheet(true);
                onMove && onMove(selectedFileIds, null);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2"/>
                <path d="M13 17h8M18 14l3 3-3 3"/>
              </svg>
              Move
            </button>
            <button
              onClick={() => onRename && onRename(selectedFileIds)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              Rename
            </button>
            <button
              onClick={() => onShare && onShare(selectedFileIds)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13"/>
                <path d="m8 7 4-4 4 4"/>
                <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>
              </svg>
              Share
            </button>
            <button
              onClick={() => onDelete && onDelete(selectedFileIds)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M18 6l-1 14H7L6 6"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Move-to-folder sheet (bottom modal) */}
      {showMoveSheet && (
        <MoveToSheet
          projects={projects}
          selectedProjectId={selectedProjectId}
          files={files.filter(f => selectedFileIds?.includes(f.id))}
          onClose={() => setShowMoveSheet(false)}
          onMove={(destinationId) => {
            onMove && onMove(selectedFileIds, destinationId);
            setShowMoveSheet(false);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
