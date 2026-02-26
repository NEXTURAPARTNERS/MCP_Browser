import { APIKeySection } from './APIKeySection.js'
import { ServerList } from './ServerList.js'

interface SettingsPageProps {
  onClose: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Instellingen</h2>
          <button onClick={onClose} style={styles.closeBtn} title="Sluiten">
            ×
          </button>
        </div>
        <div style={styles.body}>
          <APIKeySection />
          <ServerList />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 60,
    zIndex: 100
  },
  panel: {
    background: '#fff',
    borderRadius: 12,
    width: 560,
    maxHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e8e8e8'
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e'
  },
  closeBtn: {
    fontSize: 24,
    color: '#666',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '20px'
  }
}
