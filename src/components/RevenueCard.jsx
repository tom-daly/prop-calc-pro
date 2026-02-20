import React from 'react'
import styles from './RevenueCard.module.css'
import Card from './Card'
import usePropertyStore, { MAX_UNITS } from '../store/usePropertyStore'
import { fmt } from '../utils/format'

function UnitBox({ index, unit, isOnly }) {
  const setUnitInput = usePropertyStore(s => s.setUnitInput)
  const removeUnit = usePropertyStore(s => s.removeUnit)

  return (
    <div className={styles.unitBox}>
      <div className={styles.unitHeader}>
        <div className={styles.unitTitle}>Unit {index + 1} Income</div>
        {!isOnly && (
          <button className={styles.removeBtn} onClick={() => removeUnit(index)} title="Remove unit">&times;</button>
        )}
      </div>
      <div className={styles.bedBathRow}>
        <div className={styles.inputGroup}>
          <label>Beds</label>
          <div className={styles.inputWrap}>
            <input type="number" value={unit.beds} placeholder="—" min="0" onChange={e => setUnitInput(index, 'beds', e.target.value)} />
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>Bath</label>
          <div className={styles.inputWrap}>
            <input type="number" value={unit.bath} placeholder="—" min="0" step="0.5" onChange={e => setUnitInput(index, 'bath', e.target.value)} />
          </div>
        </div>
      </div>
      <div className={styles.inputGroup}>
        <label>Monthly Rent</label>
        <div className={styles.inputWrap}>
          <span className={styles.prefix}>$</span>
          <input type="number" value={unit.rent} placeholder="0" onChange={e => setUnitInput(index, 'rent', e.target.value)} />
        </div>
      </div>
      <div className={styles.inputGroup}>
        <label>Misc (Parking/Pet)</label>
        <div className={styles.inputWrap}>
          <span className={styles.prefix}>$</span>
          <input type="number" value={unit.misc} placeholder="0" onChange={e => setUnitInput(index, 'misc', e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function RevenueCard() {
  const results = usePropertyStore(s => s.results)
  const units = usePropertyStore(s => s.inputs.units)
  const vacancyRate = usePropertyStore(s => s.inputs.vacancyRate)
  const setInput = usePropertyStore(s => s.setInput)
  const addUnit = usePropertyStore(s => s.addUnit)

  return (
    <Card icon="📈" title="Revenue & Occupancy" badge="INCOME PROFILE" section="revenue">
      <div className={styles.unitsGrid}>
        {units.map((unit, i) => (
          <UnitBox key={i} index={i} unit={unit} isOnly={units.length === 1} />
        ))}
        {units.length < MAX_UNITS && (
          <button className={styles.addUnitBtn} onClick={addUnit}>+ Add Unit</button>
        )}
      </div>
      <div className={styles.bottomRow}>
        <div className={styles.revenueBox}>
          <div className={styles.rvLabel}>Total Monthly Revenue</div>
          <div className={styles.rvValue}>{results ? fmt(results.grossMonthlyRent) : '$0'}</div>
        </div>
        <div className={styles.inputGroup}>
          <label>Vacancy Rate (%)</label>
          <div className={styles.inputWrap} style={{ width: 80 }}>
            <input type="number" value={vacancyRate} placeholder="0" onChange={e => setInput('vacancyRate', e.target.value)} />
          </div>
        </div>
      </div>
    </Card>
  )
}
