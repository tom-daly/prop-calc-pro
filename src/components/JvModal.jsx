import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import styles from './JvModal.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { runJvSimulation, getCarryCost, calcExpenseYearly, calculateMortgage, getGrossMonthlyRent } from '../utils/calculations'
import { fmt } from '../utils/format'

export default function JvModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('openJvModal', handler)
    return () => document.removeEventListener('openJvModal', handler)
  }, [])

  if (!open) return null

  return <JvModalInner onClose={() => {
    const state = usePropertyStore.getState()
    // Sync split back
    state.setInput('jvSplitMain', String(state.jvConfig.splitYou))
    state.recalculate()
    state.saveData()
    setOpen(false)
  }} />
}

function JvModalInner({ onClose }) {
  const inputs = usePropertyStore(s => s.inputs)
  const jvConfig = usePropertyStore(s => s.jvConfig)
  const setJvConfig = usePropertyStore(s => s.setJvConfig)
  const expenseConfig = usePropertyStore(s => s.expenseConfig)
  const carryTranches = usePropertyStore(s => s.carryTranches)
  const canvasRef = useRef(null)

  const [splitYou, setSplitYou] = useState(parseFloat(inputs.jvSplitMain) || 100)
  const [refiMonth, setRefiMonth] = useState(jvConfig.refiMonth)
  const [paybackMonths, setPaybackMonths] = useState(jvConfig.paybackMonths)
  const [monthsToProject, setMonthsToProject] = useState(jvConfig.monthsToProject)

  const [compareMonth1, setCompareMonth1] = useState(4)
  const [compareMonth2, setCompareMonth2] = useState(6)
  const [showLegend, setShowLegend] = useState(false)
  const [comparisonResults, setComparisonResults] = useState(null)

  // Compute JV inputs from main DSCR calc
  const jvData = useMemo(() => {
    const purchasePrice = parseFloat(inputs.purchasePrice) || 0
    const closingCost = parseFloat(inputs.closingCostDscr) || 0
    const rehabCost = parseFloat(inputs.rehabCostDscr) || 0
    const exitArv = parseFloat(inputs.exitArv) || 0
    const dscrLtv = parseFloat(inputs.dscrLtv) || 0
    const carryMonthsVal = parseFloat(inputs.carryMonths) || 0
    const carryRate = parseFloat(inputs.carryRate) || 0
    const interestRate = parseFloat(inputs.interestRate) || 0
    const loanTerm = parseFloat(inputs.loanTerm) || 30

    const totalCashNeeded = purchasePrice + closingCost + rehabCost
    const carryAmount = getCarryCost(purchasePrice, closingCost, rehabCost, carryMonthsVal, carryRate, carryTranches)
    const totalCashIn = totalCashNeeded + carryAmount
    const loanAmount = exitArv * (dscrLtv / 100)
    const cashLeftInDeal = totalCashIn - loanAmount
    const cashIn = Math.max(cashLeftInDeal, 0)

    // Revenue/expenses for CF calculations
    const grossMonthlyRent = getGrossMonthlyRent(inputs)
    const vacancyRate = parseFloat(inputs.vacancyRate) || 0
    const effectiveMonthlyRent = grossMonthlyRent * (1 - vacancyRate / 100)
    const annualGrossRent = grossMonthlyRent * 12
    const annualEffectiveRent = effectiveMonthlyRent * 12

    const expenseFields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
    let totalExpenses = 0
    expenseFields.forEach(field => {
      totalExpenses += calcExpenseYearly(field, parseFloat(inputs[field]) || 0, expenseConfig[field], annualGrossRent)
    })

    const noi = annualEffectiveRent - totalExpenses

    // Pre-refi CF
    const monthlyHoldingExpenses = ['propTaxes', 'insurance', 'utilities'].reduce((sum, f) =>
      sum + calcExpenseYearly(f, parseFloat(inputs[f]) || 0, expenseConfig[f], annualGrossRent), 0) / 12
    const monthlyCarryInterest = carryMonthsVal > 0 ? carryAmount / carryMonthsVal : 0
    const preRefiCF = grossMonthlyRent - monthlyHoldingExpenses - monthlyCarryInterest

    // Post-refi CF
    const monthlyPayment = calculateMortgage(loanAmount, interestRate, loanTerm)
    const postRefiCF = (noi - monthlyPayment * 12) / 12

    return { cashIn, preRefiCF, postRefiCF }
  }, [inputs, expenseConfig, carryTranches])

  // Run simulation
  const jvResults = useMemo(() =>
    runJvSimulation(jvData.cashIn, jvData.preRefiCF, jvData.postRefiCF, refiMonth, paybackMonths, splitYou, monthsToProject),
    [jvData, refiMonth, paybackMonths, splitYou, monthsToProject]
  )

  // Update jvConfig on close
  useEffect(() => {
    setJvConfig({ splitYou, paybackMonths, refiMonth, monthsToProject })
  }, [splitYou, paybackMonths, refiMonth, monthsToProject])

  // Draw chart
  const drawChart = useCallback((results, comparison = null) => {
    const canvas = canvasRef.current
    if (!canvas || !results.remainingCapital?.length) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.parentElement.clientWidth - 24
    canvas.height = 180

    const padding = { top: 20, right: 20, bottom: 30, left: 60 }
    const w = canvas.width - padding.left - padding.right
    const h = canvas.height - padding.top - padding.bottom

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const maxVal = Math.max(...results.remainingCapital, ...(comparison ? comparison.remainingCapital : [0]))
    const maxMonth = results.months.length

    // Grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (h / 4) * i
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(canvas.width - padding.right, y); ctx.stroke()
      ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText('$' + Math.round((maxVal - (maxVal / 4) * i) / 1000) + 'k', padding.left - 5, y + 3)
    }

    ctx.textAlign = 'center';
    [0, 12, 24, 36, 48, 60].filter(m => m <= maxMonth).forEach(m => {
      ctx.fillText(m.toString(), padding.left + (m / maxMonth) * w, canvas.height - 10)
    })

    // Comparison line
    if (comparison) {
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
      ctx.beginPath()
      comparison.remainingCapital.forEach((v, i) => {
        const x = padding.left + ((i + 1) / maxMonth) * w
        const y = padding.top + h - (v / maxVal) * h
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke(); ctx.setLineDash([])
    }

    // Main line
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2
    ctx.beginPath()
    results.remainingCapital.forEach((v, i) => {
      const x = padding.left + ((i + 1) / maxMonth) * w
      const y = padding.top + h - (v / maxVal) * h
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.lineTo(padding.left + w, padding.top + h)
    ctx.lineTo(padding.left, padding.top + h)
    ctx.closePath(); ctx.fill()

    // Indicators
    const pbX = padding.left + (paybackMonths / maxMonth) * w
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pbX, padding.top); ctx.lineTo(pbX, padding.top + h); ctx.stroke()
    ctx.setLineDash([]); ctx.fillStyle = '#10b981'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('Payback', pbX, padding.top - 5)

    const rfX = padding.left + (refiMonth / maxMonth) * w
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(rfX, padding.top); ctx.lineTo(rfX, padding.top + h); ctx.stroke()
    ctx.setLineDash([]); ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('Refi', rfX, padding.top - 5)
  }, [paybackMonths, refiMonth])

  useEffect(() => {
    drawChart(jvResults, comparisonResults)
  }, [jvResults, comparisonResults, drawChart])

  // Derived display values
  const cashReturnedAtPayback = paybackMonths <= jvResults.cumCashToYou.length ? jvResults.cumCashToYou[paybackMonths - 1] : 0
  const capitalRemaining = paybackMonths <= jvResults.remainingCapital.length ? jvResults.remainingCapital[paybackMonths - 1] : 0
  const stabilizedMonthly = jvData.postRefiCF * (splitYou / 100)
  const stabilizedCoC = capitalRemaining > 0 ? (stabilizedMonthly * 12 / capitalRemaining) * 100 : 0
  const totalToYou = jvResults.cumCashToYou[jvResults.cumCashToYou.length - 1] || 0

  // Phase breakdown
  const phases = useMemo(() => {
    const p = []
    if (refiMonth < paybackMonths) {
      p.push({ start: 1, end: refiMonth, cf: jvData.preRefiCF, months: refiMonth, pct: '100% to you (pre-refi)', color: '#dcfce7', textColor: '#16a34a' })
      p.push({ start: refiMonth + 1, end: paybackMonths, cf: jvData.postRefiCF, months: paybackMonths - refiMonth, pct: '100% to you (post-refi)', color: '#dbeafe', textColor: '#2563eb' })
      p.push({ start: paybackMonths + 1, end: null, cf: jvData.postRefiCF, split: splitYou, pct: `${splitYou}% split begins`, color: '#fef3c7', textColor: '#d97706' })
    } else if (refiMonth === paybackMonths) {
      p.push({ start: 1, end: refiMonth, cf: jvData.preRefiCF, months: refiMonth, pct: '100% to you (pre-refi)', color: '#dcfce7', textColor: '#16a34a' })
      p.push({ start: paybackMonths + 1, end: null, cf: jvData.postRefiCF, split: splitYou, pct: `${splitYou}% split begins (post-refi)`, color: '#fef3c7', textColor: '#d97706' })
    } else {
      p.push({ start: 1, end: paybackMonths, cf: jvData.preRefiCF, months: paybackMonths, pct: '100% to you (pre-refi)', color: '#dcfce7', textColor: '#16a34a' })
      p.push({ start: paybackMonths + 1, end: refiMonth, cf: jvData.preRefiCF, split: splitYou, pct: `${splitYou}% split (pre-refi)`, color: '#fef3c7', textColor: '#d97706' })
      p.push({ start: refiMonth + 1, end: null, cf: jvData.postRefiCF, split: splitYou, pct: `${splitYou}% split (post-refi)`, color: '#e0e7ff', textColor: '#4f46e5' })
    }
    return p
  }, [refiMonth, paybackMonths, splitYou, jvData])

  const compare = () => {
    const r2 = runJvSimulation(jvData.cashIn, jvData.preRefiCF, jvData.postRefiCF, compareMonth2, paybackMonths, splitYou, monthsToProject)
    setComparisonResults(r2)
    setShowLegend(true)
    // Re-run main with first compare month
    const r1 = runJvSimulation(jvData.cashIn, jvData.preRefiCF, jvData.postRefiCF, compareMonth1, paybackMonths, splitYou, monthsToProject)
    drawChart(r1, r2)
  }

  const reset = () => {
    setSplitYou(50); setPaybackMonths(6); setRefiMonth(4); setMonthsToProject(60)
    setShowLegend(false); setComparisonResults(null)
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3>📊 JV Capital Recovery Analysis</h3>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <p className={styles.desc}>Analyze partnership deals where investor capital is repaid first, then cash flow splits by percentage.</p>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Your Investment</div>
          <div className={styles.row2}>
            <JvField label="Cash In Deal" prefix="$" value={Math.round(jvData.cashIn)} readOnly />
            <JvField label="Your Split (after protection)" suffix="%" value={splitYou} onChange={v => setSplitYou(parseFloat(v) || 0)} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Timeline Controls</div>
          <div className={styles.row3}>
            <JvField label="Refi Happens At" prefix="Mo" value={refiMonth} onChange={v => setRefiMonth(parseInt(v) || 1)} sub="CF changes from pre→post" />
            <JvField label="100% to You Until" prefix="Mo" value={paybackMonths} onChange={v => setPaybackMonths(parseInt(v) || 1)} sub="Then switches to split" />
            <JvField label="Project Out To" suffix="mo" value={monthsToProject} onChange={v => setMonthsToProject(parseInt(v) || 12)} />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Cash Flow Amounts (from DSCR calc)</div>
          <div className={styles.row2}>
            <JvField label="Pre-Refi CF" prefix="$" suffix="/mo" value={Math.round(jvData.preRefiCF)} readOnly />
            <JvField label="Post-Refi CF" prefix="$" suffix="/mo" value={Math.round(jvData.postRefiCF)} readOnly />
          </div>
        </div>

        <div className={styles.phaseSection}>
          <div className={styles.sectionTitle}>Phase Breakdown</div>
          {phases.map((p, i) => (
            <div key={i} className={styles.phaseRow} style={{ background: p.color }}>
              <span>
                <strong>Mo {p.start}{p.end ? `–${p.end}` : '+'}:</strong>{' '}
                ${Math.round(p.cf).toLocaleString()}/mo{p.split ? ` × ${p.split}%` : ` × ${p.months}`} = <strong>
                  {p.split ? `$${Math.round(p.cf * p.split / 100).toLocaleString()}/mo` : `$${Math.round(p.cf * p.months).toLocaleString()}`}
                </strong>
              </span>
              <span style={{ color: p.textColor }}>{p.pct}</span>
            </div>
          ))}
        </div>

        <div className={styles.results}>
          <div className={styles.resultsTitle}>Results</div>
          <div className={styles.resultsGrid}>
            <ResultItem label="Cash Returned (Payback Period):" value={'$' + Math.round(cashReturnedAtPayback).toLocaleString()} />
            <ResultItem label="Capital Remaining:" value={'$' + Math.round(capitalRemaining).toLocaleString()} />
            <ResultItem label="Stabilized Monthly (You):" value={'$' + Math.round(stabilizedMonthly).toLocaleString()} green />
            <ResultItem label="Stabilized CoC:" value={stabilizedCoC.toFixed(1) + '%'} green />
            <ResultItem label="Full Payback Month:" value={jvResults.fullPaybackMonth || '--'} highlight />
            <ResultItem label={`Total to You (${monthsToProject} mo):`} value={'$' + Math.round(totalToYou).toLocaleString()} green />
          </div>
        </div>

        <div className={styles.chartContainer}>
          <div className={styles.chartTitle}>Remaining Capital Over Time</div>
          <canvas ref={canvasRef} />
        </div>

        <div className={styles.scenarioSection}>
          <div className={styles.sectionTitle}>Scenario Comparison</div>
          <div className={styles.scenarioRow}>
            <label>Compare: Refi at month</label>
            <select value={compareMonth1} onChange={e => setCompareMonth1(parseInt(e.target.value))}>
              {[2,3,4,5,6,8,10,12].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span>vs</span>
            <select value={compareMonth2} onChange={e => setCompareMonth2(parseInt(e.target.value))}>
              {[2,3,4,5,6,8,10,12].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button className={styles.compareBtn} onClick={compare}>Compare</button>
          </div>
          {showLegend && (
            <div className={styles.scenarioLegend}>
              <span><span className={styles.dotPrimary} /> Refi @ {compareMonth1}</span>
              <span><span className={styles.dotSecondary} /> Refi @ {compareMonth2}</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnReset} onClick={reset}>Reset</button>
          <button className={styles.btnDone} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function JvField({ label, prefix, suffix, value, onChange, readOnly, sub }) {
  return (
    <div className={styles.jvInputGroup}>
      <label>{label}</label>
      <div className={styles.jvInputWrap}>
        {prefix && <span className={styles.jvPrefix}>{prefix}</span>}
        <input type="number" value={value} readOnly={readOnly} className={readOnly ? styles.readonly : ''}
          onChange={onChange ? e => onChange(e.target.value) : undefined} />
        {suffix && <span className={styles.jvSuffix}>{suffix}</span>}
      </div>
      {sub && <span className={styles.jvSub}>{sub}</span>}
    </div>
  )
}

function ResultItem({ label, value, green, highlight }) {
  return (
    <div className={styles.resultItem}>
      <span className={styles.resultLabel}>{label}</span>
      <span className={`${styles.resultValue} ${green ? styles.green : ''} ${highlight ? styles.highlightValue : ''}`}>{value}</span>
    </div>
  )
}
