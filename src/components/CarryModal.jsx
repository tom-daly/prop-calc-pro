import React, { useState, useEffect, useMemo } from 'react'
import styles from './CarryModal.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { computeCarrySchedule, calcExpenseYearly, getGrossMonthlyRent } from '../utils/calculations'
import { fmt } from '../utils/format'

export default function CarryModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('openCarryModal', handler)
    return () => document.removeEventListener('openCarryModal', handler)
  }, [])

  if (!open) return null

  return <CarryModalInner onClose={() => {
    setOpen(false)
    usePropertyStore.getState().recalculate()
    usePropertyStore.getState().saveData()
  }} />
}

function CarryModalInner({ onClose }) {
  const inputs = usePropertyStore(s => s.inputs)
  const carryTranches = usePropertyStore(s => s.carryTranches)
  const setCarryTranches = usePropertyStore(s => s.setCarryTranches)
  const expenseConfig = usePropertyStore(s => s.expenseConfig)
  const setInput = usePropertyStore(s => s.setInput)

  const purchasePrice = parseFloat(inputs.purchasePrice) || 0
  const closingCost = parseFloat(inputs.closingCostDscr) || 0
  const rehabCost = parseFloat(inputs.rehabCostDscr) || 0
  const carryMonths = parseFloat(inputs.carryMonths) || 0
  const defaultRate = parseFloat(inputs.carryRate) || 0
  const carryRentPercent = parseFloat(inputs.carryRentPercent) || 0

  const totalCashNeeded = purchasePrice + closingCost + rehabCost

  const scheduleData = useMemo(() =>
    computeCarrySchedule(purchasePrice, closingCost, rehabCost, carryMonths, defaultRate, carryTranches),
    [purchasePrice, closingCost, rehabCost, carryMonths, defaultRate, carryTranches]
  )

  const addTranche = () => {
    if (carryTranches.length >= 5) return
    const names = ['Seller Financing', 'Family/Friends', 'Hard Money', 'Private Lender', 'Bridge Loan']
    const defaultName = names[carryTranches.length] || `Tranche ${carryTranches.length + 1}`
    const usedAmount = carryTranches.reduce((sum, t) => sum + t.amount, 0)
    const remainingAmount = Math.max(0, totalCashNeeded - usedAmount)
    setCarryTranches([...carryTranches, { name: defaultName, amount: remainingAmount, rate: 0, points: 0 }])
  }

  const removeTranche = (index) => {
    setCarryTranches(carryTranches.filter((_, i) => i !== index))
  }

  const updateTranche = (index, field, value) => {
    const updated = [...carryTranches]
    updated[index] = { ...updated[index], [field]: field === 'name' ? value : (parseFloat(value) || 0) }
    setCarryTranches(updated)
  }

  const maxOutTranche = (index) => {
    const usedByOthers = carryTranches.reduce((sum, t, i) => i === index ? sum : sum + t.amount, 0)
    const remaining = Math.max(0, totalCashNeeded - usedByOthers)
    const updated = [...carryTranches]
    updated[index] = { ...updated[index], amount: remaining }
    setCarryTranches(updated)
  }

  const clearTranches = () => setCarryTranches([])

  // Carry period analysis
  const annualGrossRent = getGrossMonthlyRent(inputs) * 12

  const getMonthlyExpense = (field) => {
    const val = parseFloat(inputs[field]) || 0
    const config = expenseConfig[field]
    if (config.mode === 'pct') return (annualGrossRent * (val / 100)) / 12
    return config.freq === 'mo' ? val : val / 12
  }

  const monthlyExpenses = getMonthlyExpense('propTaxes') + getMonthlyExpense('insurance') + getMonthlyExpense('utilities')
  const monthlyRentPotential = getGrossMonthlyRent(inputs)
  const monthlyRentCollected = monthlyRentPotential * (carryRentPercent / 100)
  const monthlyCarryInterest = carryMonths > 0 ? scheduleData.totalInterest / carryMonths : 0
  const monthlyNetBurn = monthlyCarryInterest + monthlyExpenses - monthlyRentCollected
  const totalCarryPeriodCost = monthlyNetBurn * carryMonths
  const burnColor = monthlyNetBurn > 0 ? '#ef4444' : '#10b981'

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3>💰 Mixed Carry Details</h3>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>

        <div className={styles.twoCol}>
          <div>
            <div className={styles.trancheHeader}>
              <span>Name</span><span>Amount</span><span>Rate %</span><span>Points</span><span></span><span></span>
            </div>
            {carryTranches.length === 0 ? (
              <p className={styles.emptyMsg}>No tranches configured. All carry uses the default rate.</p>
            ) : carryTranches.map((t, i) => (
              <div key={i} className={styles.trancheRow}>
                <div className={styles.trInput}><input type="text" value={t.name} onChange={e => updateTranche(i, 'name', e.target.value)} /></div>
                <div className={styles.trInput}><span className={styles.trPrefix}>$</span><input type="number" value={t.amount} onChange={e => updateTranche(i, 'amount', e.target.value)} /></div>
                <div className={styles.trInput}><input type="number" value={t.rate} step="0.1" onChange={e => updateTranche(i, 'rate', e.target.value)} /><span className={styles.trSuffix}>%</span></div>
                <div className={styles.trInput}><input type="number" value={t.points || 0} step="0.5" onChange={e => updateTranche(i, 'points', e.target.value)} /><span className={styles.trSuffix}>pts</span></div>
                <button className={styles.maxBtn} onClick={() => maxOutTranche(i)} title="Max out">⤢</button>
                <button className={styles.removeBtn} onClick={() => removeTranche(i)}>×</button>
              </div>
            ))}
            <button className={styles.addBtn} disabled={carryTranches.length >= 5} onClick={addTranche}>+ Add Tranche</button>

            {scheduleData.defaultAllocation > 0 && (
              <div className={styles.remainderInfo}>
                <strong>Remainder:</strong> ${scheduleData.defaultAllocation.toLocaleString()} at {defaultRate}% (default rate)
              </div>
            )}

            <div className={styles.carrySummary}>
              {scheduleData.trancheAllocations.filter(t => t.allocated > 0).map((t, i) => (
                <div key={i} className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t.name} (${t.allocated.toLocaleString()} @ {t.rate}%{t.points ? ` + ${t.points}pts` : ''})</span>
                  <span className={styles.summaryValue}>${Math.round(t.allocated * (t.rate / 100) * (carryMonths / 12) + t.allocated * ((t.points || 0) / 100)).toLocaleString()}</span>
                </div>
              ))}
              {scheduleData.defaultAllocation > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Remainder (${scheduleData.defaultAllocation.toLocaleString()} @ {defaultRate}%)</span>
                  <span className={styles.summaryValue}>${Math.round(scheduleData.defaultAllocation * (defaultRate / 100) * (carryMonths / 12)).toLocaleString()}</span>
                </div>
              )}
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span className={styles.summaryLabel}>Total Carry Cost ({carryMonths} mo{scheduleData.totalPoints > 0 ? ' + points' : ''})</span>
                <span className={styles.summaryValue}>${Math.round(scheduleData.totalCarryCost).toLocaleString()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Blended Rate</span>
                <span className={styles.summaryValue}>{scheduleData.blendedRate.toFixed(2)}%</span>
              </div>
            </div>

            <div className={styles.rentSection}>
              <div className={styles.rentRow}>
                <label>Rent During Carry</label>
                <div className={styles.rentInput}>
                  <input type="number" value={inputs.carryRentPercent} min="0" max="100"
                    onChange={e => setInput('carryRentPercent', e.target.value)} />
                  <span>%</span>
                </div>
              </div>
              <div className={styles.analysis}>
                <div className={styles.analysisRow}><span>Monthly Carry Interest:</span><span style={{ color: '#ef4444' }}>-${Math.round(monthlyCarryInterest).toLocaleString()}</span></div>
                <div className={styles.analysisRow}><span>Monthly Expenses:</span><span style={{ color: '#ef4444' }}>-${Math.round(monthlyExpenses).toLocaleString()}</span></div>
                <div className={styles.analysisRow}><span>Monthly Rent ({carryRentPercent}%):</span><span style={{ color: '#10b981' }}>+${Math.round(monthlyRentCollected).toLocaleString()}</span></div>
                <div className={styles.analysisTotal}><span>Monthly Net:</span><span style={{ color: burnColor }}>{monthlyNetBurn > 0 ? '-' : '+'}${Math.abs(Math.round(monthlyNetBurn)).toLocaleString()}</span></div>
                <div className={styles.analysisFinal}><span>{carryMonths}mo Total:</span><span style={{ color: totalCarryPeriodCost > 0 ? '#ef4444' : '#10b981' }}>{totalCarryPeriodCost > 0 ? '-' : '+'}${Math.abs(Math.round(totalCarryPeriodCost)).toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          <div>
            <h4 className={styles.scheduleTitle}>Monthly Payment Schedule (Interest Only)</h4>
            <div className={styles.scheduleBorder}>
              <table className={styles.scheduleTable}>
                <thead>
                  <tr>
                    <th>Month</th>
                    {scheduleData.trancheAllocations.filter(t => t.allocated > 0).map((t, i) => <th key={i}>{t.name}</th>)}
                    {scheduleData.defaultAllocation > 0 && <th>Remainder</th>}
                    <th className={styles.totalCol}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.schedule.map(row => (
                    <tr key={row.month}>
                      <td className={styles.monthCol}>{row.month}</td>
                      {scheduleData.trancheAllocations.map((t, i) => t.allocated > 0 ? <td key={i}>${Math.round(row[`tranche${i}`]).toLocaleString()}</td> : null)}
                      {scheduleData.defaultAllocation > 0 && <td>${Math.round(row.default).toLocaleString()}</td>}
                      <td className={styles.totalCol}>${Math.round(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total</strong></td>
                    {scheduleData.trancheAllocations.map((t, i) => t.allocated > 0 ? <td key={i}>${Math.round(scheduleData.schedule.reduce((sum, row) => sum + row[`tranche${i}`], 0)).toLocaleString()}</td> : null)}
                    {scheduleData.defaultAllocation > 0 && <td>${Math.round(scheduleData.schedule.reduce((sum, row) => sum + row.default, 0)).toLocaleString()}</td>}
                    <td className={styles.totalCol}>${Math.round(scheduleData.totalInterest).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnClear} onClick={clearTranches}>Clear All</button>
          <button className={styles.btnDone} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
