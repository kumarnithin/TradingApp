'use client'

import styles from './header.module.css'

export default function Header() {
  return (
    <header className={`${styles.header} glass`}>
      <div className={styles.headerContent}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
          />
          <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className={styles.rightActions}>
          <div className={styles.statusBadge}>
            <div className={`${styles.statusDot} animate-pulse`}></div>
            <span className={styles.statusText}>Connected</span>
          </div>
        </div>
      </div>
    </header>
  )
}
