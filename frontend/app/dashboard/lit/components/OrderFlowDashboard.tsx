'use client'

interface OrderFlowProps {
  symbol: string
  data?: unknown
  fullscreen?: boolean
}

export default function OrderFlowDashboard(_props: OrderFlowProps) {
  const defaultMock = {
    bidVolume: 125000,
    askVolume: 98000,
    bidAskRatio: 1.27,
    largeOrdersCount: 5,
    cumulativeDelta: 2800,
    vwap: 150.25,
    orderBookImbalance: 0.65,
    liquidityScore: 78
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>💰</span> Order Flow Analysis
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Bid Volume</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#22c55e', fontFamily: 'JetBrains Mono' }}>
            {(mockData.bidVolume / 1000).toFixed(0)}K
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Ask Volume</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444', fontFamily: 'JetBrains Mono' }}>
            {(mockData.askVolume / 1000).toFixed(0)}K
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Bid-Ask Ratio</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: mockData.bidAskRatio > 1.2 ? '#22c55e' : '#f97316', fontFamily: 'JetBrains Mono' }}>
            {mockData.bidAskRatio.toFixed(2)}x
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Cumulative Delta</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: mockData.cumulativeDelta > 0 ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono' }}>
            {mockData.cumulativeDelta > 0 ? '+' : ''}{mockData.cumulativeDelta}
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Large Orders</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#8AB4F8', fontFamily: 'JetBrains Mono' }}>
            {mockData.largeOrdersCount}
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Liquidity Score</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: mockData.liquidityScore > 70 ? '#22c55e' : '#f97316', fontFamily: 'JetBrains Mono' }}>
            {mockData.liquidityScore}/100
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
          Order Book Imbalance
        </div>
        <div style={{ display: 'flex', gap: '4px', height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            flex: mockData.orderBookImbalance, 
            background: 'linear-gradient(90deg, #22c55e, #10b981)',
            borderRadius: '4px'
          }} />
          <div style={{ 
            flex: 1 - mockData.orderBookImbalance, 
            background: 'linear-gradient(90deg, #ef4444, #f43f5e)',
            borderRadius: '4px'
          }} />
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'center' }}>
          Bullish {(mockData.orderBookImbalance * 100).toFixed(0)}% | Bearish {((1 - mockData.orderBookImbalance) * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  )
}
