'use client'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import styles from './dashboard.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.dashboardWrapper}>
      <Sidebar />
      <div className={styles.dashboardMain}>
        <Header />
        <main className={styles.dashboardContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
