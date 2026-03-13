import React from 'react'
import styles from './AcquisitionCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { MORBY, SELLER_FINANCE, SUBJECT_TO, STRATEGIES, STRATEGY_PILL_LABELS } from '../utils/offerStrategies'
import { TRADITIONAL, BRRRR, OFFER } from '../utils/modes'

function addCommas(v) {
  if (v === '' || v === undefined || v === null) return ''
  const str = String(v)
  const [whole, dec] = str.split('.')
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? formatted + '.' + dec : formatted
}

function StoreInput({ id, label, prefix, suffix, step, placeholder }) {
  const value = usePropertyStore(s => s.inputs[id])
  const setInput = usePropertyStore(s => s.setInput)
  const needed = usePropertyStore(s => s.emptyRequired.includes(id))
  const isDollar = prefix === '$'
  const [focused, setFocused] = React.useState(false)

  const displayValue = isDollar && !focused ? addCommas(value) : value

  return (
    <div className={styles.inputGroup}>
      <label className={needed ? 'input-needed-label' : ''}>{label}</label>
      <div className={`${styles.inputWrap} ${needed ? 'input-needed' : ''}`}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input type={isDollar ? 'text' : 'number'} inputMode={isDollar ? 'decimal' : undefined}
          value={displayValue} step={step} placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => {
            const raw = isDollar ? e.target.value.replace(/,/g, '') : e.target.value
            if (isDollar && raw !== '' && isNaN(Number(raw))) return
            setInput(id, raw)
          }} />
        {suffix && <span className={styles.prefix}>{suffix}</span>}
      </div>
    </div>
  )
}

function DiscountBadge() {
  const listPrice = usePropertyStore(s => s.inputs.listPrice)
  const purchasePrice = usePropertyStore(s => s.inputs.purchasePrice)
  const list = parseFloat(String(listPrice).replace(/,/g, '')) || 0
  const purchase = parseFloat(String(purchasePrice).replace(/,/g, '')) || 0
  if (list <= 0 || purchase <= 0) return null
  const discount = ((list - purchase) / list) * 100
  if (discount === 0) return null
  const isDiscount = discount > 0
  return (
    <span className={`${styles.discountBadge} ${isDiscount ? styles.discountPos : styles.discountNeg}`}>
      {isDiscount ? '↓' : '↑'} {Math.abs(discount).toFixed(1)}% {isDiscount ? 'below' : 'above'} list
    </span>
  )
}

