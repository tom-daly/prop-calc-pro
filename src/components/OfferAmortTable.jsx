import React from 'react'
import styles from './OfferAmortTable.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { MORBY, SELLER_FINANCE, SUBJECT_TO, STRATEGY_BADGES } from '../utils/offerStrategies'

export default function OfferAmortTable() {
  const r = usePropertyStore(s => s.offerResults)
  const strategy = usePropertyStore(s => s.offerStrategy)
  if (!r) return null

  return (
    <Card icon="📋" title="Year-by-Year Amortization" badge={STRATEGY_BADGES[strategy]} section="amortization">
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.offerAmortTable}>
          <thead>
            <tr>
              <th>Year</th>
              <th>Property Value</th>
              {strategy === MORBY && <th>DSCR Balance</th>}
              {strategy === MORBY && <th>Seller Balance</th>}
              {strategy === SELLER_FINANCE && <th>Seller Balance</th>}
              {strategy === SUBJECT_TO && <th>Existing Loan Bal</th>}
              {strategy === SUBJECT_TO && <th>Seller Carry Bal</th>}
              <th>Total Debt</th>
              <th>Equity</th>
              <th>Annual CF</th>
              <th>Cumul. CF</th>
            </tr>
          </thead>
          <tbody>
            {r.amortRows.map(row => (
              <tr key={row.year} className={row.isBalloon ? styles.balloonRow : ''}>
                <td>{row.year}{row.isBalloon ? ' *' : ''}</td>
                <td>{fmt(row.propValue)}</td>
                {strategy === MORBY && <td>{fmt(row.dscrBal)}</td>}
                {strategy === MORBY && <td>{fmt(row.sellerBal)}</td>}
                {strategy === SELLER_FINANCE && <td>{fmt(row.sellerBal)}</td>}
                {strategy === SUBJECT_TO && <td>{fmt(row.existingBal)}</td>}
                {strategy === SUBJECT_TO && <td>{fmt(row.sellerBal)}</td>}
                <td>{fmt(row.totalDebt)}</td>
                <td>{fmt(row.equity)}</td>
                <td style={{ color: row.annualCF >= 0 ? '#10b981' : '#ef4444' }}>{fmt(row.annualCF)}</td>
                <td style={{ color: row.cumulativeCF >= 0 ? '#10b981' : '#ef4444' }}>{fmt(row.cumulativeCF)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
