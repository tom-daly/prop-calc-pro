import React from 'react'
import usePropertyStore from '../store/usePropertyStore'
import { fmt, fmtPct } from '../utils/format'

const EXPENSE_NAMES = {
  propTaxes: 'Property Taxes', insurance: 'Insurance', maintenance: 'Maintenance',
  utilities: 'Utilities', propMgmt: 'Prop Mgmt', capex: 'Capex', mortgageIns: 'Mortgage Ins',
}

const UTILITY_SUBS = [
  { id: 'utilElectric', name: 'Electric' },
  { id: 'utilGas', name: 'Gas/Heat' },
  { id: 'utilWater', name: 'Water/Sewer' },
  { id: 'utilTrash', name: 'Trash' },
  { id: 'utilLawn', name: 'Lawn/Snow' },
  { id: 'utilOther', name: 'Other' },
]

export default function PrintView({ sections, onClose }) {
  const inputs = usePropertyStore(s => s.inputs)
  const results = usePropertyStore(s => s.results)
  const offerResults = usePropertyStore(s => s.offerResults)
  const expenseConfig = usePropertyStore(s => s.expenseConfig)
  const mode = usePropertyStore(s => s.currentMode)
  const r = mode === 'offer' ? offerResults : results

  if (!r) return null

  const show = (key) => sections.has(key)
  const income = r.annualEffectiveRent || 0
  const pct = (v) => income > 0 ? ((v / income) * 100).toFixed(0) + '%' : ''

  const modeLabel = mode === 'dscr' ? 'Cash-Carry-Refi-DSCR' : mode === 'offer' ? 'Offer Analysis' : 'Traditional'

  return (
    <div style={styles.overlay}>
      <div style={styles.page} id="print-view-page">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>{inputs.propertyName || 'Untitled Property'}</div>
          {inputs.propertyAddress && <div style={styles.address}>{inputs.propertyAddress}</div>}
          <div style={styles.branding}>PropCalc Pro &middot; {modeLabel} Analysis</div>
        </div>

        {/* P&L Overview — always first */}
        {show('metrics') && (
          <div style={styles.section}>
            <table style={styles.plTable}>
              <tbody>
                <tr>
                  <td style={styles.plLabel}>Gross Income</td>
                  <td style={styles.plVal}>{fmt(income)}</td>
                  <td style={styles.plLabel}>DSCR</td>
                  <td style={styles.plValBold}>{(mode === 'offer' ? (r.noi / (r.totalMonthlyDebt * 12 || 1)) : r.dscrRatio).toFixed(2)}</td>
                  <td style={styles.plLabel}>Cap Rate</td>
                  <td style={styles.plVal}>{fmtPct(r.capRate)}</td>
                </tr>
                <tr>
                  <td style={styles.plLabel}>Expenses <span style={styles.pct}>{pct(results?.totalExpenses || r.totalExpenses || 0)}</span></td>
                  <td style={{ ...styles.plVal, color: '#ef4444' }}>({fmt(results?.totalExpenses || 0)})</td>
                  <td style={styles.plLabel}>Monthly Flow</td>
                  <td style={{ ...styles.plValBold, color: (mode === 'offer' ? r.monthlyCF : results?.displayMonthlyCF) >= 0 ? '#10b981' : '#ef4444' }}>
                    {fmt(mode === 'offer' ? r.monthlyCF : results?.displayMonthlyCF || 0)}
                  </td>
                  <td style={styles.plLabel}>Cash-on-Cash</td>
                  <td style={styles.plVal}>{mode !== 'offer' ? fmtPct(results?.cashOnCash || 0) : '—'}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ ...styles.plLabel, fontWeight: 600 }}>NOI</td>
                  <td style={{ ...styles.plValBold }}>{fmt(r.noi || results?.noi || 0)}</td>
                  <td style={styles.plLabel}>Debt Service <span style={styles.pct}>{pct(results?.annualDebtService || (r.totalMonthlyDebt * 12) || 0)}</span></td>
                  <td style={{ ...styles.plVal, color: '#ef4444' }}>({fmt(results?.annualDebtService || (r.totalMonthlyDebt * 12) || 0)})</td>
                  <td style={{ ...styles.plLabel, fontWeight: 600 }}>Annual CF</td>
                  <td style={{ ...styles.plValBold, color: (results?.cashFlow ?? (r.monthlyCF * 12)) >= 0 ? '#10b981' : '#ef4444' }}>
                    {fmt(results?.cashFlow ?? (r.monthlyCF * 12) ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.columns}>
          {/* Left column */}
          <div style={styles.col}>
            {show('acquisition') && (
              <div style={styles.section}>
                <div style={styles.secTitle}>Acquisition Details</div>
                <Row label="Purchase Price" value={fmt(parseFloat(inputs.purchasePrice) || 0)} />
                <Row label="Exit ARV" value={fmt(parseFloat(inputs.exitArv) || 0)} />
                {mode === 'traditional' && <>
                  <Row label="Down Payment" value={fmt(results?.downAmount || 0)} />
                  <Row label="Closing Costs" value={fmt(results?.feesAmount || 0)} />
                  <Row label="Rehab" value={fmt(results?.rehabAmount || 0)} />
                  <Row label="Total Out of Pocket" value={fmt((results?.downAmount || 0) + (results?.feesAmount || 0) + (results?.rehabAmount || 0))} bold />
                </>}
                {mode === 'dscr' && <>
                  <Row label="DSCR LTV" value={(inputs.dscrLtv || '75') + '%'} />
                  <Row label="Loan Amount" value={fmt(results?.dscrLoanAmount || 0)} />
                  <Row label={results?.dscrHighlightLabel || 'Cash Left'} value={fmt(Math.abs(results?.dscrCashLeft || 0))} bold />
                </>}
                <Row label="Interest Rate" value={(inputs.interestRate || '0') + '%'} />
                <Row label="Loan Term" value={(inputs.loanTerm || '30') + ' yrs'} />
              </div>
            )}

            {show('revenue') && (
              <div style={styles.section}>
                <div style={styles.secTitle}>Revenue & Occupancy</div>
                {inputs.units.map((u, i) => (
                  <Row key={i}
                    label={`Unit ${i + 1}${u.beds || u.bath ? ` (${u.beds || '?'}bd/${u.bath || '?'}ba)` : ''}`}
                    value={fmt(parseFloat(u.rent) || 0) + (parseFloat(u.misc) > 0 ? ` + ${fmt(parseFloat(u.misc))}` : '')} />
                ))}
                <Row label="Vacancy" value={(inputs.vacancyRate || '0') + '%'} />
                <Row label="Effective Monthly" value={fmt(r.effectiveMonthlyRent || results?.effectiveMonthlyRent || 0)} bold />
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={styles.col}>
            {show('expenses') && (
              <div style={styles.section}>
                <div style={styles.secTitle}>Operating Expenses</div>
                {Object.entries(EXPENSE_NAMES).map(([field, name]) => {
                  const val = results?.expenseYearly?.[field]
                  if (!val && val !== 0) return null
                  const cfg = expenseConfig[field]
                  const raw = inputs[field]
                  let basis = ''
                  if (cfg?.mode === 'pct' && raw) {
                    basis = ` (${raw}%)`
                  } else if (cfg?.mode === 'dollar' && raw) {
                    basis = ` ($${parseFloat(raw).toLocaleString()}/${cfg.freq === 'mo' ? 'mo' : 'yr'})`
                  }
                  return (
                    <React.Fragment key={field}>
                      <Row label={name + basis} value={fmt(val)} />
                      {field === 'utilities' && UTILITY_SUBS.map(u => {
                        const subVal = parseFloat(inputs[u.id]) || 0
                        if (subVal === 0) return null
                        return <Row key={u.id} label={`  ${u.name}`} value={fmt(subVal * 12)} sub />
                      })}
                    </React.Fragment>
                  )
                })}
                <Row label="Total Expenses" value={fmt(results?.totalExpenses || 0)} bold />
              </div>
            )}

            {show('growth') && (
              <div style={styles.section}>
                <div style={styles.secTitle}>Growth Assumptions</div>
                <Row label="Appreciation" value={(inputs.appreciationRate || '0') + '%'} />
                <Row label="Rent Growth" value={(inputs.rentGrowth || '0') + '%'} />
                <Row label="Cost Increase" value={(inputs.costIncrease || '0') + '%'} />
              </div>
            )}
          </div>
        </div>

        {/* Full-width: Milestones */}
        {show('milestones') && (
          <div style={styles.section}>
            <div style={styles.secTitle}>Growth & Exit Milestones</div>
            <table style={styles.msTable}>
              <thead>
                <tr>
                  <th style={styles.msHead}></th>
                  <th style={styles.msHead}>Equity</th>
                  <th style={styles.msHead}>Debt</th>
                  <th style={styles.msHead}>Total Flow</th>
                  <th style={styles.msHead}>Net Gain</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.msLabel}>Year 5</td>
                  <td style={styles.msVal}>{fmt(r.equity5)}</td>
                  <td style={{ ...styles.msVal, color: '#ef4444' }}>{fmt(r.balance5)}</td>
                  <td style={{ ...styles.msVal, color: '#10b981' }}>{fmt(r.flow5)}</td>
                  <td style={{ ...styles.msVal, fontWeight: 700 }}>{fmt(r.netGain5)}</td>
                </tr>
                <tr>
                  <td style={styles.msLabel}>Year 10</td>
                  <td style={styles.msVal}>{fmt(r.equity10)}</td>
                  <td style={{ ...styles.msVal, color: '#ef4444' }}>{fmt(r.balance10)}</td>
                  <td style={{ ...styles.msVal, color: '#10b981' }}>{fmt(r.flow10)}</td>
                  <td style={{ ...styles.msVal, fontWeight: 700 }}>{fmt(r.netGain10)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Toolbar */}
        <div style={styles.toolbar} data-print="hide">
          <button style={styles.printBtn} onClick={() => window.print()}>Print / Save PDF</button>
          <button style={styles.closeBtn} onClick={onClose}>Back to Editor</button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, sub }) {
  return (
    <div style={styles.row}>
      <span style={{ ...styles.rowLabel, fontWeight: bold ? 600 : 400, ...(sub ? { fontSize: 8.5, color: '#94a3b8', paddingLeft: 8 } : {}) }}>{label}</span>
      <span style={{ ...styles.rowVal, fontWeight: bold ? 700 : 600, ...(sub ? { fontSize: 8.5, color: '#94a3b8' } : {}) }}>{value}</span>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: '#f1f5f9', zIndex: 9999, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '20px 0' },
  page: { background: '#fff', width: '210mm', minHeight: '297mm', padding: '14mm 16mm', boxShadow: '0 2px 20px rgba(0,0,0,0.1)', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', fontSize: 11, lineHeight: 1.5, color: '#1e293b' },
  header: { textAlign: 'center', paddingBottom: 12, borderBottom: '2px solid #1e293b', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700 },
  address: { fontSize: 12, color: '#64748b', marginTop: 3 },
  branding: { fontSize: 9, color: '#94a3b8', marginTop: 4 },
  section: { marginBottom: 14 },
  secTitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 8 },
  columns: { display: 'flex', gap: 24 },
  col: { flex: 1 },
  row: { display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderBottom: '1px solid #f1f5f9' },
  rowLabel: { fontSize: 10.5, color: '#475569' },
  rowVal: { fontSize: 10.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  plTable: { width: '100%', borderCollapse: 'collapse', marginBottom: 14 },
  plLabel: { fontSize: 10, color: '#64748b', padding: '4px 6px' },
  plVal: { fontSize: 11, fontWeight: 600, padding: '4px 6px', fontVariantNumeric: 'tabular-nums' },
  plValBold: { fontSize: 12, fontWeight: 700, padding: '4px 6px', fontVariantNumeric: 'tabular-nums' },
  pct: { fontSize: 9, color: '#94a3b8', marginLeft: 3 },
  msTable: { width: '100%', borderCollapse: 'collapse' },
  msHead: { fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' },
  msLabel: { fontSize: 10, fontWeight: 600, padding: '5px 8px' },
  msVal: { fontSize: 11, fontWeight: 600, textAlign: 'right', padding: '5px 8px', fontVariantNumeric: 'tabular-nums' },
  toolbar: { marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' },
  printBtn: { padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  closeBtn: { padding: '8px 20px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
}
