import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip as ChartTooltip
} from 'chart.js'
import styles from './AssetDebtChart.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { OFFER } from '../utils/modes'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip)

export default function AssetDebtChart() {
  const mode = usePropertyStore(s => s.currentMode)
  const mainResults = usePropertyStore(s => s.results)
  const offerResults = usePropertyStore(s => s.offerResults)
  const results = mode === OFFER ? offerResults : mainResults

  if (!results) return null

  const { chartAssets: assets, chartLoans: loans, chartRent: rent, chartCashFlow: cashFlow } = results
  const labels = Array.from({ length: 31 }, (_, i) => i)
  const milestonePoint = (y) => y === 5 || y === 10 ? 5 : 0

  const data = {
    labels,
    datasets: [
      {
        label: 'Asset Value',
        data: assets,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: labels.map(milestonePoint),
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Loan Balance',
        data: loans,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: labels.map(milestonePoint),
        pointHoverRadius: 6,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Annual Rent',
        data: rent,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#10b981',
        borderWidth: 2,
        borderDash: [6, 3],
        yAxisID: 'y2',
      },
      {
        label: 'Annual Cash Flow',
        data: cashFlow,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 3],
        yAxisID: 'y2',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => `Year ${items[0].label}`,
          afterBody: (items) => {
            const asset = items[0]?.raw || 0
            const loan = items[1]?.raw || 0
            return `Equity: $${Math.round(asset - loan).toLocaleString()}`
          },
          label: (ctx) => `${ctx.dataset.label}: $${Math.round(ctx.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          callback: (val) => [0, 5, 10, 15, 20, 25, 30].includes(val) ? val : '',
          maxRotation: 0,
        },
      },
      y: {
        position: 'left',
        grid: { color: '#e2e8f0' },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          callback: (val) => '$' + Math.round(val / 1000) + 'k',
        },
      },
      y2: {
        position: 'right',
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          callback: (val) => '$' + Math.round(val / 1000) + 'k',
        },
      },
    },
  }

  // Vertical annotation lines at Y5 and Y10
  const milestonePlugin = {
    id: 'milestoneLines',
    afterDraw(chart) {
      const { ctx, scales: { x, y: yScale } } = chart
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 1
      ;[5, 10].forEach(year => {
        const xPos = x.getPixelForValue(year)
        ctx.beginPath()
        ctx.moveTo(xPos, yScale.top)
        ctx.lineTo(xPos, yScale.bottom)
        ctx.stroke()
        ctx.fillStyle = '#10b981'
        ctx.font = 'bold 9px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Y' + year, xPos, yScale.top - 5)
      })
      ctx.restore()
    },
  }

  return (
    <Card icon="📊" title="Asset/Debt Forecaster" section="asset-debt"
      badge={<>
        <span className={styles.legendDot} style={{ background: '#3b82f6' }} /> ASSET
        <span className={styles.legendDot} style={{ background: '#ef4444', marginLeft: 12 }} /> LOAN
        <span className={styles.legendDot} style={{ background: '#10b981', marginLeft: 12 }} /> RENT
        <span className={styles.legendDot} style={{ background: '#f59e0b', marginLeft: 12 }} /> CF
      </>}>
      <div className={styles.chartContainer}>
        <Line data={data} options={options} plugins={[milestonePlugin]} />
      </div>
    </Card>
  )
}
