import { useState, useEffect } from 'react'

export function APIKeySection() {
  const [claudeKey, setClaudeKey] = useState('')
  const [braveKey, setBraveKey] = useState('')
  const [hasClaudeKey, setHasClaudeKey] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    window.mcpBrowser.hasApiKey().then(setHasClaudeKey)
  }, [])

  const saveClaudeKey = async () => {
    if (!claudeKey.trim()) return
    await window.mcpBrowser.setApiKey(claudeKey.trim())
    setClaudeKey('')
    setHasClaudeKey(true)
    setSaved('claude')
    setTimeout(() => setSaved(null), 2000)
  }

  const saveBraveKey = async () => {
    if (!braveKey.trim()) return
    await window.mcpBrowser.setApiKey(braveKey.trim(), 'brave')
    setBraveKey('')
    setSaved('brave')
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>API-sleutels</h3>

      <div style={styles.keyGroup}>
        <label style={styles.label}>
          Claude API-sleutel
          {hasClaudeKey && <span style={styles.saved}>✓ Opgeslagen</span>}
        </label>
        <p style={styles.hint}>
          Vereist. Haal op via{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.mcpBrowser.openExternal('https://console.anthropic.com/settings/keys')
            }}
            style={styles.link}
          >
            console.anthropic.com
          </a>
        </p>
        <div style={styles.inputRow}>
          <input
            type="password"
            placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'}
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveClaudeKey()}
            style={styles.keyInput}
          />
          <button
            onClick={saveClaudeKey}
            disabled={!claudeKey.trim()}
            style={styles.saveBtn}
          >
            {saved === 'claude' ? 'Opgeslagen!' : 'Opslaan'}
          </button>
        </div>
      </div>

      <div style={styles.keyGroup}>
        <label style={styles.label}>Brave Search API-sleutel (optioneel)</label>
        <p style={styles.hint}>
          Voor hogere kwaliteit zoekresultaten via Brave Search.
        </p>
        <div style={styles.inputRow}>
          <input
            type="password"
            placeholder="BSA..."
            value={braveKey}
            onChange={(e) => setBraveKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveBraveKey()}
            style={styles.keyInput}
          />
          <button
            onClick={saveBraveKey}
            disabled={!braveKey.trim()}
            style={styles.saveBtn}
          >
            {saved === 'brave' ? 'Opgeslagen!' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 },
  keyGroup: {
    background: '#f8f9fa',
    border: '1px solid #e8e8e8',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 13,
    color: '#333',
    marginBottom: 4
  },
  hint: { fontSize: 12, color: '#888', marginBottom: 10 },
  link: { color: '#0066cc', textDecoration: 'none' },
  saved: {
    fontSize: 11,
    color: '#007a33',
    background: '#e8f5e9',
    padding: '2px 8px',
    borderRadius: 10
  },
  inputRow: { display: 'flex', gap: 8 },
  keyInput: {
    flex: 1,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: '#333'
  },
  saveBtn: {
    background: '#0066cc',
    color: '#fff',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500
  }
}
