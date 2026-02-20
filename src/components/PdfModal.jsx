import React, { useState, useEffect } from 'react'
import styles from './PdfModal.module.css'
import usePropertyStore from '../store/usePropertyStore'
import PrintView from './PrintView'

const SECTIONS = [
  { key: 'acquisition', label: 'Acquisition Details', icon: '💰' },
  { key: 'revenue', label: 'Revenue & Occupancy', icon: '📈' },
  { key: 'expenses', label: 'Operating Expenses', icon: '🔧' },
  { key: 'growth', label: 'Growth Assumptions', icon: '📈' },
  { key: 'metrics', label: 'Key Metrics & P&L', icon: '📊' },
  { key: 'milestones', label: 'Growth & Exit Milestones', icon: '⏱️' },
  { key: 'asset-debt', label: 'Asset/Debt Chart', icon: '📊' },
  { key: 'stress-test', label: 'Stress Test', icon: '🔥', modes: ['traditional', 'dscr'] },
  { key: 'balloon', label: 'Balloon Analysis', icon: '🎈', modes: ['offer'] },
  { key: 'amortization', label: 'Year-by-Year Amortization', icon: '📋', modes: ['offer'] },
]

const STORAGE_KEY = 'propcalc_pdf_sections'
const DEFAULT_ON = ['acquisition', 'growth', 'revenue', 'expenses', 'metrics', 'milestones']

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set(DEFAULT_ON)
}

function savePref(selected) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]))
}

export default function PdfModal() {
  const [open, setOpen] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [selected, setSelected] = useState(loadSaved)
  const mode = usePropertyStore(s => s.currentMode)
  const propertyName = usePropertyStore(s => s.inputs.propertyName)

  useEffect(() => {
    const handler = () => {
      setSelected(loadSaved())
      setOpen(true)
    }
    document.addEventListener('openPdfModal', handler)
    return () => document.removeEventListener('openPdfModal', handler)
  }, [])

  if (showPrintView) {
    return <PrintView sections={selected} onClose={() => setShowPrintView(false)} />
  }

  if (!open) return null

  const visible = SECTIONS.filter(s => !s.modes || s.modes.includes(mode))

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      savePref(next)
      return next
    })
  }

  const selectAll = () => { const s = new Set(visible.map(s => s.key)); savePref(s); setSelected(s) }
  const selectNone = () => { const s = new Set(); savePref(s); setSelected(s) }

  const handleExport = () => {
    const origTitle = document.title
    document.title = propertyName || 'PropCalc Pro Report'
    setOpen(false)
    setShowPrintView(true)
    // Restore title after print dialog
    const restoreTitle = () => { document.title = origTitle }
    window.addEventListener('afterprint', restoreTitle, { once: true })
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3>📄 Export to PDF</h3>
          <button onClick={() => setOpen(false)} className={styles.close}>&times;</button>
        </div>
        <p className={styles.subtitle}>Select sections to include in your report:</p>
        <div className={styles.quickActions}>
          <button onClick={selectAll} className={styles.quickBtn}>Select All</button>
          <button onClick={selectNone} className={styles.quickBtn}>Select None</button>
        </div>
        <div className={styles.list}>
          {visible.map(s => (
            <label key={s.key} className={styles.item}>
              <input
                type="checkbox"
                checked={selected.has(s.key)}
                onChange={() => toggle(s.key)}
                className={styles.checkbox}
              />
              <span className={styles.icon}>{s.icon}</span>
              <span className={styles.label}>{s.label}</span>
            </label>
          ))}
        </div>
        <div className={styles.footer}>
          <button onClick={() => setOpen(false)} className={styles.btnCancel}>Cancel</button>
          <button onClick={handleExport} className={styles.btnExport} disabled={selected.size === 0}>
            📄 Preview & Print
          </button>
        </div>
      </div>
    </div>
  )
}
