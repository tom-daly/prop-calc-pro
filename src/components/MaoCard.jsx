import React from 'react'
import styles from './MaoCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { TRADITIONAL, BRRRR, OFFER } from '../utils/modes'

function addCommas(v) {
  if (v === '' || v === undefined || v === null) return ''
  const str = String(v)
  const [whole, dec] = str.split('.')
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? formatted + '.' + dec : formatted
}

export default function MaoCard() {
  const mode = usePropertyStore(s => s.currentMode)
  const maoResults = usePropertyStore(s => s.maoResults)
  const targetCF = usePropertyStore(s => s.inputs.maoTargetCF)
  const setInput = usePropertyStore(s => s.setInput)
  const [focused, setFocused] = React.useState(false)

  if (mode === OFFER) return null
  if (!maoResults) return null

  const displayValue = !focused ? addCommas(targetCF) : targetCF

  return (
    <Card icon="🎯" title="Max Allowable Offer" badge="MAO" section="mao">
      <div className={styles.targetRow}>
        <div className={styles.inputGroup}>
          <label>Target Monthly Cash Flow</label>
          <div className={styles.inputWrap}>
            <span className={styles.prefix}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={displayValue}
              placeholder="0"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '')
                if (raw !== '' && isNaN(Number(raw))) return
                setInput('maoTargetCF', raw)
              }}
            />
            <span className={styles.suffix}>/mo</span>
          </div>
        </div>
      </div>

      {mode === TRADITIONAL && <TraditionalMao mao={maoResults} />}
      {mode === BRRRR && <BrrrMao mao={maoResults} />}
    </Card>
  )
}

function TraditionalMao({ mao }) {
  if (!mao.maxPriceCF || mao.maxPriceCF <= 0) {
    return (
      <div className={styles.noResult}>
        {mao.reason || 'Enter a target cash flow to calculate MAO'}
      </div>
    )
  }

  return (
    <div className={styles.resultBox}>
      <div className={styles.maoLabel}>MAX OFFER PRICE</div>
      <div className={styles.maoValue}>{fmt(mao.maxPriceCF)}</div>
      <div className={styles.maoDetail}>
        <span>NOI: <strong>{fmt(mao.noi)}</strong></span>
        <span>Max Debt: <strong>{fmt(mao.maxAnnualDebt)}/yr</strong></span>
      </div>
    </div>
  )
}

function BrrrMao({ mao }) {
  return (
    <>
      <div className={styles.cfNote}>
        <span className={styles.cfNoteLabel}>Projected Monthly CF</span>
        <span className={`${styles.cfNoteValue} ${mao.monthlyCF >= 0 ? styles.pos : styles.neg}`}>
          {fmt(mao.monthlyCF)}
        </span>
        <span className={styles.cfNoteSub}>(determined by ARV & refi loan, not purchase price)</span>
      </div>

      <div className={styles.resultBox}>
        <div className={styles.maoLabel}>CASH-OUT MAO</div>
        <div className={styles.maoValueRow}>
          <span className={styles.maoValue}>
            {mao.cashOutMaxPrice > 0 ? fmt(mao.cashOutMaxPrice) : '—'}
          </span>
          {mao.cashOutArvPct > 0 && (
            <span className={styles.arvBadge}>{mao.cashOutArvPct}% of ARV</span>
          )}
        </div>
        <div className={styles.maoSub}>Get all money back at refi</div>
      </div>

      <div className={styles.maoGrid}>
        <div className={styles.resultBox}>
          <div className={styles.maoLabel}>65% RULE</div>
          <div className={styles.maoValue}>
            {mao.rule65MaxPrice > 0 ? fmt(mao.rule65MaxPrice) : '—'}
          </div>
          <div className={styles.maoSub}>ARV × 65% − Rehab</div>
        </div>

        <div className={styles.resultBox}>
          <div className={styles.maoLabel}>70% RULE</div>
          <div className={styles.maoValue}>
            {mao.rule70MaxPrice > 0 ? fmt(mao.rule70MaxPrice) : '—'}
          </div>
          <div className={styles.maoSub}>ARV × 70% − Rehab</div>
        </div>
      </div>

      {mao.cfMeetsTarget !== null && (
        <div className={`${styles.cfFeasibility} ${mao.cfMeetsTarget ? styles.cfPass : styles.cfFail}`}>
          {mao.cfMeetsTarget
            ? `✓ Deal produces ${fmt(mao.monthlyCF)}/mo — meets your ${fmt(mao.targetMonthlyCF)}/mo target`
            : `✗ Deal produces ${fmt(mao.monthlyCF)}/mo — short of your ${fmt(mao.targetMonthlyCF)}/mo target`
          }
        </div>
      )}

      {mao.cfGap && <CfGapAnalysis gap={mao.cfGap} />}

      {mao.cocMaoRows && mao.cocMaoRows.length > 0 && (
        <div className={styles.breakdownTable}>
          <div className={styles.bHeader}>Max Price by Target CoC</div>
          {mao.cocMaoRows.map(row => (
            <div className={styles.bRow} key={row.cocPct}>
              <span>{row.cocPct}% CoC</span>
              <span>{fmt(row.maxPrice)}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.breakdownTable}>
        <div className={styles.bRow}>
          <span>Refi Loan ({mao.ltvDisplay})</span>
          <span>{fmt(mao.loanAmount)}</span>
        </div>
        <div className={styles.bRow}>
          <span>Less: Closing</span>
          <span>({fmt(mao.closingCost)})</span>
        </div>
        <div className={styles.bRow}>
          <span>Less: Rehab</span>
          <span>({fmt(mao.rehabCost)})</span>
        </div>
        {mao.carryEstimate > 0 && (
          <div className={styles.bRow}>
            <span>Less: Est. Carry</span>
            <span>({fmt(mao.carryEstimate)})</span>
          </div>
        )}
        <div className={`${styles.bRow} ${styles.bTotal}`}>
          <span>= Cash-Out MAO</span>
          <span>{mao.cashOutMaxPrice > 0 ? fmt(mao.cashOutMaxPrice) : '—'}</span>
        </div>
      </div>
    </>
  )
}

function CfGapAnalysis({ gap }) {
  return (
    <div className={styles.gapBox}>
      <div className={styles.gapTitle}>To hit your target, you need one of:</div>
      <div className={styles.gapRow}>
        <span className={styles.gapIcon}>📈</span>
        <span>Increase total rent by <strong>{fmt(Math.ceil(gap.rentIncrease))}/mo</strong></span>
      </div>
      <div className={styles.gapRow}>
        <span className={styles.gapIcon}>✂️</span>
        <span>Cut expenses by <strong>{fmt(Math.ceil(gap.expenseReduction))}/mo</strong></span>
      </div>
      {gap.targetLtv !== null && gap.targetLtv > 0 && (
        <div className={styles.gapRow}>
          <span className={styles.gapIcon}>🏦</span>
          <span>Lower refi LTV to <strong>{gap.targetLtv}%</strong></span>
        </div>
      )}
    </div>
  )
}
