import { useState, useEffect } from 'react'
import { authFetch } from '../../../lib/authFetch.js'

// Fetches files for the current project when the files drawer opens.
// Refetches when an upload completes (uploading transitions).
export default function useProjectChatFiles({ filesOpen, selectedProject, uploading }) {
  const [projectFiles, setProjectFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)

  useEffect(() => {
    if (filesOpen && selectedProject?.slug) {
      setFilesLoading(true)
      authFetch(`/api/dashboard/files?type=text&client=${encodeURIComponent(selectedProject.slug)}`)
        .then(res => res.json())
        .then(data => {
          setProjectFiles(data.files || [])
          setFilesLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch project files:', err)
          setProjectFiles([])
          setFilesLoading(false)
        })
    } else {
      setProjectFiles([])
      setFilesLoading(false)
    }
  }, [filesOpen, selectedProject?.slug, uploading])

  return { projectFiles, filesLoading }
}
