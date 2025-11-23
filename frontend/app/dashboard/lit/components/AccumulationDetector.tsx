'use client'

interface AccumulationProps {
  symbol: string
  data?: unknown
  fullscreen?: boolean
}

export default function AccumulationDetector(_props: AccumulationProps) {
  const defaultMock = {
    phase: 'ACCUMULATION',
    confidence: 78,
    institutionalBuyVolume: 450000,
    institutionalSellVolume: 120000,
    volumeInPhase: 1200000,
    priceChange: 2.35,
    estimatedTargetPrice: 155.5,
    whaleMovementsDetected: 3
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  const phaseColor: unknown= {
    ACCUMULATION: '#22c55e',
    DISTRIBUTION: '#ef4444',
    MARKUP: '#06b6d4',
    MARKDOWN: '#f97316'
  }

  return (
    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 16px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🏦</span> Accumulation Phase
      </h3>

      <div style={{ marginBottom: '16px', padding: '12px', background: `${phaseColor[mockData.phase]}15`, borderLeft: `3px solid ${phaseColor[mockData.phase]}`, borderRadius: '6px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Phase</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: phaseColor[mockData.phase] }}>
          {mockData.phase}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
          Confidence: {mockData.confidence}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Institutional Buy</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>
            {(mockData.institutionalBuyVolume / 1000).toFixed(0)}K
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Institutional Sell</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
            {(mockData.institutionalSellVolume / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Target Price</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>
          ${mockData.estimatedTargetPrice.toFixed(2)}
        </div>
      </div>

      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
        <div style={{ marginBottom: '6px' }}>🐋 Whale Movements: {mockData.whaleMovementsDetected}</div>
        <div>Volume in Phase: {(mockData.volumeInPhase / 1000000).toFixed(1)}M</div>
      </div>
    </div>
  )
}
