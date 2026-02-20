import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import styles from './MetricsBar.module.css'
import usePropertyStore from '../store/usePropertyStore'
import { fmt, fmtPct, fmtCompact } from '../utils/format'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function MetricsBar() {
  const results = usePropertyStore(s => s.results)
  const mode = usePropertyStore(s => s.currentMode)
  if (!results) return null

  const income = results.annualEffectiveRent

  return (
    <div className={styles.metricsBar} data-section="metrics">
      <div className={styles.leftPanel}>
        <div className={styles.panelTitle}>P&L Snapshot</div>
        <div className={styles.plRows}>
          <div className={styles.plRow}>
            <span className={styles.plLabel}>Gross Income</span>
            <span className={styles.plValue}>{fmt(results.annualEffectiveRent)}</span>
          </div>
          <div className={styles.plRow}>
            <span className={styles.plLabel}>Operating Expenses {income > 0 && <span className={styles.plPct}>{((results.totalExpenses / income) * 100).toFixed(0)}%</span>}</span>
            <span className={`${styles.plValue} ${styles.plNeg}`}>({fmt(results.totalExpenses)})</span>
          </div>
          <div className={`${styles.plRow} ${styles.plNoi}`}>
            <span className={styles.plLabel}>Net Operating Income</span>
            <span className={styles.plValue}>{fmt(results.noi)}</span>
          </div>
          <div className={styles.plRow}>
            <span className={styles.plLabel}>Debt Service {income > 0 && <span className={styles.plPct}>{((results.annualDebtService / income) * 100).toFixed(0)}%</span>}</span>
            <span className={`${styles.plValue} ${styles.plNeg}`}>({fmt(results.annualDebtService)})</span>
          </div>
          <div className={`${styles.plRow} ${styles.plCf}`}>
            <span className={styles.plLabel}>Annual Cash Flow</span>
            <span className={`${styles.plValue} ${results.cashFlow >= 0 ? styles.plPos : styles.plNeg}`}>{fmt(results.cashFlow)}</span>
          </div>
        </div>
      </div>
      <div className={styles.centerPanel}>
        <div className={styles.panelTitle}>Income Breakdown</div>
        <IncomeChart results={results} />
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.metricsGrid}>
          <div className={`${styles.metric} ${styles.dscrMetric}`}>
            <div className={styles.label}>DSCR <span>{results.dscrEmoji}</span></div>
            <div className={styles.value}>{results.dscrRatio.toFixed(2)}</div>
            <div className={`${styles.sub} ${styles[results.dscrColorClass]}`}>{results.dscrStatusText}</div>
            <DscrTooltip results={results} />
          </div>
          <div className={styles.metric}>
            <div className={styles.label}>Cap Rate</div>
            <div className={styles.value}>{fmtPct(results.capRate)}</div>
            <div className={styles.sub}>Unleveraged</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.label}>Monthly Flow</div>
            <div className={styles.value}>
              {fmt(results.displayMonthlyCF)}
              {mode === 'dscr' && results.jvSplit < 100 && (
                <span className={styles.subInline}> of {fmt(results.monthlyCashFlow)}</span>
              )}
            </div>
            <div className={styles.sub}>After Debt</div>
          </div>
          <div className={`${styles.metric} ${styles.highlight}`}>
            <div className={styles.label}>Cash-on-Cash</div>
            <div className={styles.value}>
              {fmtPct(results.cashOnCash)}
              {mode === 'dscr' && results.jvSplit < 100 && (
                <span className={styles.subInline}> of {fmtPct(results.fullCashOnCash)}</span>
              )}
            </div>
            <div className={styles.sub}>Pre-Tax ROI</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IncomeChart({ results }) {
  const income = results.annualEffectiveRent
  const expenses = results.totalExpenses
  const debt = results.annualDebtService
  const cashFlow = Math.max(results.cashFlow, 0)
  const profitPct = income > 0 ? ((results.cashFlow / income) * 100).toFixed(0) : '0'

  const data = {
    labels: ['Expenses', 'Debt', 'Profit'],
    datasets: [{
      data: [expenses, debt, cashFlow],
      backgroundColor: ['#f97316', '#ef4444', '#10b981'],
      borderWidth: 0,
      spacing: 2,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '60%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw
            const pct = income > 0 ? ((val / income) * 100).toFixed(0) : '0'
            return `${ctx.label}: ${fmt(val)} (${pct}%)`
          },
        },
      },
    },
  }

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, width, height } = chart
      ctx.save()
      ctx.font = 'bold 14px -apple-system, sans-serif'
      ctx.fillStyle = '#1e293b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(profitPct + '%', width / 2, height / 2 - 6)
      ctx.font = '10px -apple-system, sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText('Profit', width / 2, height / 2 + 10)
      ctx.restore()
    },
  }

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartContainer}>
        <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#f97316' }} />
          <span>Expenses {income > 0 ? ((expenses / income) * 100).toFixed(0) + '%' : ''}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#ef4444' }} />
          <span>Debt {income > 0 ? ((debt / income) * 100).toFixed(0) + '%' : ''}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#10b981' }} />
          <span>Profit {income > 0 ? ((results.cashFlow / income) * 100).toFixed(0) + '%' : ''}</span>
        </div>
      </div>
    </div>
  )
}

function DscrTooltip({ results }) {
  const ranges = results.dscrPriceRanges
  const tiers = [
    { label: '\u{1F7E2} 1.25+', cls: styles.green },
    { label: '\u{1F7E1} 1.15 \u2013 1.24', cls: styles.yellow },
    { label: '\u{1F7E0} 1.05 \u2013 1.14', cls: styles.orange },
    { label: '\u{1F534} 1.00 \u2013 1.04', cls: styles.red },
    { label: '\u274C < 1.00', cls: styles.darkred },
  ]

  const priceLabels = ranges ? [
    '\u2264 ' + fmtCompact(ranges[0]),
    fmtCompact(ranges[0]) + ' \u2013 ' + fmtCompact(ranges[1]),
    fmtCompact(ranges[1]) + ' \u2013 ' + fmtCompact(ranges[2]),
    fmtCompact(ranges[2]) + ' \u2013 ' + fmtCompact(ranges[3]),
    '> ' + fmtCompact(ranges[3]),
  ] : ['---','---','---','---','---']

  return (
    <div className={styles.dscrTooltip}>
      <div className={styles.dscrTooltipTitle}>DSCR Lender Guidelines</div>
      {tiers.map((tier, i) => (
        <div key={i} className={`${styles.dscrTooltipRow} ${tier.cls} ${i === results.dscrActiveRowIndex ? styles.activeRow : ''}`}>
          <span>{tier.label}</span>
          <span className={styles.dscrPriceRange}>{priceLabels[i]}</span>
        </div>
      ))}
      <div className={styles.dscrTooltipCurrent}>
        <strong>Your DSCR: {results.dscrRatio.toFixed(2)}</strong> &mdash; {results.dscrDetails}
      </div>
    </div>
  )
}
