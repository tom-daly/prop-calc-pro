import React, { useState } from 'react'
import styles from './ExpensesCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'

const EXPENSES = [
  { field: 'propTaxes', name: 'Property Taxes', hasFreq: true },
  { field: 'insurance', name: 'Insurance', hasFreq: true },
  { field: 'maintenance', name: 'Maintenance', hasFreq: false, pctLabel: 'GROSS %' },
  { field: 'utilities', name: 'Utilities', hasFreq: true, expandable: true },
  { field: 'propMgmt', name: 'Property Mgmt', hasFreq: false, pctLabel: 'GROSS %' },
  { field: 'capex', name: 'Capex Reserve', hasFreq: false, pctLabel: 'GROSS %' },
  { field: 'mortgageIns', name: 'Mortgage Insurance', hasFreq: true },
]

const UTILITY_SUBS = [
  { id: 'utilElectric', name: 'Electric' },
  { id: 'utilGas', name: 'Gas/Heat' },
  { id: 'utilWater', name: 'Water/Sewer' },
  { id: 'utilTrash', name: 'Trash' },
  { id: 'utilLawn', name: 'Lawn/Snow' },
  { id: 'utilOther', name: 'Other' },
]

export default function ExpensesCard() {
  const results = usePropertyStore(s => s.results)
  const [utilExpanded, setUtilExpanded] = useState(false)

  return (
    <Card icon="🔧" title="Operating Expenses" badge="LOGIC ENGINE" section="expenses">
      <table className={styles.expensesTable}>
        <thead>
          <tr>
            <th>Expense</th>
            <th>Basis</th>
            <th>Freq</th>
            <th style={{ textAlign: 'right' }}>Yearly</th>
          </tr>
        </thead>
        <tbody>
          {EXPENSES.map(exp => (
            <React.Fragment key={exp.field}>
              <ExpenseRow
                {...exp}
                yearly={results?.expenseYearly?.[exp.field]}
                onToggleExpand={exp.expandable ? () => setUtilExpanded(!utilExpanded) : undefined}
                expanded={utilExpanded}
              />
              {exp.expandable && utilExpanded && <UtilityBreakdown />}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className={styles.expenseTotal}>
        <span className={styles.etLabel}>Net Operating Expenses</span>
        <span className={styles.etValue}>{results ? fmt(results.totalExpenses) : '$0'}</span>
      </div>
    </Card>
  )
}

function ExpenseRow({ field, name, hasFreq, pctLabel, yearly, onToggleExpand, expanded }) {
  const value = usePropertyStore(s => s.inputs[field])
  const config = usePropertyStore(s => s.expenseConfig[field])
  const setInput = usePropertyStore(s => s.setInput)
  const setExpenseConfig = usePropertyStore(s => s.setExpenseConfig)

  return (
    <tr>
      <td className={styles.expenseName}>
        {onToggleExpand && (
          <span className={`${styles.expandToggle} ${expanded ? styles.open : ''}`} onClick={onToggleExpand}>▶</span>
        )}
        {name}
      </td>
      <td>
        <div className={styles.expenseInputWrap}>
          <span className={styles.prefix}>{config.mode === 'pct' ? '%' : '$'}</span>
          <input type="number" value={value} placeholder="0" onChange={e => setInput(field, e.target.value)} />
        </div>
      </td>
      <td>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggleBtn} ${config.mode === 'pct' ? styles.active : ''}`}
            onClick={() => setExpenseConfig(field, { mode: 'pct' })}>%</button>
          <button className={`${styles.toggleBtn} ${config.mode === 'dollar' ? styles.active : ''}`}
            onClick={() => setExpenseConfig(field, { mode: 'dollar' })}>$</button>
        </div>
        {hasFreq ? (
          <div className={styles.toggleGroup} style={{ marginLeft: 4 }}>
            <button className={`${styles.toggleBtn} ${config.freq === 'mo' ? styles.active : ''}`}
              onClick={() => setExpenseConfig(field, { freq: 'mo' })}>MO</button>
            <button className={`${styles.toggleBtn} ${config.freq === 'yr' ? styles.active : ''}`}
              onClick={() => setExpenseConfig(field, { freq: 'yr' })}>YR</button>
          </div>
        ) : pctLabel ? (
          <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-muted)' }}>{pctLabel}</span>
        ) : null}
      </td>
      <td className={styles.expenseYearly}>{yearly !== undefined ? fmt(yearly) : '$0'}</td>
    </tr>
  )
}

function UtilityBreakdown() {
  const inputs = usePropertyStore(s => s.inputs)
  const setInput = usePropertyStore(s => s.setInput)
  const setInputBatch = usePropertyStore(s => s.setInputBatch)

  const sumUtilities = (changedId, changedValue) => {
    const vals = {}
    UTILITY_SUBS.forEach(u => {
      vals[u.id] = u.id === changedId ? (parseFloat(changedValue) || 0) : (parseFloat(inputs[u.id]) || 0)
    })
    const total = Object.values(vals).reduce((sum, v) => sum + v, 0)
    if (total > 0) {
      setInputBatch({ [changedId]: changedValue, utilities: String(total) })
    } else {
      setInput(changedId, changedValue)
    }
  }

  return UTILITY_SUBS.map(u => (
    <tr key={u.id} className={styles.utilityDetail}>
      <td style={{ paddingLeft: 24, color: 'var(--text-muted)' }}>↳ {u.name}</td>
      <td>
        <div className={styles.expenseInputWrap} style={{ width: 80 }}>
          <span className={styles.prefix}>$</span>
          <input type="number" value={inputs[u.id]} onChange={e => sumUtilities(u.id, e.target.value)} />
        </div>
      </td>
      <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/MO</span></td>
      <td className={styles.expenseYearly}>{fmt((parseFloat(inputs[u.id]) || 0) * 12)}</td>
    </tr>
  ))
}
