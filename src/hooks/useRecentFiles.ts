import { useState, useEffect, useCallback } from 'react'

export interface RecentFile {
  id: string
  name: string
  action: string // 'Uploaded' | 'Merged' | 'Compressed' | 'Validated' | 'Generated' | 'Scanned'
  timestamp: string
  size?: number
  sizeSaved?: number
  path?: string // Route link to the suite/tool
}

export const useRecentFiles = () => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('shreedesk-recent-files')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Clear out legacy fake data from older sessions
        if (parsed.some((f: any) => f.name.includes('ShreeDesk_') || f.name.includes('aggregated_block_report') || f.name.includes('solar_school_grids'))) {
          localStorage.removeItem('shreedesk-recent-files')
          setRecentFiles([])
        } else {
          setRecentFiles(parsed)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const addRecentFile = useCallback((name: string, action: string, size?: number, sizeSaved?: number, path?: string) => {
    const newItem: RecentFile = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      action,
      timestamp: new Date().toISOString(),
      size,
      sizeSaved,
      path,
    }

    setRecentFiles((prev) => {
      // Keep only unique names or limit to last 20 items
      const filtered = prev.filter((item) => !(item.name === name && item.action === action))
      const updated = [newItem, ...filtered].slice(0, 20)
      localStorage.setItem('shreedesk-recent-files', JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([])
    localStorage.removeItem('shreedesk-recent-files')
  }, [])

  return { recentFiles, addRecentFile, clearRecentFiles }
}
