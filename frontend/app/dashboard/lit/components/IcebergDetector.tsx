'use client'

interface IcebergProps {
  symbol: string
  data?: unknown
  fullscreen?: boolean
}

interface DetectedOrder {
  id: number
  price: number
  visible: number
  estimated: number
  refreshRate: number
}

export default function IcebergDetector(_props: IcebergProps) {
  const defaultMock = {
    icebergsDetected: 4,
    totalHiddenQuantity: 250000,
    visibleLiquidity: 85000,
    estimatedTotalSize: 335000,
    detectedOrders: [
      { id: 1, price: 150.25, visible: 10000, estimated: 50000, refreshRate: 250 },
      { id: 2, price: 150.5, visible: 20000, estimated: 75000, refreshRate: 300 },
      { id: 3, price: 150.75, visible: 15000, estimated: 60000, refreshRate: 280 },
      { id: 4, price: 151.0, visible: 40000, estimated: 150000, refreshRate: 400 }
    ]
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🧊</span> Iceberg Orders
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Detected</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#8AB4F8' }}>{mockData.icebergsDetected}</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Visible</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>
            {(mockData.visibleLiquidity / 1000).toFixed(0)}K
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Hidden</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#f97316', fontFamily: 'JetBrains Mono' }}>
            {(mockData.totalHiddenQuantity / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
        Detected Icebergs
      </div>
      {mockData.detectedOrders.map((order: DetectedOrder, idx: number) => (
        <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '6px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#8AB4F8', fontWeight: '700' }}>${order.price.toFixed(2)}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Refresh: {order.refreshRate}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            <span>Visible: {order.visible.toLocaleString()}</span>
            <span>Est. Total: {order.estimated.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
