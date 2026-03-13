import React from 'react'
import styles from './MilestonesCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { OFFER } from '../utils/modes'

function Milestone({ yearLabel, equity, debt, flow, monthlyCF, netGain }) {
  return (
    <div className={styles.milestone}>
      <div className={styles.milestoneHeader}>
        <span>📅</span>
        <span>{yearLabel}</span>
      </div>
      <div className={styles.milestoneRow}>
        <span className={styles.label}>Est. Equity</span>
        <span className={styles.value}>{fmt(equity)}</span>
      </div>
      <div className={styles.milestoneRow}>
        <span className={styles.label}>Debt Remaining</span>
        <span className={`${styles.value} ${styles.red}`}>{fmt(debt)}</span>
      </div>
      <div className={styles.milestoneRow}>
        <span className={styles.label}>Monthly Cash Flow</span>
        <span className={`${styles.value} ${monthlyCF >= 0 ? styles.green : styles.red}`}>{fmt(monthlyCF)}/mo</span>
      </div>
      <div className={styles.milestoneRow}>
        <span className={styles.label}>Total Flow (Cumul.)</span>
        <span className={`${styles.value} ${flow >= 0 ? styles.green : styles.red}`}>{(flow >= 0 ? '+' : '') + fmt(flow)}</span>
      </div>
      <div className={styles.netGain}>
        <div className={styles.netGainLabel}>Total Net Gain</div>
        <div className={styles.netGainValue}>{fmt(netGain)}</div>
      </div>
    </div>
  )
}

export default function MilestonesCard() {
  const mode = usePropertyStore(s => s.currentMode)
  const mainResults = usePropertyStore(s => s.results)
  const offerResults = usePropertyStore(s => s.offerResults)
  const results = mode === OFFER ? offerResults : mainResults
  if (!results) return null

  return (
    <Card icon="⏱️" title="Growth & Exit Milestones" section="milestones"
      badge={<><span>● EQUITY BASIS</span> <span style={{ color: 'var(--primary)', marginLeft: 12 }}>● NET PROFIT</span></>}>
      <div className={styles.milestones}>
        <Milestone
          yearLabel="YEAR 1"
          equity={results.equity1}
          debt={results.balance1}
          flow={results.flow1}
          monthlyCF={results.monthlyCF1 || 0}
          netGain={results.netGain1}
        />
        <Milestone
          yearLabel="YEAR 5"
          equity={results.equity5}
          debt={results.balance5}
          flow={results.flow5}
          monthlyCF={results.monthlyCF5 || 0}
          netGain={results.netGain5}
        />
        <Milestone
          yearLabel="YEAR 10"
          equity={results.equity10}
          debt={results.balance10}
          flow={results.flow10}
          monthlyCF={results.monthlyCF10 || 0}
          netGain={results.netGain10}
        />
      </div>
    </Card>
  )
}
