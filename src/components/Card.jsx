import React from 'react'
import styles from './Card.module.css'

export default function Card({ icon, title, badge, children, style, section }) {
  return (
    <div className={styles.card} style={style} data-section={section}>
      {(title || badge) && (
        <div className={styles.cardHeader}>
          <span>{icon} {title}</span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      )}
      {children}
    </div>
  )
}
