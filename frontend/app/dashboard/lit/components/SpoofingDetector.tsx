'use client'

interface SpoofingProps {
  symbol: string
  data?: any
  fullscreen?: boolean
}

export default function SpoofingDetector({ symbol, data, fullscreen }: SpoofingProps) {
  const mockData = data || {
    riskLevel: 45,
    suspiciousOrders: 8,
    layeringDetected: 2,
    washTradesDetected: 1,
    recentAlerts: [
      { id: 1, type: 'LAYERING', confidence: 92, time: '13:45' },
      { id: 2, type: 'SPOOFING', confidence: 78, time: '13:42' },
      { id: 3, type: 'WASH_TRADE', confidence: 65, time: '13:40' }
    ]
  }

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🔍</span> Spoofing Detection
      </h3>

      <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,107,107,0.1)', borderLeft: '3px solid #ff6b6b', borderRadius: '6px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Risk Level</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: mockData.riskLevel > 70 ? '#ff6b6b' : '#f97316' }}>
          {mockData.riskLevel}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Suspicious Orders</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#8AB4F8' }}>{mockData.suspiciousOrders}</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Layering</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f97316' }}>{mockData.layeringDetected}</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Wash Trades</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444' }}>{mockData.washTradesDetected}</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
          Recent Alerts
        </div>
        {mockData.recentAlerts.map((alert: any, idx: number) => (
          <div key={idx} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#f97316' }}>{alert.type}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Conf: {alert.confidence}%</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
