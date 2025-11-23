'use client'

interface AlertsPanelProps {
  alerts: unknown[]
  onClear?: () => void
}

export default function AlertsPanel({ alerts, onClear }: AlertsPanelProps) {
  const getAlertColor = (type: string) => {
    switch(type) {
      case 'SPOOFING': return '#ff6b6b'
      case 'ACCUMULATION': return '#22c55e'
      case 'ICEBERG': return '#06b6d4'
      case 'LAYERING': return '#f97316'
      case 'WHALE': return '#a855f7'
      default: return '#8AB4F8'
    }
  }

  return (
    <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,107,107,0.1)', borderLeft: '4px solid #ff6b6b', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#ff6b6b', margin: 0 }}>
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </h4>
        </div>
        {onClear && (
          <button 
            onClick={onClear}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,107,107,0.2)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '6px',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
        {alerts.map((alert, idx) => (
          <div key={idx} style={{
            padding: '10px',
            background: `${getAlertColor(alert.type)}15`,
            borderLeft: `3px solid ${getAlertColor(alert.type)}`,
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '700', color: getAlertColor(alert.type) }}>{alert.type}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{alert.message}</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '60px' }}>
              <div style={{ color: getAlertColor(alert.type), fontWeight: '700' }}>Conf: {alert.confidence}%</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{alert.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
