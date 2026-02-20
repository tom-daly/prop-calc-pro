import React from 'react'
import styles from './MetricsBar.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { fmt, fmtPct } from '../utils/format'

export default function OfferMetricsBar() {
  const r = usePropertyStore(s => s.offerResults)
  if (!r) return null

  const annualCF = r.monthlyCF * 12
  const annualDebt = r.totalMonthlyDebt * 12
  const dscrRatio = annualDebt > 0 ? r.noi / annualDebt : 0

  return (
    <div className={styles.metricsBar} data-section="metrics">
      <div className={styles.metric}>
        <div className={styles.label}>DSCR</div>
        <div className={styles.value}>{dscrRatio.toFixed(2)}</div>
        <div className={styles.sub}>NOI / Debt</div>
      </div>
      <div className={styles.metric}>
        <div className={styles.label}>Cap Rate</div>
        <div className={styles.value}>{fmtPct(r.capRate)}</div>
        <div className={styles.sub}>Unleveraged</div>
      </div>
      <div className={styles.metric}>
        <div className={styles.label}>Monthly Flow</div>
        <div className={styles.value} style={{ color: r.monthlyCF >= 0 ? '#10b981' : '#ef4444' }}>{fmt(r.monthlyCF)}</div>
        <div className={styles.sub}>After Debt</div>
      </div>
      <div className={`${styles.metric} ${styles.highlight}`}>
        <div className={styles.label}>Total Debt Svc</div>
        <div className={styles.value}>{fmt(r.totalMonthlyDebt)}</div>
        <div className={styles.sub}>/Month</div>
      </div>
    </div>
  )
}
