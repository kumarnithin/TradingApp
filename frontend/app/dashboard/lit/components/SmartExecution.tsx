'use client'

interface ExecutionProps {
  symbol: string
  data?: unknown}

export default function SmartExecution(_props: ExecutionProps) {
  const defaultMock = {
    strategy: 'VWAP',
    targetSize: 100000,
    executedVolume: 67500,
    executionPercentage: 67.5,
    averageExecutionPrice: 150.18,
    vwap: 150.15,
    slippageAchieved: 0.03,
    maxSlippage: 0.15,
    participationRate: 8.5,
    estimatedTimeRemaining: 340
  } as const

  const mockData = (_props.data ?? defaultMock) as typeof defaultMock

  return (
    <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: '0 0 20px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>⚡</span> Smart Execution
      </h3>

      <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(138,180,248,0.05)', borderRadius: '10px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Execution Strategy</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#8AB4F8' }}>{mockData.strategy}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>ETA: {Math.floor(mockData.estimatedTimeRemaining / 60)}m {mockData.estimatedTimeRemaining % 60}s</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
          <span>Execution Progress</span>
          <span>{mockData.executionPercentage.toFixed(1)}%</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%',
            width: `${mockData.executionPercentage}%`,
            background: 'linear-gradient(90deg, #22c55e, #10b981)',
            borderRadius: '4px',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Avg Exec Price</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8AB4F8', fontFamily: 'JetBrains Mono' }}>
            ${mockData.averageExecutionPrice.toFixed(2)}
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>VWAP</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>
            ${mockData.vwap.toFixed(2)}
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Slippage Achieved</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', fontFamily: 'JetBrains Mono' }}>
            ${mockData.slippageAchieved.toFixed(3)}
          </div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(138,180,248,0.05)', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Participation Rate</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#8AB4F8' }}>
            {mockData.participationRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
        <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Target Size:</span>
          <span style={{ fontWeight: '700', color: 'white' }}>{mockData.targetSize.toLocaleString()}</span>
        </div>
        <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Executed:</span>
          <span style={{ fontWeight: '700', color: '#22c55e' }}>{mockData.executedVolume.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Remaining:</span>
          <span style={{ fontWeight: '700', color: '#f97316' }}>{(mockData.targetSize - mockData.executedVolume).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
