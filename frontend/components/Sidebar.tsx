'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './sidebar.module.css'
//import AccountSwitcher from './AccountSwitcher'  // ← ADD THIS IMPORT

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Signals', href: '/dashboard/signals', icon: '🔔' },
  { name: 'Trades', href: '/dashboard/trades', icon: '💰' },
  { name: 'Generator', href: '/dashboard/generator', icon: '📡' },
  { name: 'Accounts', href: '/dashboard/accounts', icon: '🏢' },  // ← ADD THIS
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
  { name: 'Risk Manager', href: '/dashboard/risk', icon: '⚠️' },
  { name: 'Alerts', href: '/dashboard/alerts', icon: '🔔' },
  { name: 'Strategies', href: '/dashboard/strategies', icon: '🎯' },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: '💼' },
  { name: 'LIT Suite', href: '/dashboard/lit', icon: '🎯' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div>
      {/* Account Switcher at Top */}
      <div style={{ padding: '2rem' }}>
        
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e5e7eb' }} />

      {/* Navigation Links */}
      <nav className={styles.nav}>
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${
              pathname === item.href ? styles.active : ''
            }`}
            title={item.name}
          >
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}