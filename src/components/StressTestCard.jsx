import React from 'react'
import styles from './StressTestCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'

export default function StressTestCard() {
  const stressResults = usePropertyStore(s => s.stressResults)

  return (
    <Card icon="🔥" title="Stress Test" badge="SENSITIVITY" section="stress-test">
      <div className={styles.stressContainer}>
        <table className={styles.stressTable}>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>DSCR</th>
              <th>Monthly CF</th>
              <th>CoC</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stressResults.map((s, i) => (
              <tr key={i} className={s.isBase ? styles.baseCase : ''}>
                <td className={styles.scenarioName}>{s.name}</td>
                <td>{s.dscr.toFixed(2)}</td>
                <td className={s.monthlyCF >= 0 ? styles.valuePositive : styles.valueNegative}>
                  ${Math.round(s.monthlyCF).toLocaleString()}
                </td>
                <td className={s.coc >= 0 ? styles.valuePositive : styles.valueNegative}>
                  {s.coc.toFixed(1)}%
                </td>
                <td className={styles[s.statusClass]}>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
