import React from 'react'
import styles from './BalloonAnalysis.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { MORBY, SELLER_FINANCE, SUBJECT_TO, STRATEGY_BADGES } from '../utils/offerStrategies'

export default function BalloonAnalysis() {
  const r = usePropertyStore(s => s.offerResults)
  const strategy = usePropertyStore(s => s.offerStrategy)
  if (!r) return null

  return (
    <Card icon="🎈" title="Balloon Analysis" badge={STRATEGY_BADGES[strategy]} section="balloon">
      <div className={styles.balloonAnalysis}>
        <div className={styles.baTitle}>At Balloon Year ({r.balloonYears})</div>
        <div className={styles.baRow}><span className={styles.label}>Projected Property Value</span><span className={styles.value}>{fmt(r.projectedValue)}</span></div>

        {strategy === MORBY && (
          <>
            <div className={styles.baRow}><span className={styles.label}>Seller Carry Remaining</span><span className={styles.value}>{fmt(r.sellerBalanceAtBalloon)}</span></div>
            <div className={styles.baRow}><span className={styles.label}>DSCR Loan Remaining</span><span className={styles.value}>{fmt(r.dscrBalanceAtBalloon)}</span></div>
          </>
        )}

        {strategy === SELLER_FINANCE && (
          <div className={styles.baRow}><span className={styles.label}>Seller Balance Remaining</span><span className={styles.value}>{fmt(r.sellerBalanceAtBalloon)}</span></div>
        )}

        {strategy === SUBJECT_TO && (
          <>
            <div className={styles.baRow}><span className={styles.label}>Existing Loan Remaining</span><span className={styles.value}>{fmt(r.existingBalanceAtBalloon)}</span></div>
            {r.sellerBalanceAtBalloon > 0 && (
              <div className={styles.baRow}><span className={styles.label}>Seller Carry Remaining</span><span className={styles.value}>{fmt(r.sellerBalanceAtBalloon)}</span></div>
            )}
          </>
        )}

        <div className={styles.baDivider} />
        <div className={styles.baRow}><span className={styles.label}>Total Payoff Needed</span><span className={styles.value}>{fmt(r.totalPayoff)}</span></div>
        <div className={styles.baRow}><span className={styles.label}>Max Refi Amount (Value x LTV)</span><span className={styles.value}>{fmt(r.maxRefi)}</span></div>
        <div className={styles.baDivider} />
        <div className={styles.baRow}>
          <span className={styles.label}>Surplus / Shortfall</span>
          <span className={styles.value} style={{ fontSize: 14, color: r.surplus >= 0 ? '#10b981' : '#ef4444' }}>
            {(r.surplus >= 0 ? '+' : '') + fmt(r.surplus)}
          </span>
        </div>
        <div className={`${styles.baVerdict} ${r.surplus >= 0 ? styles.pass : styles.fail}`}>
          {r.surplus >= 0 ? 'PASS — Refi covers balloon' : 'FAIL — Shortfall of ' + fmt(Math.abs(r.surplus))}
        </div>
      </div>
    </Card>
  )
}
