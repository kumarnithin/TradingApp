'use client'

import Sidebar from '@/components/Sidebar'
import AccountSwitcher from '@/components/AccountSwitcher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Sidebar - Left Side (Fixed Width) */}
      <div
        style={{
          width: '250px',
          background: '#1e293b',
          borderRight: '1px solid #334155',
          overflowY: 'auto',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
        }}
      >
        <Sidebar />
      </div>

      {/* Main Content - Right Side */}
      <div
        style={{
          marginLeft: '250px',
          flex: 1,
          overflowY: 'auto',
          background: '#0f172a',
        }}
      >
        {/* Account Switcher Header - Top Right */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '2rem 2rem 1rem 2rem',
            borderBottom: '1px solid #334155',
          }}
        >
          <AccountSwitcher />
        </div>

        {/* Main Page Content */}
        <div style={{ padding: '1.5rem 2rem 2rem 2rem', minHeight: '80vh' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
