import React from 'react'
import styles from './ModeTabs.module.css'
import usePropertyStore from '../store/usePropertyStore'

const MODES = [
  { key: 'traditional', label: 'Traditional' },
  { key: 'dscr', label: 'Cash-Carry-Refi-DSCR' },
  { key: 'offer', label: 'Offer' },
]

export default function ModeTabs() {
  const mode = usePropertyStore(s => s.currentMode)
  const setMode = usePropertyStore(s => s.setMode)

  return (
    <div className={styles.modeTabs}>
      {MODES.map(m => (
        <button
          key={m.key}
          className={`${styles.modeTab} ${mode === m.key ? styles.active : ''}`}
          onClick={() => setMode(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
