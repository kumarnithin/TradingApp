'use client'

import styles from './statcard.module.css'

interface StatCardProps {
  title: string
  value: string
  change?: number
  icon: string
  gradient: string
}

export default function StatCard({ title, value, change, icon, gradient }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div className={`${styles.card} glass-light`}>
      <div className={styles.header}>
        <div className={`${styles.iconContainer} ${gradient}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
        {change !== undefined && (
          <div className={`${styles.changeIndicator} ${isPositive ? styles.positive : styles.negative}`}>
            <span className={styles.arrow}>{isPositive ? '↗' : '↘'}</span>
            <span className={styles.changeValue}>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  )
}
