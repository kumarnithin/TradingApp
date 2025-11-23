'use client'

interface DarkPoolProps {
  symbol: string
    data?: unknown
    fullscreen?: boolean
}

export default function DarkPoolMonitor(_props: DarkPoolProps) {
  const defaultMock = {
    darkPoolVolume: 450000,
    darkPoolBuyVolume: 275000,
    darkPoolSellVolume: 175000,
    darkPoolVwap: 150.3,
    volumePctDarkpool: 22,
    executedAtPremium: 0.08,
    blockTradesDetected: 3
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>👻</span> Dark Pool Activity
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Dark Pool Vol</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>
            {(mockData.darkPoolVolume / 1000).toFixed(0)}K
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>% of Total</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8AB4F8' }}>
            {mockData.volumePctDarkpool}%
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>DP Buy</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', fontFamily: 'JetBrains Mono' }}>
            {(mockData.darkPoolBuyVolume / 1000).toFixed(0)}K
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>DP Sell</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444', fontFamily: 'JetBrains Mono' }}>
            {(mockData.darkPoolSellVolume / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
        <div style={{ marginBottom: '6px' }}>Dark Pool VWAP: <span style={{ color: '#8AB4F8', fontWeight: '700' }}>${mockData.darkPoolVwap.toFixed(2)}</span></div>
        <div>Premium: <span style={{ color: mockData.executedAtPremium > 0 ? '#22c55e' : '#ef4444', fontWeight: '700' }}>${mockData.executedAtPremium.toFixed(3)}</span></div>
        <div style={{ marginTop: '6px' }}>Block Trades: <span style={{ color: '#f97316' }}>{mockData.blockTradesDetected}</span></div>
      </div>
    </div>
  )
}
