import { useEffect, useRef } from 'react'

interface ContentPaneProps {
  html: string | null
  isLoading: boolean
}

export function ContentPane({ html, isLoading }: ContentPaneProps) {
  const webviewRef = useRef<Electron.WebviewTag>(null)

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || !html) return

    const encoded = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    wv.src = encoded

    // Intercept all link clicks and open in system browser
    const handleNewWindow = (e: Event) => {
      e.preventDefault()
      const url = (e as Electron.NewWindowEvent).url
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        window.mcpBrowser.openExternal(url)
      }
    }

    // Navigation within the webview should also open externally
    const handleNavigate = (e: Event) => {
      const url = (e as Electron.DidNavigateEvent).url
      if (url && url !== encoded && !url.startsWith('data:')) {
        e.preventDefault()
        window.mcpBrowser.openExternal(url)
      }
    }

    wv.addEventListener('new-window', handleNewWindow)
    wv.addEventListener('will-navigate', handleNavigate)
    return () => {
      wv.removeEventListener('new-window', handleNewWindow)
      wv.removeEventListener('will-navigate', handleNavigate)
    }
  }, [html])

  if (!html && !isLoading) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyContent}>
          <div style={styles.logo}>MCP Browser</div>
          <p style={styles.tagline}>
            Stel een vraag en laat AI de informatie ophalen via MCP-servers.
          </p>
          <div style={styles.examples}>
            <p style={styles.examplesTitle}>Voorbeeldvragen:</p>
            <ul style={styles.exampleList}>
              <li>"Wat is de huidige olieprijs?"</li>
              <li>"Leg kwantumverstrengeling uit"</li>
              <li>"Nieuws over klimaatverandering vandaag"</li>
              <li>"Wat is de bevolking van Amsterdam?"</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* @ts-expect-error webview is Electron-specific */}
      <webview
        ref={webviewRef}
        style={{ ...styles.webview, opacity: isLoading ? 0.4 : 1 }}
        webpreferences="javascript=no, nodeIntegration=no, contextIsolation=yes"
        partition="persist:mcp-content"
        allowpopups="false"
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fff'
  },
  webview: {
    flex: 1,
    width: '100%',
    border: 'none',
    transition: 'opacity 0.2s'
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa'
  },
  emptyContent: {
    textAlign: 'center',
    maxWidth: 480,
    padding: '0 24px'
  },
  logo: {
    fontSize: 36,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 12,
    letterSpacing: -1
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    lineHeight: 1.5,
    marginBottom: 32
  },
  examples: {
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'left'
  },
  examplesTitle: {
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
    fontSize: 13
  },
  exampleList: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  }
}
