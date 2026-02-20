import React from 'react'
import styles from './GrowthCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'

export default function GrowthCard() {
  const inputs = usePropertyStore(s => s.inputs)
  const setInput = usePropertyStore(s => s.setInput)

  return (
    <Card icon="📈" title="Growth Assumptions" badge="ANNUAL %" style={{ padding: '10px 14px' }} section="growth">
      <div className={styles.grid3}>
        <div className={styles.inputGroup}>
          <label>Appreciation</label>
          <div className={styles.inputWrap}>
            <input type="number" value={inputs.appreciationRate} placeholder="3" step="0.5"
              onChange={e => setInput('appreciationRate', e.target.value)} />
            <span className={styles.suffix}>%</span>
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>Rent Growth</label>
          <div className={styles.inputWrap}>
            <input type="number" value={inputs.rentGrowth} placeholder="2" step="0.5"
              onChange={e => setInput('rentGrowth', e.target.value)} />
            <span className={styles.suffix}>%</span>
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>Cost Increase</label>
          <div className={styles.inputWrap}>
            <input type="number" value={inputs.costIncrease} placeholder="2" step="0.5"
              onChange={e => setInput('costIncrease', e.target.value)} />
            <span className={styles.suffix}>%</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