export default function AcquisitionCard() {
  const mode = usePropertyStore(s => s.currentMode)
  const results = usePropertyStore(s => s.results)

  return (
    <Card icon="💰" title="Acquisition Details" badge="⚙️ SETUP" section="acquisition">
      <div className={styles.row3}>
        <StoreInput id="listPrice" label="List Price" prefix="$" placeholder="Optional" />
        <StoreInput id="purchasePrice" label="Purchase / Offer" prefix="$" placeholder="0" />
        <StoreInput id="exitArv" label="Exit ARV" prefix="$" placeholder="0" />
      </div>
      <DiscountBadge />

      {mode === TRADITIONAL && (
        <div className={styles.row3}>
          <StoreInput id="downPercent" label="Down %" placeholder="25" />
          <StoreInput id="closingCost" label="Closing Cost" prefix="$" placeholder="0" />
          <StoreInput id="rehabCost" label="Upfront Rehab" prefix="$" placeholder="0" />
        </div>
      )}

      {mode === BRRRR && (
        <div className={styles.row3}>
          <StoreInput id="closingCostDscr" label="Closing Cost" prefix="$" placeholder="0" />
          <StoreInput id="rehabCostDscr" label="Upfront Rehab" prefix="$" placeholder="0" />
          <StoreInput id="dscrLtv" label="Refi LTV %" placeholder="75" />
        </div>
      )}

      {mode !== OFFER && (
        <div className={styles.row2}>
          <StoreInput id="interestRate" label="Interest Rate %" step="0.125" />
          <StoreInput id="loanTerm" label="Loan Term (Years)" />
        </div>
      )}

      {mode === BRRRR && <DscrExtraInputs />}

      {mode === TRADITIONAL && results && (
        <div className={styles.highlightBox}>
          <div className={styles.hlLabel}>Total Out of Pocket</div>
          <div className={styles.hlValue}>{fmt(results.downAmount + results.feesAmount + results.rehabAmount)}</div>
          <div className={styles.hlBreakdown}>
            <span>DOWN: <strong>{fmt(results.downAmount)}</strong></span>
            <span>FEES: <strong>{fmt(results.feesAmount)}</strong></span>
            <span>REHAB: <strong>{fmt(results.rehabAmount)}</strong></span>
          </div>
        </div>
      )}

      {mode === BRRRR && results && (
        <div className={styles.highlightBox}>
          <div className={`${styles.hlLabel} ${results.dscrHighlightLabelClass === 'green' ? styles.hlLabelGreen : ''}`}>
            {results.dscrHighlightLabel}
          </div>
          <div className={styles.hlValue}>{fmt(Math.abs(results.dscrCashLeft))}</div>
          <div className={styles.hlBreakdownRow}>
            <span>PURCHASE: <strong>{fmt(results.dscrPurchase)}</strong></span>
            <span>FEES: <strong>{fmt(results.dscrFees)}</strong></span>
            <span>REHAB: <strong>{fmt(results.dscrRehab)}</strong></span>
            <span>CARRY: <strong>{fmt(results.dscrCarry)}</strong></span>
          </div>
          <div className={styles.hlLoanInfo}>
            LOAN: <strong>{fmt(results.dscrLoanAmount)}</strong> ({results.dscrLtvDisplay} of {results.dscrArvDisplay} ARV)
          </div>
        </div>
      )}

      {mode === OFFER && <OfferInputs />}
    </Card>
  )
}

function DscrExtraInputs() {
  return (
    <>
      <div className={styles.row2}>
        <StoreInput id="carryMonths" label="Carry Period (Months)" />
        <StoreInput id="carryRate" label="Default Carry Rate %" step="0.5" />
      </div>
      <div className={styles.dscrRow}>
        <button className={styles.carryBtn} onClick={() => document.dispatchEvent(new CustomEvent('openCarryModal'))}>
          ⚙️ Mixed Carry Rates...
        </button>
        <CarryTrancheSummary />
      </div>
      <JvSplitRow />
    </>
  )
}

function CarryTrancheSummary() {
  const tranches = usePropertyStore(s => s.carryTranches)
  if (tranches.length === 0) return null
  return <span className={styles.trancheSummary}>({tranches.length} tranche{tranches.length > 1 ? 's' : ''} configured)</span>
}

function JvSplitRow() {
  return (
    <div className={styles.jvRow}>
      <StoreInput id="jvSplitMain" label="JV Split (Your %)" suffix="%" />
      <button className={styles.carryBtn} onClick={() => document.dispatchEvent(new CustomEvent('openJvModal'))} style={{ marginTop: 14 }}>
        📊 JV Capital Recovery...
      </button>
    </div>
  )
}

function OfferInputs() {
  const strategy = usePropertyStore(s => s.offerStrategy)
  const setOfferStrategy = usePropertyStore(s => s.setOfferStrategy)
  const results = usePropertyStore(s => s.offerResults)

  return (
    <div style={{ marginTop: 10 }}>
      <div className={styles.pillToggle}>
        {STRATEGIES.map(s => (
          <button key={s} className={`${styles.pill} ${strategy === s ? styles.pillActive : ''}`} onClick={() => setOfferStrategy(s)}>{STRATEGY_PILL_LABELS[s]}</button>
        ))}
      </div>

      {strategy === MORBY && <MorbyInputs results={results} />}
      {strategy === SELLER_FINANCE && <SellerFinanceInputs results={results} />}
      {strategy === SUBJECT_TO && <SubjectToInputs results={results} />}
    </div>
  )
}

