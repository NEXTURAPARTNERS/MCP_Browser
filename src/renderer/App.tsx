import { useState } from 'react'
import { AddressBar } from './components/AddressBar.js'
import { ContentPane } from './components/ContentPane.js'
import { StatusBar } from './components/StatusBar.js'
import { SettingsPage } from './components/settings/SettingsPage.js'
import { useQuery } from './hooks/useQuery.js'
import { useNavigation } from './hooks/useNavigation.js'

export function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { isLoading, progress, html, submitQuery } = useQuery()
  const { currentQuery, navigate, back, forward, canGoBack, canGoForward, history, currentIndex } =
    useNavigation()

  const handleSubmit = (query: string) => {
    navigate(query)
    submitQuery(query)
  }

  // Navigate back/forward and re-run the query for that history entry
  const handleBack = () => {
    back()
    const prevIndex = currentIndex - 1
    const prevQuery = history[prevIndex]
    if (prevQuery) submitQuery(prevQuery)
  }

  const handleForward = () => {
    forward()
    const nextIndex = currentIndex + 1
    const nextQuery = history[nextIndex]
    if (nextQuery) submitQuery(nextQuery)
  }

  return (
    <div style={styles.shell}>
      <AddressBar
        currentQuery={currentQuery}
        isLoading={isLoading}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onSubmit={handleSubmit}
        onBack={handleBack}
        onForward={handleForward}
        onSettings={() => setShowSettings(true)}
      />
      {isLoading && <StatusBar progress={progress} isLoading={isLoading} />}
      <ContentPane html={html} isLoading={isLoading} />
      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: '#f0f0f0'
  }
}
