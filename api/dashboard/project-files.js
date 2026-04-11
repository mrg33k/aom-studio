// GET /api/dashboard/project-files?project=project-name
//
// Lists files in a project directory from AOM-EA/projects/
// Returns array of file objects with name, type, size properties.
//
// Example response:
// {
//   files: [
//     { name: "README.md", type: "file", size: 1234 },
//     { name: "src", type: "directory", size: 0 },
//     { name: "package.json", type: "file", size: 567 }
//   ],
//   project: "project-name",
//   path: "/full/path/to/project"
// }

import fs from 'fs';
import path from 'path';

// Base path to AOM-EA projects directory
const AOM_EA_PATH = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const PROJECTS_PATH = path.join(AOM_EA_PATH, 'projects');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { project } = req.query;
  
  if (!project) {
    return res.status(400).json({ error: 'project query parameter required' });
  }

  // Sanitize project name to prevent directory traversal
  const sanitizedProject = project.replace(/[^a-zA-Z0-9\-_]/g, '');
  const projectPath = path.join(PROJECTS_PATH, sanitizedProject);

  try {
    // Check if project directory exists
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: `Project '${sanitizedProject}' not found` });
    }

    // Read directory contents
    const files = fs.readdirSync(projectPath);
    
    // Get file stats and format response
    const fileList = files.map(filename => {
      const filePath = path.join(projectPath, filename);
      try {
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.isDirectory() ? 0 : stats.size
        };
      } catch (err) {
        // If we can't stat the file, return basic info
        return {
          name: filename,
          type: 'unknown',
          size: 0
        };
      }
    });

    // Sort: directories first, then files, both alphabetically
    fileList.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({
      files: fileList,
      project: sanitizedProject,
      path: projectPath,
      count: fileList.length
    });

  } catch (error) {
    console.error('Error reading project files:', error);
    return res.status(500).json({ error: 'Failed to read project files', details: error.message });
  }
}