function MorbyInputs({ results }) {
  return (
    <>
      <div className={styles.sectionTitle}>Morby Method Parameters</div>
      <div className={styles.row2}>
        <StoreInput id="morbyDownPct" label="Down Payment % (DSCR Loan)" suffix="%" />
        <StoreInput id="morbyDscrRate" label="DSCR Loan Rate %" suffix="%" step="0.125" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="morbyDscrTerm" label="DSCR Loan Term (Years)" />
        <StoreInput id="morbySellerRate" label="Seller Carry Rate %" suffix="%" step="0.125" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="morbySellerAmort" label="Seller Carry Amort (Years)" />
        <StoreInput id="morbyBalloonYears" label="Balloon Period (Years)" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="morbyRefiLtv" label="Refi LTV % at Balloon" suffix="%" />
        <StoreInput id="morbyAppreciation" label="Appreciation Rate % (Override)" suffix="%" placeholder="Use main" step="0.5" />
      </div>
      {results && (
        <div className={styles.offerSummary}>
          <div className={styles.osTitle}>Morby Method Summary</div>
          <div className={styles.osRow}><span className={styles.osLabel}>DSCR Loan (Down Payment)</span><span className={styles.osValue}>{fmt(results.dscrLoanAmount)}</span></div>
          <div className={styles.osRow}><span className={styles.osLabel}>Seller Carry Amount</span><span className={styles.osValue}>{fmt(results.sellerCarryAmount)}</span></div>
          <div className={styles.osRow}><span className={styles.osLabel}>DSCR Monthly Payment</span><span className={styles.osValue}>{fmt(results.dscrMonthly)}</span></div>
          <div className={styles.osRow}><span className={styles.osLabel}>Seller Monthly Payment</span><span className={styles.osValue}>{fmt(results.sellerMonthly)}</span></div>
          <div className={`${styles.osRow} ${styles.osTotal}`}>
            <span className={styles.osLabel}>Monthly Cash Flow</span>
            <span className={`${styles.osValue} ${results.monthlyCF < 0 ? styles.negative : ''}`}>{fmt(results.monthlyCF)}</span>
          </div>
        </div>
      )}
    </>
  )
}

function SellerFinanceInputs({ results }) {
  const sfDownPayment = usePropertyStore(s => s.inputs.sfDownPayment)
  const sfDownIsPercent = usePropertyStore(s => s.inputs.sfDownIsPercent)
  const setInput = usePropertyStore(s => s.setInput)
  const [downFocused, setDownFocused] = React.useState(false)
  const isDollar = !sfDownIsPercent
  const downDisplay = isDollar && !downFocused ? addCommas(sfDownPayment) : sfDownPayment
  return (
    <>
      <div className={styles.sectionTitle}>Seller Finance Parameters</div>
      <div className={styles.row2}>
        <div className={styles.inputGroup}>
          <label>Down Payment</label>
          <div className={styles.inputWrap}>
            <span className={styles.prefix}>{sfDownIsPercent ? '%' : '$'}</span>
            <input type={isDollar ? 'text' : 'number'} inputMode={isDollar ? 'decimal' : undefined}
              value={downDisplay}
              onFocus={() => setDownFocused(true)}
              onBlur={() => setDownFocused(false)}
              onChange={e => {
                const raw = isDollar ? e.target.value.replace(/,/g, '') : e.target.value
                if (isDollar && raw !== '' && isNaN(Number(raw))) return
                setInput('sfDownPayment', raw)
              }} />
            <button type="button" className={styles.unitToggle}
              onClick={() => setInput('sfDownIsPercent', !sfDownIsPercent)}>
              {sfDownIsPercent ? '% → $' : '$ → %'}
            </button>
          </div>
        </div>
        <StoreInput id="sfSellerRate" label="Seller Rate %" suffix="%" step="0.125" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="sfSellerAmort" label="Seller Amort (Years)" />
        <StoreInput id="sfBalloonYears" label="Balloon Period (Years)" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="sfRefiLtv" label="Refi LTV % at Balloon" suffix="%" />
        <StoreInput id="sfAppreciation" label="Appreciation Rate % (Override)" suffix="%" placeholder="Use main" step="0.5" />
      </div>
      {results && (
        <div className={styles.offerSummary}>
          <div className={styles.osTitle}>Seller Finance Summary</div>
          {results.sfDownAmt > 0 && <div className={styles.osRow}><span className={styles.osLabel}>Down Payment</span><span className={styles.osValue}>{fmt(results.sfDownAmt)}</span></div>}
          <div className={styles.osRow}><span className={styles.osLabel}>Seller Loan</span><span className={styles.osValue}>{fmt(results.sellerLoanAmount)}</span></div>
          <div className={styles.osRow}><span className={styles.osLabel}>Seller Monthly Payment</span><span className={styles.osValue}>{fmt(results.sellerMonthly)}</span></div>
          <div className={`${styles.osRow} ${styles.osTotal}`}>
            <span className={styles.osLabel}>Monthly Cash Flow</span>
            <span className={`${styles.osValue} ${results.monthlyCF < 0 ? styles.negative : ''}`}>{fmt(results.monthlyCF)}</span>
          </div>
        </div>
      )}
    </>
  )
}

