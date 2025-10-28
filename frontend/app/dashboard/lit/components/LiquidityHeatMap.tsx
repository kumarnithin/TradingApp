'use client'

interface LiquidityProps {
  symbol: string
  data?: any
}

export default function LiquidityHeatMap({ symbol, data }: LiquidityProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const liquidityData = [
    [25, 30, 45, 60, 75, 85, 90, 95, 92, 88, 82, 75, 72, 68, 65, 70, 78, 85, 80, 72, 60, 50, 38, 28],
    [28, 32, 48, 62, 78, 87, 92, 96, 94, 90, 85, 78, 75, 72, 70, 75, 82, 88, 85, 75, 65, 55, 42, 32],
    [22, 28, 42, 58, 72, 82, 88, 92, 90, 85, 78, 70, 68, 65, 62, 68, 75, 80, 75, 68, 55, 45, 32, 25],
    [30, 35, 50, 65, 80, 90, 95, 98, 96, 92, 88, 82, 80, 78, 75, 80, 85, 90, 88, 78, 68, 58, 45, 35],
    [25, 30, 45, 60, 75, 85, 90, 95, 92, 88, 82, 75, 72, 68, 65, 70, 78, 85, 80, 72, 60, 50, 38, 28]
  ]

  const getColor = (value: number) => {
    if (value > 80) return '#22c55e'
    if (value > 60) return '#06b6d4'
    if (value > 40) return '#f97316'
    return '#ef4444'
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(138,180,248,0.1)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: '0 0 20px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>🔥</span> Liquidity Heat Map
      </h3>

      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <div style={{ minWidth: '100%', display: 'table' }}>
          <div style={{ display: 'table-row' }}>
            <div style={{ display: 'table-cell', padding: '8px', width: '50px' }}></div>
            {hours.map(h => (
              <div key={h} style={{ display: 'table-cell', padding: '8px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)', minWidth: '40px' }}>
                {h}:00
              </div>
            ))}
          </div>

          {days.map((day, dayIdx) => (
            <div key={day} style={{ display: 'table-row' }}>
              <div style={{ display: 'table-cell', padding: '8px', fontSize: '11px', fontWeight: '600', color: 'white', width: '50px' }}>
                {day}
              </div>
              {liquidityData[dayIdx].map((value, hourIdx) => (
                <div
                  key={hourIdx}
                  style={{
                    display: 'table-cell',
                    padding: '8px',
                    background: getColor(value),
                    opacity: 0.7,
                    minWidth: '40px',
                    textAlign: 'center',
                    fontSize: '9px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s'
                  }}
                  title={`${day} ${hourIdx}:00 - Liquidity: ${value}%`}
                >
                  {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#22c55e', borderRadius: '4px' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>High (&gt;80%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#06b6d4', borderRadius: '4px' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Good (60-80%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#f97316', borderRadius: '4px' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Moderate (40-60%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '4px' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Low (&lt;40%)</span>
        </div>
      </div>
    </div>
  )
}
