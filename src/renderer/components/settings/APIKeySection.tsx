import { useState, useEffect } from 'react'

export function APIKeySection() {
  // --- Backend toggle ---
  const [backend, setBackendState] = useState<'claude' | 'ollama'>('claude')

  // --- Anthropic state ---
  const [claudeKey, setClaudeKey] = useState('')
  const [hasClaudeKey, setHasClaudeKey] = useState(false)
  const [braveKey, setBraveKey] = useState('')
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('')
  const [anthropicModel, setAnthropicModel] = useState('claude-opus-4-6')
  const [savedAnthropic, setSavedAnthropic] = useState<string | null>(null)

  // --- Ollama state ---
  const [ollamaUrl, setOllamaUrl] = useState('')
  const [ollamaKey, setOllamaKey] = useState('')
  const [hasOllamaKey, setHasOllamaKey] = useState(false)
  const [ollamaModel, setOllamaModel] = useState('llama3.1')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [fetchingModels, setFetchingModels] = useState(false)
  const [savedOllama, setSavedOllama] = useState(false)

  useEffect(() => {
    window.mcpBrowser.hasApiKey().then(setHasClaudeKey)
    window.mcpBrowser.getBackend().then(setBackendState)
    window.mcpBrowser.getAnthropicConfig().then(({ baseUrl, model }) => {
      setAnthropicBaseUrl(baseUrl)
      setAnthropicModel(model)
    })
    window.mcpBrowser.getOllamaConfig().then(({ url, model, hasKey }) => {
      setOllamaUrl(url)
      setOllamaModel(model)
      setHasOllamaKey(hasKey)
    })
  }, [])

  const switchBackend = async (b: 'claude' | 'ollama') => {
    setBackendState(b)
    await window.mcpBrowser.setBackend(b)
  }

  // --- Anthropic handlers ---
  const saveClaudeKey = async () => {
    if (!claudeKey.trim()) return
    await window.mcpBrowser.setApiKey(claudeKey.trim())
    setClaudeKey('')
    setHasClaudeKey(true)
    setSavedAnthropic('key')
    setTimeout(() => setSavedAnthropic(null), 2000)
  }

  const saveBraveKey = async () => {
    if (!braveKey.trim()) return
    await window.mcpBrowser.setApiKey(braveKey.trim(), 'brave')
    setBraveKey('')
    setSavedAnthropic('brave')
    setTimeout(() => setSavedAnthropic(null), 2000)
  }

  const saveAnthropicConfig = async () => {
    await window.mcpBrowser.setAnthropicConfig(anthropicBaseUrl.trim(), anthropicModel.trim())
    setSavedAnthropic('config')
    setTimeout(() => setSavedAnthropic(null), 2000)
  }

  // --- Ollama handlers ---
  const testConnection = async () => {
    if (!ollamaUrl.trim()) return
    setTestStatus('testing')
    setTestError('')
    const result = await window.mcpBrowser.testOllamaConnection(
      ollamaUrl.trim(),
      ollamaKey.trim() || undefined
    )
    if (result.ok) {
      setTestStatus('ok')
    } else {
      setTestStatus('error')
      setTestError(result.error ?? 'Verbinding mislukt')
    }
  }

  const fetchModels = async () => {
    if (!ollamaUrl.trim()) return
    setFetchingModels(true)
    try {
      const models = await window.mcpBrowser.fetchOllamaModels(
        ollamaUrl.trim(),
        ollamaKey.trim() || undefined
      )
      setOllamaModels(models)
      if (models.length > 0 && !models.includes(ollamaModel)) {
        setOllamaModel(models[0])
      }
    } catch {
      // keep existing model
    } finally {
      setFetchingModels(false)
    }
  }

  const saveOllamaConfig = async () => {
    await window.mcpBrowser.setOllamaConfig(
      ollamaUrl.trim(),
      ollamaModel.trim(),
      ollamaKey.trim() || undefined
    )
    if (ollamaKey.trim()) {
      setOllamaKey('')
      setHasOllamaKey(true)
    }
    setSavedOllama(true)
    setTimeout(() => setSavedOllama(false), 2000)
  }

  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>AI Backend</h3>

      {/* Backend toggle */}
      <div style={s.toggle}>
        <button
          style={{ ...s.toggleBtn, ...(backend === 'claude' ? s.toggleActive : {}) }}
          onClick={() => switchBackend('claude')}
        >
          Anthropic
        </button>
        <button
          style={{ ...s.toggleBtn, ...(backend === 'ollama' ? s.toggleActive : {}) }}
          onClick={() => switchBackend('ollama')}
        >
          OpenAI-compatibel
        </button>
      </div>

      {/* ---- Anthropic panel ---- */}
      {backend === 'claude' && (
        <>
          <div style={s.keyGroup}>
            <label style={s.label}>
              Claude API-sleutel
              {hasClaudeKey && <span style={s.badge}>✓ Opgeslagen</span>}
            </label>
            <p style={s.hint}>
              Vereist. Haal op via{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  window.mcpBrowser.openExternal('https://console.anthropic.com/settings/keys')
                }}
                style={s.link}
              >
                console.anthropic.com
              </a>
            </p>
            <div style={s.inputRow}>
              <input
                type="password"
                placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'}
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveClaudeKey()}
                style={s.keyInput}
              />
              <button onClick={saveClaudeKey} disabled={!claudeKey.trim()} style={s.saveBtn}>
                {savedAnthropic === 'key' ? 'Opgeslagen!' : 'Opslaan'}
              </button>
            </div>
          </div>

          <div style={s.keyGroup}>
            <label style={s.label}>Brave Search API-sleutel (optioneel)</label>
            <p style={s.hint}>Voor hogere kwaliteit zoekresultaten via Brave Search.</p>
            <div style={s.inputRow}>
              <input
                type="password"
                placeholder="BSA..."
                value={braveKey}
                onChange={(e) => setBraveKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveBraveKey()}
                style={s.keyInput}
              />
              <button onClick={saveBraveKey} disabled={!braveKey.trim()} style={s.saveBtn}>
                {savedAnthropic === 'brave' ? 'Opgeslagen!' : 'Opslaan'}
              </button>
            </div>
          </div>

          <div style={s.keyGroup}>
            <label style={s.label}>Geavanceerde instellingen</label>
            <p style={s.hint}>
              Optioneel. Leeg laten om de standaard Anthropic API te gebruiken.
            </p>
            <label style={s.fieldLabel}>Custom API URL</label>
            <input
              type="text"
              placeholder="https://api.anthropic.com (standaard)"
              value={anthropicBaseUrl}
              onChange={(e) => setAnthropicBaseUrl(e.target.value)}
              style={{ ...s.keyInput, marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
            />
            <label style={s.fieldLabel}>Model</label>
            <div style={s.inputRow}>
              <input
                type="text"
                placeholder="claude-opus-4-6"
                value={anthropicModel}
                onChange={(e) => setAnthropicModel(e.target.value)}
                style={s.keyInput}
              />
              <button onClick={saveAnthropicConfig} style={s.saveBtn}>
                {savedAnthropic === 'config' ? 'Opgeslagen!' : 'Opslaan'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---- OpenAI-compatible panel ---- */}
      {backend === 'ollama' && (
        <>
          <div style={s.keyGroup}>
            <label style={s.label}>Server URL</label>
            <p style={s.hint}>
              bijv. <code style={s.code}>http://mijn-vps:3000/api</code> (Open WebUI) of{' '}
              <code style={s.code}>http://localhost:11434</code> (Ollama)
            </p>
            <div style={s.inputRow}>
              <input
                type="text"
                placeholder="http://..."
                value={ollamaUrl}
                onChange={(e) => {
                  setOllamaUrl(e.target.value)
                  setTestStatus('idle')
                }}
                style={s.keyInput}
              />
              <button
                onClick={testConnection}
                disabled={!ollamaUrl.trim() || testStatus === 'testing'}
                style={s.secondaryBtn}
              >
                {testStatus === 'testing'
                  ? 'Bezig...'
                  : testStatus === 'ok'
                    ? '✓ Verbonden'
                    : testStatus === 'error'
                      ? '✗ Fout'
                      : 'Test verbinding'}
              </button>
            </div>
            {testStatus === 'error' && <p style={s.errorText}>{testError}</p>}
          </div>

          <div style={s.keyGroup}>
            <label style={s.label}>
              API Key
              {hasOllamaKey && <span style={s.badge}>● Opgeslagen</span>}
            </label>
            <p style={s.hint}>
              Vereist voor Open WebUI. Leeg laten voor raw Ollama zonder authenticatie.
            </p>
            <input
              type="password"
              placeholder={hasOllamaKey ? '••••••••••••••••' : 'sk-...'}
              value={ollamaKey}
              onChange={(e) => setOllamaKey(e.target.value)}
              style={{ ...s.keyInput, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={s.keyGroup}>
            <label style={s.label}>Model</label>
            <div style={s.inputRow}>
              {ollamaModels.length > 0 ? (
                <select
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  style={s.select}
                >
                  {ollamaModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="llama3.1"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  style={s.keyInput}
                />
              )}
              <button
                onClick={fetchModels}
                disabled={!ollamaUrl.trim() || fetchingModels}
                style={s.secondaryBtn}
              >
                {fetchingModels ? 'Laden...' : 'Fetch modellen'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              onClick={saveOllamaConfig}
              disabled={!ollamaUrl.trim() || !ollamaModel.trim()}
              style={s.saveBtn}
            >
              {savedOllama ? 'Opgeslagen!' : 'Config opslaan'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 16 },
  toggle: {
    display: 'flex',
    background: '#f0f0f0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
    width: 'fit-content'
  },
  toggleBtn: {
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '6px 18px',
    fontSize: 13,
    fontWeight: 500,
    color: '#555',
    cursor: 'pointer'
  },
  toggleActive: {
    background: '#fff',
    color: '#1a1a2e',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
  },
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
  fieldLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#555',
    marginBottom: 4
  },
  hint: { fontSize: 12, color: '#888', marginBottom: 10 },
  link: { color: '#0066cc', textDecoration: 'none' },
  code: {
    background: '#e8e8e8',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  badge: {
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
  select: {
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
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer'
  },
  secondaryBtn: {
    background: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const
  },
  errorText: { fontSize: 12, color: '#cc0000', marginTop: 6 }
}