function SubjectToInputs({ results }) {
  const escrow = usePropertyStore(s => s.inputs.subToEscrow)
  const setInput = usePropertyStore(s => s.setInput)

  return (
    <>
      <div className={styles.sectionTitle}>Subject-To Parameters</div>
      <div className={styles.row3}>
        <StoreInput id="subToLoanBalance" label="Existing Loan Balance" prefix="$" placeholder="0" />
        <StoreInput id="subToRate" label="Existing Rate %" suffix="%" step="0.125" />
        <StoreInput id="subToRemTerm" label="Remaining Term (Years)" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="subToDownPayment" label="Down Payment to Seller" prefix="$" placeholder="0" />
        <div className={styles.checkRow} style={{ alignSelf: 'end', marginBottom: 2 }}>
          <input type="checkbox" id="subToEscrowCheck" checked={escrow === 'yes'}
            onChange={e => setInput('subToEscrow', e.target.checked ? 'yes' : 'no')} />
          <label htmlFor="subToEscrowCheck">Payment includes escrow (T&I)</label>
        </div>
      </div>
      <div className={styles.sectionTitle}>Seller Carry (Remaining Balance)</div>
      <div className={styles.row2}>
        <StoreInput id="subToSellerRate" label="Seller Carry Rate %" suffix="%" step="0.125" />
        <StoreInput id="subToSellerAmort" label="Seller Carry Amort (Years)" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="subToBalloonYears" label="Balloon Period (Years)" />
        <StoreInput id="subToRefiLtv" label="Refi LTV % at Balloon" suffix="%" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="subToAppreciation" label="Appreciation Rate % (Override)" suffix="%" placeholder="Use main" step="0.5" />
        <div />
      </div>
      {results && (
        <div className={styles.offerSummary}>
          <div className={styles.osTitle}>Subject-To Summary</div>
          <div className={styles.osRow}><span className={styles.osLabel}>Existing Mortgage</span><span className={styles.osValue}>{fmt(results.existingBalance)}</span></div>
          <div className={styles.osRow}><span className={styles.osLabel}>Existing Monthly Payment</span><span className={styles.osValue}>{fmt(results.existingMonthly)}</span></div>
          {results.downPayment > 0 && (
            <div className={styles.osRow}><span className={styles.osLabel}>Down Payment to Seller</span><span className={styles.osValue}>{fmt(results.downPayment)}</span></div>
          )}
          {results.sellerCarryAmount > 0 && (
            <>
              <div className={styles.osRow}><span className={styles.osLabel}>Seller Carry (Remaining)</span><span className={styles.osValue}>{fmt(results.sellerCarryAmount)}</span></div>
              <div className={styles.osRow}><span className={styles.osLabel}>Seller Monthly Payment</span><span className={styles.osValue}>{fmt(results.sellerMonthly)}</span></div>
            </>
          )}
          <div className={`${styles.osRow} ${styles.osTotal}`}>
            <span className={styles.osLabel}>Monthly Cash Flow</span>
            <span className={`${styles.osValue} ${results.monthlyCF < 0 ? styles.negative : ''}`}>{fmt(results.monthlyCF)}</span>
          </div>
        </div>
      )}
    </>
  )
}
