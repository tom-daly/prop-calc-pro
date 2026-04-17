import React from 'react'
import styles from './OfferMetricsBar.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { fmt, fmtPct } from '../utils/format'

export default function OfferMetricsBar() {
  const r = usePropertyStore(s => s.offerResults)
  if (!r) return null

  const annualCF = r.monthlyCF * 12
  const annualDebt = r.totalMonthlyDebt * 12
  const dscrRatio = annualDebt > 0 ? r.noi / annualDebt : 0

  // Cash basis depends on strategy: Morby = DSCR loan (down payment), SF = down payment, SubTo = equity buyout
  const cashBasis = r.dscrLoanAmount || r.sfDownAmt || r.equityPayment || 0
  const cashOnCash = cashBasis > 0 ? (annualCF / cashBasis) * 100 : 0

  return (
    <div className={styles.bar} data-section="metrics">
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
        <div className={styles.label}>Cash-on-Cash</div>
        <div className={styles.value}>{cashBasis > 0 ? fmtPct(cashOnCash) : '∞'}</div>
        <div className={styles.sub}>{cashBasis > 0 ? fmt(cashBasis) + ' basis' : 'No cash in'}</div>
      </div>
    </div>
  )
}
