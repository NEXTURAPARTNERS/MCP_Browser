import { useState, useCallback, useRef } from 'react'
import type { ProgressEvent } from '../types/electron.js'

export interface QueryProgress {
  events: ProgressEvent[]
  currentTool: string | null
}

export function useQuery() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<QueryProgress>({ events: [], currentTool: null })
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cleanupRef = useRef<(() => void) | null>(null)
  const isCancelledRef = useRef(false)

  const cancelQuery = useCallback(() => {
    isCancelledRef.current = true
    cleanupRef.current?.()
    cleanupRef.current = null
    setIsLoading(false)
  }, [])

  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim()) return

    // Reset cancel flag and previous listener
    isCancelledRef.current = false
    cleanupRef.current?.()

    setIsLoading(true)
    setProgress({ events: [], currentTool: null })
    setHtml(null)
    setError(null)

    const cleanup = window.mcpBrowser.onQueryProgress((event: ProgressEvent) => {
      if (isCancelledRef.current) return

      setProgress((prev) => ({
        events: [...prev.events, event],
        currentTool: event.type === 'tool_call' ? event.toolName.split('__')[1] : prev.currentTool
      }))

      if (event.type === 'done') {
        setHtml(event.html)
        setIsLoading(false)
        cleanupRef.current = null
        cleanup()
      } else if (event.type === 'error') {
        setError(event.message)
        setHtml(buildErrorPage(event.message))
        setIsLoading(false)
        cleanupRef.current = null
        cleanup()
      }
    })

    cleanupRef.current = cleanup

    try {
      await window.mcpBrowser.submitQuery(query)
    } catch (err) {
      if (isCancelledRef.current) return
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setHtml(buildErrorPage(msg))
      setIsLoading(false)
      cleanupRef.current = null
      cleanup()
    }
  }, [])

  return { isLoading, progress, html, error, submitQuery, cancelQuery }
}

function buildErrorPage(message: string): string {
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Fout</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 24px; color: #333; }
  .error-box { background: #fff5f5; border: 1px solid #ffcccc; border-radius: 8px; padding: 24px; }
  h2 { color: #cc3300; margin-bottom: 12px; }
  code { font-family: monospace; font-size: 0.9em; }
</style>
</head>
<body>
<div class="error-box">
  <h2>Er is een fout opgetreden</h2>
  <p><code>${escaped}</code></p>
</div>
</body>
</html>`
}
