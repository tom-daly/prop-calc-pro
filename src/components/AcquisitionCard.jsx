import React from 'react'
import styles from './AcquisitionCard.module.css'
import Card from './Card'
import usePropertyStore from '../store/usePropertyStore'
import { fmt } from '../utils/format'
import { MORBY, SELLER_FINANCE, SUBJECT_TO, STRATEGIES, STRATEGY_PILL_LABELS } from '../utils/offerStrategies'

function StoreInput({ id, label, prefix, suffix, step, placeholder }) {
  const value = usePropertyStore(s => s.inputs[id])
  const setInput = usePropertyStore(s => s.setInput)
  return (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input type="number" value={value} step={step} placeholder={placeholder}
          onChange={e => setInput(id, e.target.value)} />
        {suffix && <span className={styles.prefix}>{suffix}</span>}
      </div>
    </div>
  )
}

export default function AcquisitionCard() {
  const mode = usePropertyStore(s => s.currentMode)
  const results = usePropertyStore(s => s.results)

  return (
    <Card icon="💰" title="Acquisition Details" badge="⚙️ SETUP" section="acquisition">
      <div className={styles.row2}>
        <StoreInput id="purchasePrice" label="Purchase Price" prefix="$" placeholder="0" />
        <StoreInput id="exitArv" label="Exit ARV" prefix="$" placeholder="0" />
      </div>

      {mode === 'traditional' && (
        <div className={styles.row3}>
          <StoreInput id="downPercent" label="Down %" placeholder="25" />
          <StoreInput id="closingCost" label="Closing Cost" prefix="$" placeholder="0" />
          <StoreInput id="rehabCost" label="Upfront Rehab" prefix="$" placeholder="0" />
        </div>
      )}

      {mode === 'dscr' && (
        <div className={styles.row3}>
          <StoreInput id="closingCostDscr" label="Closing Cost" prefix="$" placeholder="0" />
          <StoreInput id="rehabCostDscr" label="Upfront Rehab" prefix="$" placeholder="0" />
          <StoreInput id="dscrLtv" label="DSCR LTV %" placeholder="75" />
        </div>
      )}

      {mode !== 'offer' && (
        <div className={styles.row2}>
          <StoreInput id="interestRate" label="Interest Rate %" step="0.125" placeholder="7" />
          <StoreInput id="loanTerm" label="Loan Term (Years)" />
        </div>
      )}

      {mode === 'dscr' && <DscrExtraInputs />}

      {mode === 'traditional' && results && (
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

      {mode === 'dscr' && results && (
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

      {mode === 'offer' && <OfferInputs />}
    </Card>
  )
}

function DscrExtraInputs() {
  return (
    <>
      <div className={styles.row2}>
        <StoreInput id="carryMonths" label="Carry Period (Months)" placeholder="6" />
        <StoreInput id="carryRate" label="Default Carry Rate %" step="0.5" placeholder="8" />
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
  return (
    <>
      <div className={styles.sectionTitle}>Seller Finance Parameters</div>
      <div className={styles.row2}>
        <StoreInput id="sfSellerRate" label="Seller Rate %" suffix="%" step="0.125" />
        <StoreInput id="sfSellerAmort" label="Seller Amort (Years)" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="sfBalloonYears" label="Balloon Period (Years)" />
        <StoreInput id="sfRefiLtv" label="Refi LTV % at Balloon" suffix="%" />
      </div>
      <div className={styles.row2}>
        <StoreInput id="sfAppreciation" label="Appreciation Rate % (Override)" suffix="%" placeholder="Use main" step="0.5" />
        <div />
      </div>
      {results && (
        <div className={styles.offerSummary}>
          <div className={styles.osTitle}>Seller Finance Summary</div>
          <div className={styles.osRow}><span className={styles.osLabel}>Seller Loan (100% of Price)</span><span className={styles.osValue}>{fmt(results.sellerLoanAmount)}</span></div>
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
