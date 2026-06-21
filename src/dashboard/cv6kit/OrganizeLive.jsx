import { useState, useEffect, useMemo } from 'react';
import { OrganizeView } from './OrganizeView';

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
    updated: f.dateFormatted || '',
    size,
    content: f.content || '',
  };
}

export function OrganizeLive({ projectRooms = [], onBack }) {
  const projects = useMemo(() => (projectRooms || []).map(mapProject), [projectRooms]);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.slug);
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Keep a valid project selected as the list settles.
  useEffect(() => {
    if (!selectedProjectId && projects[0]?.slug) setSelectedProjectId(projects[0].slug);
  }, [projects, selectedProjectId]);

  // Fetch the selected project's files (real). Content rides along for the preview.
  useEffect(() => {
    if (!selectedProjectId) { setFiles([]); return; }
    let alive = true;
    fetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(selectedProjectId)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) { const mapped = (d.files || []).map(mapFile); setFiles(mapped); setSelectedFileId(mapped[0]?.id || null); } })
      .catch(() => { if (alive) { setFiles([]); setSelectedFileId(null); } });
    return () => { alive = false; };
  }, [selectedProjectId]);

  return (
    <OrganizeView
      projects={projects}
      files={files}
      selectedProjectId={selectedProjectId}
      selectedFileId={selectedFileId}
      onSelectProject={(proj) => { setSelectedProjectId(proj.slug || proj.id); setSelectedFileId(null); }}
      onSelectFile={(file) => setSelectedFileId(file.id)}
      onBack={onBack}
    />
  );
}
