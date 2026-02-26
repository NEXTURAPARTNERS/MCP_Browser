import { useState, useEffect, useRef, KeyboardEvent } from 'react'

interface AddressBarProps {
  currentQuery: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  hasContent: boolean
  onSubmit: (query: string) => void
  onBack: () => void
  onForward: () => void
  onCancel: () => void
  onPrint: () => void
  onSettings: () => void
}

export function AddressBar({
  currentQuery,
  isLoading,
  canGoBack,
  canGoForward,
  hasContent,
  onSubmit,
  onBack,
  onForward,
  onCancel,
  onPrint,
  onSettings
}: AddressBarProps) {
  const [value, setValue] = useState(currentQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(currentQuery)
  }, [currentQuery])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim())
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      if (isLoading) {
        onCancel()
      } else {
        setValue(currentQuery)
        inputRef.current?.blur()
      }
    }
  }

  return (
    <div style={styles.bar}>
      <button
        onClick={onBack}
        disabled={!canGoBack || isLoading}
        style={styles.navBtn}
        title="Terug"
      >
        ←
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward || isLoading}
        style={styles.navBtn}
        title="Vooruit"
      >
        →
      </button>

      <div style={styles.inputWrapper}>
        {isLoading ? (
          <span style={styles.spinner} title="Laden..." />
        ) : (
          <span style={styles.searchIcon}>⌕</span>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Stel een vraag..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          style={styles.input}
          disabled={isLoading}
        />
        {isLoading ? (
          <button onClick={onCancel} style={styles.cancelBtn} title="Annuleren (Esc)">
            ✕
          </button>
        ) : (
          value && (
            <button onClick={() => setValue('')} style={styles.clearBtn} title="Wissen">
              ×
            </button>
          )
        )}
      </div>

      {hasContent && !isLoading && (
        <button onClick={onPrint} style={styles.iconBtn} title="Afdrukken">
          🖨
        </button>
      )}

      <button onClick={onSettings} style={styles.iconBtn} title="Instellingen">
        ⚙
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: '#f0f0f0',
    borderBottom: '1px solid #d0d0d0',
    WebkitAppRegion: 'drag' as never,
    height: 52
  },
  navBtn: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontSize: 16,
    color: '#555',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag' as never,
    transition: 'background 0.1s'
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 20,
    padding: '0 12px',
    height: 34,
    gap: 8,
    WebkitAppRegion: 'no-drag' as never,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  searchIcon: {
    fontSize: 18,
    color: '#999',
    flexShrink: 0,
    lineHeight: 1
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid #ddd',
    borderTop: '2px solid #0066cc',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0
  },
  input: {
    flex: 1,
    background: 'transparent',
    color: '#333',
    fontSize: 14,
    border: 'none',
    outline: 'none'
  },
  clearBtn: {
    fontSize: 18,
    color: '#999',
    lineHeight: 1,
    padding: '0 2px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer'
  },
  cancelBtn: {
    fontSize: 13,
    color: '#cc3300',
    fontWeight: 600,
    lineHeight: 1,
    padding: '2px 6px',
    background: '#fff0ee',
    border: '1px solid #ffcccc',
    borderRadius: 4,
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag' as never,
    flexShrink: 0
  },
  iconBtn: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontSize: 18,
    color: '#555',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag' as never
  }
}
