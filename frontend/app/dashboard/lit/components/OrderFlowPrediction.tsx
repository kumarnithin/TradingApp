'use client'

interface PredictionProps {
  symbol: string
  data?: any
}

export default function OrderFlowPrediction({ symbol, data }: PredictionProps) {
  const mockData = data || {
    nextMoveDirection: 'UP',
    confidence: 78,
    expectedMagnitude: 1.25,
    timeToMove: 45,
    buyPressure: 72,
    sellPressure: 28,
    orderFlowImbalance: 0.72,
    predictedVolumeSpike: true,
    estimatedSpike: 2300000
  }

  return (
    <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: '0 0 20px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🤖</span> ML Order Flow Prediction
      </h3>

      <div style={{ marginBottom: '20px', padding: '16px', background: mockData.nextMoveDirection === 'UP' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '10px', border: `1px solid ${mockData.nextMoveDirection === 'UP' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Next Move Prediction</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: mockData.nextMoveDirection === 'UP' ? '#22c55e' : '#ef4444' }}>
            {mockData.nextMoveDirection === 'UP' ? '📈' : '📉'} {mockData.nextMoveDirection}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#8AB4F8' }}>{mockData.confidence}%</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Confidence</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Move</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>±${mockData.expectedMagnitude.toFixed(2)}</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Time to Move</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f97316' }}>{mockData.timeToMove}s</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Buy/Sell Pressure</div>
        <div style={{ display: 'flex', gap: '4px', height: '32px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ 
            flex: mockData.buyPressure, 
            background: 'linear-gradient(90deg, #22c55e, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: 'white'
          }}>
            {mockData.buyPressure}%
          </div>
          <div style={{ 
            flex: mockData.sellPressure, 
            background: 'linear-gradient(90deg, #ef4444, #f43f5e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: 'white'
          }}>
            {mockData.sellPressure}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Order Flow Imbalance</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8AB4F8' }}>{mockData.orderFlowImbalance.toFixed(2)}x</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Volume Spike</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: mockData.predictedVolumeSpike ? '#22c55e' : '#94a3b8' }}>
            {mockData.predictedVolumeSpike ? '✓ YES' : 'NO'}
          </div>
        </div>
      </div>
    </div>
  )
}
