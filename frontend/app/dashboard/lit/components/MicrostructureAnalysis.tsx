'use client'

interface MicrostructureProps {
  symbol: string
  data?: unknown
  fullscreen?: boolean
}

export default function MicrostructureAnalysis(_props: MicrostructureProps) {
  const defaultMock = {
    bidAskSpread: 0.02,
    spreadCompression: false,
    quoteChangeRate: 45,
    quotingActivity: 'HIGH',
    lastTradeSize: 5200,
    tradeIntensity: 87,
    volatilityRegime: 'NORMAL',
    orderImbalanceRatio: 1.35
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🔬</span> Microstructure
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Bid-Ask Spread</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#8AB4F8', fontFamily: 'JetBrains Mono' }}>
            ${mockData.bidAskSpread.toFixed(4)}
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Order Imbalance</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e', fontFamily: 'JetBrains Mono' }}>
            {mockData.orderImbalanceRatio.toFixed(2)}x
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Trade Intensity</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f97316' }}>
            {mockData.tradeIntensity}%
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Quote Changes/s</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>
            {mockData.quoteChangeRate}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Quoting Activity</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: mockData.quotingActivity === 'HIGH' ? '#ef4444' : '#22c55e' }}>
            {mockData.quotingActivity}
          </div>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Volatility</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#8AB4F8' }}>
            {mockData.volatilityRegime}
          </div>
        </div>
        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Compression</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: mockData.spreadCompression ? '#ef4444' : '#22c55e' }}>
            {mockData.spreadCompression ? 'YES' : 'NO'}
          </div>
        </div>
      </div>
    </div>
  )
}
