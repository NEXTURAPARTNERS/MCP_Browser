import { useState, useCallback } from 'react'

export function useNavigation() {
  const [history, setHistory] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const navigate = useCallback(
    (query: string) => {
      setHistory((h) => [...h.slice(0, currentIndex + 1), query])
      setCurrentIndex((i) => i + 1)
    },
    [currentIndex]
  )

  const back = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), [])

  const forward = useCallback(
    () => setCurrentIndex((i) => Math.min(history.length - 1, i + 1)),
    [history.length]
  )

  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1
  const currentQuery = history[currentIndex] ?? ''

  return { history, currentIndex, currentQuery, navigate, back, forward, canGoBack, canGoForward }
}
