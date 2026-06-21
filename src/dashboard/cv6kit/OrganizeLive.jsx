import { useState, useEffect, useMemo } from 'react';
import { OrganizeView } from './OrganizeView';
import { authFetch } from '../lib/authFetch.js';

/**
 * OrganizeLive — wires the Claude-design Organize screen (OrganizeView) to REAL data:
 * the user's project rooms (projects) and, for the selected project, its text files
 * (GET /api/dashboard/files?type=text&client=<slug> — same call the chat files drawer
 * uses). The list response already carries each file's content, so the preview needs
 * no extra fetch. Read-only browse: selecting a project shows its files; selecting a
 * file shows its preview. onBack returns home.
 */

function mapProject(p) {
  return {
    id: p.slug,
    slug: p.slug,
    name: p.name || p.slug,
    color: p.color,
    status: p.status,
    tasks: p.tasks || [],
  };
}

function mapFile(f) {
  const name = f.filename || f.title || f.slug || 'file';
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  const size = f.size || (f.content ? new Blob([f.content]).size : 0);
  return {
    id: f.id,
    name,
    type: ext,
    updated: f.dateFormatted || f.updated_at || f.created_at || '',
    size,
    content: f.content || '',
    // The endpoint tags each scaffold with its own project as client_id (legacy
    // rows may use project/project_slug). We filter on this client-side.
    project: f.client_id || f.project || f.project_slug || null,
  };
}

export function OrganizeLive({ projectRooms = [], worldId = 'aom', onBack }) {
  const projects = useMemo(() => (projectRooms || []).map(mapProject), [projectRooms]);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.slug);
  const [allFiles, setAllFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Keep a valid project selected as the list settles.
  useEffect(() => {
    if (!selectedProjectId && projects[0]?.slug) setSelectedProjectId(projects[0].slug);
  }, [projects, selectedProjectId]);

  // Fetch the WHOLE world's text/scaffold files once. The endpoint is world-scoped
  // (client=<world>) and tags each file with its own project; passing a project
  // slug as `client` returns nothing, which is why Organize showed no files. We
  // authFetch (the call needs the user JWT) and filter to the selected project below.
  useEffect(() => {
    let alive = true;
    authFetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(worldId || 'aom')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAllFiles((((d && d.files)) || []).map(mapFile)); })
      .catch(() => { if (alive) setAllFiles([]); });
    return () => { alive = false; };
  }, [worldId]);

  // The selected project's files (real). Content rides along for the preview.
  const files = useMemo(
    () => allFiles.filter((f) => !selectedProjectId || f.project === selectedProjectId),
    [allFiles, selectedProjectId]
  );

  return (
    <OrganizeView
      projects={projects}
      files={files}
      selectedProjectId={selectedProjectId}
      selectedFileIds={selectedFileIds}
      onSelectFile={(file, checked) => {
        if (checked) {
          setSelectedFileIds([...selectedFileIds, file.id]);
        } else {
          setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
        }
      }}
      onSelectProject={(proj) => { setSelectedProjectId(proj.slug || proj.id); setSelectedFileIds([]); }}
      onBack={onBack}
      onMove={(fileIds, destinationId) => {
        console.warn('[OrganizeLive] onMove not yet wired to backend:', { fileIds, destinationId });
        // TODO: wire to /api/dashboard/files/move or similar
      }}
      onRename={(fileIds) => {
        console.warn('[OrganizeLive] onRename not yet wired to backend:', { fileIds });
        // TODO: wire to rename endpoint
      }}
      onShare={(fileIds) => {
        console.warn('[OrganizeLive] onShare not yet wired to backend:', { fileIds });
        // TODO: wire to share endpoint
      }}
      onDelete={(fileIds) => {
        console.warn('[OrganizeLive] onDelete not yet wired to backend:', { fileIds });
        // TODO: wire to delete endpoint
      }}
    />
  );
}
