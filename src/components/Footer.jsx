import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer} data-print="hide">
      <span>PropCalc Pro — Real Estate Investment Analysis</span>
      <span className={styles.disclaimer}>For educational purposes only. Not financial advice.</span>
    </footer>
  )
}
