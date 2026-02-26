import { useState, useEffect, useCallback } from 'react'
import type { ServerWithStatus } from '../types/electron.js'

export function useServers() {
  const [servers, setServers] = useState<ServerWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.mcpBrowser.getAllServers()
      setServers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggleServer = useCallback(
    async (id: string, enabled: boolean) => {
      await window.mcpBrowser.setServerEnabled(id, enabled)
      setServers((prev) =>
        prev.map((s) => (s.config.id === id ? { ...s, enabled } : s))
      )
    },
    []
  )

  const removeServer = useCallback(
    async (id: string) => {
      await window.mcpBrowser.removeServer(id)
      setServers((prev) => prev.filter((s) => s.config.id !== id))
    },
    []
  )

  return { servers, loading, refresh, toggleServer, removeServer }
}
