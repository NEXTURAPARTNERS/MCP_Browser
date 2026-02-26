import type { QueryProgress } from '../hooks/useQuery.js'

interface StatusBarProps {
  progress: QueryProgress
  isLoading: boolean
}

export function StatusBar({ progress, isLoading }: StatusBarProps) {
  if (!isLoading && progress.events.length === 0) return null

  const lastEvent = progress.events[progress.events.length - 1]
  const toolCallCount = progress.events.filter((e) => e.type === 'tool_call').length

  let statusText = 'Bezig...'
  if (lastEvent?.type === 'tool_call') {
    const toolName = lastEvent.toolName.split('__')[1] ?? lastEvent.toolName
    statusText = `Gebruikt tool: ${toolName}`
  } else if (lastEvent?.type === 'tool_result') {
    statusText = lastEvent.ok ? 'Tool klaar' : 'Tool fout'
  } else if (lastEvent?.type === 'thinking') {
    statusText = 'Verwerkt resultaten...'
  }

  return (
    <div style={styles.bar}>
      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: '0s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
      </div>
      <span style={styles.text}>{statusText}</span>
      {toolCallCount > 0 && (
        <span style={styles.badge}>{toolCallCount} tool{toolCallCount > 1 ? 's' : ''}</span>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px',
    height: 30,
    background: '#e8f0fe',
    borderBottom: '1px solid #c5d5f5',
    fontSize: 12,
    color: '#0052a3'
  },
  dots: {
    display: 'flex',
    gap: 3,
    alignItems: 'center'
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#0066cc',
    animation: 'pulse 1.2s ease-in-out infinite'
  },
  text: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  badge: {
    background: '#0066cc',
    color: '#fff',
    padding: '1px 7px',
    borderRadius: 10,
    fontSize: 11
  }
}
