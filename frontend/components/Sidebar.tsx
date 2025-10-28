'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './sidebar.module.css'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Signals', href: '/dashboard/signals', icon: '🔔' },
  { name: 'Trades', href: '/dashboard/trades', icon: '💰' },
  { name: 'Generator', href: '/dashboard/generator', icon: '📡' },  // ADD THIS
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' }, 
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
  { name: 'Risk Manager', href: '/dashboard/risk', icon: '⚠️' }, // Add this line
  { name: 'Alerts', href: '/dashboard/alerts', icon: '🔔' },
  { name: 'Strategies', href: '/dashboard/strategies', icon: '🎯' },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: '💼' },
  { name: 'LIT Suite', href: '/dashboard/lit', icon: '🎯' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className={`${styles.sidebar} glass`}>
      <div className={styles.logoSection}>
        <div className={styles.logoContent}>
          <div className={styles.logoIcon}>🚀</div>
          <span className={styles.logoText}>TradingBot</span>
        </div>
      </div>
      
      <nav className={styles.navSection}>
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <div className={styles.navIcon}>{item.icon}</div>
            <span className={styles.navText}>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>D</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Demo User</div>
            <div className={styles.userStatus}>Paper Trading</div>
          </div>
          <div className={`${styles.statusDot} animate-pulse`}></div>
        </div>
      </div>
    </div>
  )
}
