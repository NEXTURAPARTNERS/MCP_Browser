import { useState } from 'react'
import { useServers } from '../../hooks/useServers.js'
import type { RegistryServer } from '../../types/electron.js'

export function ServerList() {
  const { servers, loading, toggleServer, removeServer } = useServers()
  const [activeTab, setActiveTab] = useState<'servers' | 'discover'>('servers')
  const [registryQuery, setRegistryQuery] = useState('')
  const [registryResults, setRegistryResults] = useState<RegistryServer[]>([])
  const [registryLoading, setRegistryLoading] = useState(false)
  const [registryError, setRegistryError] = useState<string | null>(null)

  const searchRegistry = async () => {
    setRegistryLoading(true)
    setRegistryError(null)
    try {
      const results = await window.mcpBrowser.searchRegistry(registryQuery)
      setRegistryResults(results)
    } catch (err) {
      setRegistryError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegistryLoading(false)
    }
  }

  const addFromRegistry = async (server: RegistryServer) => {
    const pkg = server.packages?.[0]
    if (!pkg) return
    const name = server.title ?? server.name

    await window.mcpBrowser.addCustomServer({
      id: `registry-${server.name.replace(/[^a-z0-9]/gi, '-')}`,
      name,
      description: server.description,
      transport: 'stdio',
      command: 'npx',
      args: ['-y', pkg.name],
      category: 'custom',
      defaultEnabled: false
    })
  }

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>MCP-servers</h3>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('servers')}
          style={{ ...styles.tab, ...(activeTab === 'servers' ? styles.tabActive : {}) }}
        >
          Mijn servers
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          style={{ ...styles.tab, ...(activeTab === 'discover' ? styles.tabActive : {}) }}
        >
          Ontdekken
        </button>
      </div>

      {activeTab === 'servers' && (
        <div>
          {loading ? (
            <p style={styles.loading}>Laden...</p>
          ) : (
            servers.map((s) => (
              <div key={s.config.id} style={styles.serverRow}>
                <div style={styles.serverInfo}>
                  <div style={styles.serverName}>
                    {s.config.name}
                    {s.config.requiresApiKey && (
                      <span style={styles.badge}>Sleutel vereist</span>
                    )}
                  </div>
                  <div style={styles.serverDesc}>{s.config.description}</div>
                  {s.enabled && s.connected && (
                    <div style={styles.connected}>
                      ✓ Verbonden · {s.toolCount} tool{s.toolCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {s.error && <div style={styles.error}>{s.error}</div>}
                </div>
                <div style={styles.serverActions}>
                  <button
                    onClick={() => toggleServer(s.config.id, !s.enabled)}
                    style={{
                      ...styles.toggleBtn,
                      background: s.enabled ? '#0066cc' : '#ccc',
                    }}
                    title={s.enabled ? 'Uitschakelen' : 'Inschakelen'}
                  >
                    <span style={{
                      ...styles.toggleKnob,
                      transform: s.enabled ? 'translateX(16px)' : 'translateX(2px)',
                    }} />
                  </button>
                  {s.config.category === 'custom' && (
                    <button
                      onClick={() => removeServer(s.config.id)}
                      style={styles.removeBtn}
                      title="Verwijder server"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div>
          <div style={styles.searchRow}>
            <input
              type="text"
              placeholder="Zoek in MCP Registry..."
              value={registryQuery}
              onChange={(e) => setRegistryQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchRegistry()}
              style={styles.searchInput}
            />
            <button onClick={searchRegistry} style={styles.searchBtn}>
              Zoeken
            </button>
          </div>

          {registryLoading && <p style={styles.loading}>Zoeken...</p>}
          {registryError && <p style={styles.error}>{registryError}</p>}

          {registryResults.map((r) => {
            const pkg = r.packages?.[0]
            return (
              <div key={r.name} style={styles.registryRow}>
                <div style={styles.serverInfo}>
                  <div style={styles.serverName}>{r.title ?? r.name}</div>
                  <div style={styles.serverDesc}>{r.description}</div>
                  {pkg && (
                    <div style={styles.pkgInfo}>
                      {pkg.registryType}: {pkg.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addFromRegistry(r)}
                  style={styles.addBtn}
                  disabled={!pkg}
                >
                  + Toevoegen
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 },
  tabs: { display: 'flex', gap: 4, marginBottom: 12 },
  tab: {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    color: '#666',
    background: 'transparent',
    border: '1px solid #e0e0e0'
  },
  tabActive: {
    background: '#0066cc',
    color: '#fff',
    border: '1px solid #0066cc'
  },
  serverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: '#f8f9fa',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    marginBottom: 8
  },
  serverInfo: { flex: 1, minWidth: 0 },
  serverName: {
    fontWeight: 600,
    fontSize: 13,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  serverDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  connected: { fontSize: 11, color: '#007a33', marginTop: 4 },
  error: { fontSize: 11, color: '#cc3300', marginTop: 4 },
  badge: {
    fontSize: 10,
    background: '#fff3e0',
    color: '#e65100',
    padding: '2px 6px',
    borderRadius: 8
  },
  serverActions: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleBtn: {
    position: 'relative',
    width: 38,
    height: 22,
    borderRadius: 11,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
    padding: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: 3,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    transition: 'transform 0.2s',
    display: 'block',
  },
  removeBtn: {
    fontSize: 18,
    color: '#cc3300',
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4
  },
  loading: { color: '#888', fontSize: 13, padding: '12px 0' },
  searchRow: { display: 'flex', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: '#333'
  },
  searchBtn: {
    background: '#0066cc',
    color: '#fff',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13
  },
  registryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    background: '#f8f9fa',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    marginBottom: 6
  },
  pkgInfo: { fontSize: 11, color: '#888', fontFamily: 'monospace', marginTop: 2 },
  addBtn: {
    background: '#e8f0fe',
    color: '#0066cc',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0
  }
}
