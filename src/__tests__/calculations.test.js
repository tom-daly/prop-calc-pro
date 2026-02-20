import { describe, it, expect } from 'vitest'
import {
  calculateMortgage,
  calculateMaxLoan,
  getLoanBalance,
  calcExpenseYearly,
  getCarryCost,
  getCumulativeFlow,
  calculateAll,
  runStressTest,
  calculateOffer,
  runJvSimulation,
  computeCarrySchedule,
} from '../utils/calculations'

// ──────────────────────────────────────────────────
// Helper: compare floats within tolerance
// ──────────────────────────────────────────────────
const near = (actual, expected, tolerance = 0.01) => {
  expect(actual).toBeCloseTo(expected, -Math.log10(tolerance))
}

// ══════════════════════════════════════════════════
// calculateMortgage
// ══════════════════════════════════════════════════
describe('calculateMortgage', () => {
  it('calculates standard 30yr mortgage at 7%', () => {
    // $200,000 loan, 7% rate, 30 years
    // Formula: P * r(1+r)^n / ((1+r)^n - 1)  where r = 0.07/12
    // Expected: $1,330.60
    const payment = calculateMortgage(200000, 7, 30)
    near(payment, 1330.60, 0.01)
  })

  it('calculates 15yr mortgage at 6%', () => {
    // $150,000 loan, 6% rate, 15 years
    // Expected: $1,265.79
    const payment = calculateMortgage(150000, 6, 15)
    near(payment, 1265.79, 0.01)
  })

  it('handles zero interest rate', () => {
    // $120,000 loan, 0% rate, 30 years = 120000 / 360 = $333.33
    const payment = calculateMortgage(120000, 0, 30)
    near(payment, 333.33, 0.01)
  })

  it('handles zero principal', () => {
    const payment = calculateMortgage(0, 7, 30)
    expect(payment).toBe(0)
  })

  it('calculates $100k at 5% for 30 years', () => {
    // Expected: $536.82
    const payment = calculateMortgage(100000, 5, 30)
    near(payment, 536.82, 0.01)
  })

  it('calculates $300k at 8% for 30 years', () => {
    // Expected: $2,201.29
    const payment = calculateMortgage(300000, 8, 30)
    near(payment, 2201.29, 0.01)
  })

  it('calculates small loan with high rate', () => {
    // $50,000 at 12% for 15 years
    // Expected: $600.08
    const payment = calculateMortgage(50000, 12, 15)
    near(payment, 600.08, 0.01)
  })
})

// ══════════════════════════════════════════════════
// calculateMaxLoan
// ══════════════════════════════════════════════════
describe('calculateMaxLoan', () => {
  it('is the inverse of calculateMortgage', () => {
    // If $200k at 7%/30yr = $1330.60/mo, then maxLoan($1330.60, 7, 30) should be $200k
    const payment = calculateMortgage(200000, 7, 30)
    const maxLoan = calculateMaxLoan(payment, 7, 30)
    near(maxLoan, 200000, 0.01)
  })

  it('inverse property for 15yr at 6%', () => {
    const payment = calculateMortgage(150000, 6, 15)
    const maxLoan = calculateMaxLoan(payment, 6, 15)
    near(maxLoan, 150000, 0.01)
  })

  it('handles zero interest rate', () => {
    // $500/mo at 0% for 30yr = $500 * 360 = $180,000
    const maxLoan = calculateMaxLoan(500, 0, 30)
    near(maxLoan, 180000, 0.01)
  })

  it('calculates max loan for $1000/mo at 7% for 30yr', () => {
    // Expected: ~$150,307.57
    const maxLoan = calculateMaxLoan(1000, 7, 30)
    near(maxLoan, 150307.57, 1)
  })

  it('round-trip with various parameters', () => {
    const testCases = [
      { principal: 100000, rate: 5, years: 30 },
      { principal: 250000, rate: 6.5, years: 15 },
      { principal: 500000, rate: 3.5, years: 30 },
      { principal: 75000, rate: 10, years: 20 },
    ]
    testCases.forEach(({ principal, rate, years }) => {
      const payment = calculateMortgage(principal, rate, years)
      const reconstructed = calculateMaxLoan(payment, rate, years)
      near(reconstructed, principal, 0.01)
    })
  })
})

// ══════════════════════════════════════════════════
// getLoanBalance
// ══════════════════════════════════════════════════
describe('getLoanBalance', () => {
  it('returns full principal at month 0', () => {
    const balance = getLoanBalance(200000, 7, 30, 0)
    near(balance, 200000, 0.01)
  })

  it('returns ~0 at end of loan term', () => {
    const balance = getLoanBalance(200000, 7, 30, 360)
    near(balance, 0, 0.05)
  })

  it('decreases over time', () => {
    const b0 = getLoanBalance(200000, 7, 30, 0)
    const b60 = getLoanBalance(200000, 7, 30, 60)
    const b120 = getLoanBalance(200000, 7, 30, 120)
    const b240 = getLoanBalance(200000, 7, 30, 240)
    expect(b0).toBeGreaterThan(b60)
    expect(b60).toBeGreaterThan(b120)
    expect(b120).toBeGreaterThan(b240)
  })

  it('calculates balance after 5 years on $200k at 7%', () => {
    // B(k) = P*(1+r)^k - M*((1+r)^k - 1)/r
    // where r=0.07/12, P=200000, M=calculateMortgage(200000,7,30)
    const balance = getLoanBalance(200000, 7, 30, 60)
    near(balance, 188263.18, 1)
  })

  it('calculates balance after 10 years on $200k at 7%', () => {
    const balance = getLoanBalance(200000, 7, 30, 120)
    near(balance, 171624.77, 1)
  })

  it('handles zero interest rate', () => {
    // $120k at 0% for 30yr, after 120 months: 120000 - (120000/360)*120 = 120000 - 40000 = 80000
    const balance = getLoanBalance(120000, 0, 30, 120)
    near(balance, 80000, 0.01)
  })

  it('handles zero interest rate at end', () => {
    const balance = getLoanBalance(120000, 0, 30, 360)
    near(balance, 0, 0.01)
  })

  it('calculates after 1 month on $100k at 6%', () => {
    // Month 1: interest = 100000 * 0.06/12 = $500
    // Payment = $599.55, principal repaid = $99.55
    // Balance = $99,900.45
    const balance = getLoanBalance(100000, 6, 30, 1)
    near(balance, 99900.45, 0.10)
  })
})

// ══════════════════════════════════════════════════
// calcExpenseYearly
// ══════════════════════════════════════════════════
describe('calcExpenseYearly', () => {
  it('calculates dollar amount in yearly mode', () => {
    const result = calcExpenseYearly('propTaxes', 3600, { mode: 'dollar', freq: 'yr' }, 24000)
    expect(result).toBe(3600)
  })

  it('calculates dollar amount in monthly mode', () => {
    // $300/mo = $3600/yr
    const result = calcExpenseYearly('utilities', 300, { mode: 'dollar', freq: 'mo' }, 24000)
    expect(result).toBe(3600)
  })

  it('calculates percentage mode', () => {
    // 10% of $24000 annual gross rent = $2400
    const result = calcExpenseYearly('propMgmt', 10, { mode: 'pct', freq: 'yr' }, 24000)
    expect(result).toBe(2400)
  })

  it('percentage with zero rent', () => {
    const result = calcExpenseYearly('propMgmt', 10, { mode: 'pct', freq: 'yr' }, 0)
    expect(result).toBe(0)
  })

  it('zero value returns zero', () => {
    const result = calcExpenseYearly('insurance', 0, { mode: 'dollar', freq: 'yr' }, 24000)
    expect(result).toBe(0)
  })

  it('pct mode ignores freq', () => {
    // In pct mode, freq doesn't matter - always uses annual gross rent * pct/100
    const result1 = calcExpenseYearly('maintenance', 5, { mode: 'pct', freq: 'yr' }, 30000)
    const result2 = calcExpenseYearly('maintenance', 5, { mode: 'pct', freq: 'mo' }, 30000)
    expect(result1).toBe(1500)
    expect(result2).toBe(1500)
  })
})

// ══════════════════════════════════════════════════
// getCarryCost
// ══════════════════════════════════════════════════
describe('getCarryCost', () => {
  it('calculates simple carry cost without tranches', () => {
    // Total = 200000 + 5000 + 10000 = 215000
    // Carry = 215000 * (8/100) * (6/12) = 215000 * 0.04 = 8600
    const cost = getCarryCost(200000, 5000, 10000, 6, 8, [])
    near(cost, 8600, 0.01)
  })

  it('calculates carry cost with null tranches', () => {
    const cost = getCarryCost(200000, 5000, 10000, 6, 8, null)
    near(cost, 8600, 0.01)
  })

  it('calculates carry cost with one tranche', () => {
    // Total = 200000 + 5000 + 10000 = 215000
    // Tranche: $100k at 6%, no points
    // Tranche carry: 100000 * 0.06 * (6/12) = 3000
    // Remaining: 115000 at 8%: 115000 * 0.08 * (6/12) = 4600
    // Total: 3000 + 4600 = 7600
    const cost = getCarryCost(200000, 5000, 10000, 6, 8, [
      { amount: 100000, rate: 6, points: 0 }
    ])
    near(cost, 7600, 0.01)
  })

  it('calculates carry cost with tranche + points', () => {
    // Total = 200000 + 5000 + 10000 = 215000
    // Tranche: $100k at 6%, 2 points
    // Tranche carry: 100000 * 0.06 * (6/12) = 3000
    // Points: 100000 * 0.02 = 2000
    // Remaining: 115000 at 8%: 115000 * 0.08 * (6/12) = 4600
    // Total: 3000 + 2000 + 4600 = 9600
    const cost = getCarryCost(200000, 5000, 10000, 6, 8, [
      { amount: 100000, rate: 6, points: 2 }
    ])
    near(cost, 9600, 0.01)
  })

  it('calculates with multiple tranches covering all cash', () => {
    // Total = 100000 + 0 + 0 = 100000
    // Tranche 1: $60k at 5%, 1 point
    // Tranche 2: $50k at 7%, 0 points (only 40k allocated since 60k already covered)
    // Tranche 1: 60000 * 0.05 * (4/12) = 1000, points = 60000*0.01 = 600
    // Tranche 2: 40000 * 0.07 * (4/12) = 933.33, points = 0
    // Remaining: 0 at default rate = 0
    // Total: 1000 + 600 + 933.33 + 0 = 2533.33
    const cost = getCarryCost(100000, 0, 0, 4, 10, [
      { amount: 60000, rate: 5, points: 1 },
      { amount: 50000, rate: 7, points: 0 }
    ])
    near(cost, 2533.33, 0.01)
  })

  it('handles zero carry months', () => {
    const cost = getCarryCost(200000, 0, 0, 0, 8, [])
    expect(cost).toBe(0)
  })

  it('handles tranche larger than total', () => {
    // Total = 50000. Tranche = 100000 → allocated = 50000
    // Carry: 50000 * 0.06 * (6/12) = 1500, points: 50000 * 0.01 = 500
    // Remaining: 0
    // Total: 2000
    const cost = getCarryCost(50000, 0, 0, 6, 8, [
      { amount: 100000, rate: 6, points: 1 }
    ])
    near(cost, 2000, 0.01)
  })
})

// ══════════════════════════════════════════════════
// getCumulativeFlow
// ══════════════════════════════════════════════════
describe('getCumulativeFlow', () => {
  it('calculates 1 year with no growth', () => {
    // NOI = 24000 - 10000 = 14000, debt = 12000, CF = 2000
    const flow = getCumulativeFlow(24000, 10000, 12000, 0, 0, 1)
    expect(flow).toBe(2000)
  })

  it('calculates 2 years with no growth', () => {
    // Same CF each year: 2000 * 2 = 4000
    const flow = getCumulativeFlow(24000, 10000, 12000, 0, 0, 2)
    expect(flow).toBe(4000)
  })

  it('calculates 2 years with rent growth', () => {
    // Year 1: NOI = 24000 - 10000 = 14000, CF = 14000 - 12000 = 2000
    // Year 2: rent = 24000 * 1.03 = 24720, NOI = 24720 - 10000 = 14720, CF = 14720 - 12000 = 2720
    // Total = 2000 + 2720 = 4720
    const flow = getCumulativeFlow(24000, 10000, 12000, 0.03, 0, 2)
    near(flow, 4720, 0.01)
  })

  it('calculates 2 years with cost increase', () => {
    // Year 1: NOI = 24000 - 10000 = 14000, CF = 2000
    // Year 2: exp = 10000 * 1.02 = 10200, NOI = 24000 - 10200 = 13800, CF = 13800 - 12000 = 1800
    // Total = 2000 + 1800 = 3800
    const flow = getCumulativeFlow(24000, 10000, 12000, 0, 0.02, 2)
    near(flow, 3800, 0.01)
  })

  it('calculates 3 years with both growth rates', () => {
    // Year 1: rent=24000, exp=10000, NOI=14000, CF=14000-12000=2000
    // Year 2: rent=24000*1.03=24720, exp=10000*1.02=10200, NOI=14520, CF=2520
    // Year 3: rent=24720*1.03=25461.6, exp=10200*1.02=10404, NOI=15057.6, CF=3057.6
    // Total = 2000 + 2520 + 3057.6 = 7577.6
    const flow = getCumulativeFlow(24000, 10000, 12000, 0.03, 0.02, 3)
    near(flow, 7577.6, 0.1)
  })

  it('handles zero years', () => {
    const flow = getCumulativeFlow(24000, 10000, 12000, 0.03, 0.02, 0)
    expect(flow).toBe(0)
  })

  it('handles negative cash flow', () => {
    // NOI = 12000 - 10000 = 2000, debt = 12000, CF = -10000
    const flow = getCumulativeFlow(12000, 10000, 12000, 0, 0, 1)
    expect(flow).toBe(-10000)
  })
})

// ══════════════════════════════════════════════════
// calculateAll - Traditional Mode
// ══════════════════════════════════════════════════
describe('calculateAll - Traditional Mode', () => {
  const baseInputs = {
    propertyName: 'Test', propertyAddress: '',
    purchasePrice: '200000', exitArv: '250000',
    unit1Rent: '1200', unit1Misc: '50', unit2Rent: '800', unit2Misc: '0',
    unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
    vacancyRate: '5',
    propTaxes: '3600', insurance: '1800', maintenance: '5', utilities: '200',
    propMgmt: '8', capex: '5', mortgageIns: '0',
    appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
    downPercent: '25', closingCost: '5000', rehabCost: '10000',
    interestRate: '7', loanTerm: '30',
    // DSCR fields (unused in traditional)
    closingCostDscr: '', rehabCostDscr: '', dscrLtv: '', carryMonths: '', carryRate: '', carryRentPercent: '0', jvSplitMain: '100',
    morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
    morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
    morbyRefiLtv: '75', morbyAppreciation: '',
  }

  const baseExpenseConfig = {
    propTaxes: { mode: 'dollar', freq: 'yr' },
    insurance: { mode: 'dollar', freq: 'yr' },
    maintenance: { mode: 'pct', freq: 'yr' },
    utilities: { mode: 'dollar', freq: 'mo' },
    propMgmt: { mode: 'pct', freq: 'yr' },
    capex: { mode: 'pct', freq: 'yr' },
    mortgageIns: { mode: 'dollar', freq: 'mo' },
  }

  it('calculates revenue correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // Gross = (1200+50) + (800+0) = 2050/mo
    expect(r.grossMonthlyRent).toBe(2050)
    // Annual gross = 2050 * 12 = 24600
    expect(r.annualGrossRent).toBe(24600)
    // Effective = 2050 * (1 - 0.05) = 1947.50
    near(r.effectiveMonthlyRent, 1947.50, 0.01)
    // Annual effective = 1947.50 * 12 = 23370
    near(r.annualEffectiveRent, 23370, 0.01)
  })

  it('calculates loan and down payment correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // Down = 200000 * 0.25 = 50000
    expect(r.downAmount).toBe(50000)
    expect(r.feesAmount).toBe(5000)
    expect(r.rehabAmount).toBe(10000)
    // Loan = 200000 - 50000 = 150000
    expect(r.loanAmount).toBe(150000)
    // Total OOP = 50000 + 5000 + 10000 = 65000
    expect(r.totalOutOfPocket).toBe(65000)
    expect(r.cashBasis).toBe(65000)
  })

  it('calculates expenses correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // propTaxes: $3600/yr (dollar, yr)
    expect(r.expenseYearly.propTaxes).toBe(3600)
    // insurance: $1800/yr (dollar, yr)
    expect(r.expenseYearly.insurance).toBe(1800)
    // maintenance: 5% of annualGross(24600) = 1230
    near(r.expenseYearly.maintenance, 1230, 0.01)
    // utilities: $200/mo * 12 = 2400
    expect(r.expenseYearly.utilities).toBe(2400)
    // propMgmt: 8% of 24600 = 1968
    near(r.expenseYearly.propMgmt, 1968, 0.01)
    // capex: 5% of 24600 = 1230
    near(r.expenseYearly.capex, 1230, 0.01)
    // mortgageIns: $0/mo * 12 = 0
    expect(r.expenseYearly.mortgageIns).toBe(0)
    // Total: 3600 + 1800 + 1230 + 2400 + 1968 + 1230 + 0 = 12228
    near(r.totalExpenses, 12228, 0.01)
  })

  it('calculates core metrics correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // NOI = annualEffective - totalExpenses = 23370 - 12228 = 11142
    near(r.noi, 11142, 1)
    // Monthly payment on $150k at 7% for 30yr = $997.95
    near(r.monthlyPayment, 997.95, 0.10)
    // Annual debt service = 997.95 * 12 = 11975.40
    near(r.annualDebtService, 11975.40, 1)
    // Cash flow = 11142 - 11975.40 = -833.40
    near(r.cashFlow, -833.40, 2)
    // Monthly CF = -833.40 / 12 = -69.45
    near(r.monthlyCashFlow, -69.45, 0.5)
  })

  it('calculates DSCR and cap rate correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // DSCR = NOI / ADS = 11142 / 11975.40 = 0.93 (rounded to 2 decimals)
    near(r.dscrRatio, 0.93, 0.01)
    // Cap Rate = (NOI / purchasePrice) * 100 = (11142 / 200000) * 100 = 5.57
    near(r.capRate, 5.57, 0.02)
  })

  it('calculates cash-on-cash return', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // CashOnCash = (annualCF / cashBasis) * 100
    // = (-833.40 / 65000) * 100 = -1.28%
    near(r.cashOnCash, -1.28, 0.1)
  })

  it('calculates year 5 milestones', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // Value at year 5: 250000 * 1.03^5 = 250000 * 1.15927 = 289,818.43
    near(r.equity5 + r.balance5, 250000 * Math.pow(1.03, 5), 1)
    // equity5 = value5 - balance5
    expect(r.equity5).toBeGreaterThan(0)
  })

  it('calculates year 10 milestones', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // Value at year 10: 250000 * 1.03^10 = 335,979.74
    const expectedValue10 = 250000 * Math.pow(1.03, 10)
    near(r.equity10 + r.balance10, expectedValue10, 1)
  })

  it('generates chart data with 31 points', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    expect(r.chartAssets).toHaveLength(31)
    expect(r.chartLoans).toHaveLength(31)
    // Year 0 asset = exitArv = 250000
    expect(r.chartAssets[0]).toBe(250000)
    // Year 0 loan balance = loanAmount = 150000
    near(r.chartLoans[0], 150000, 0.01)
    // Assets should increase
    expect(r.chartAssets[30]).toBeGreaterThan(r.chartAssets[0])
    // Loan at year 30 should be ~0
    near(r.chartLoans[30], 0, 1)
  })

  it('classifies DSCR indicator correctly', () => {
    const r = calculateAll(baseInputs, baseExpenseConfig, 'traditional', [])
    // DSCR ~0.93 → No DSCR (below 1.00)
    expect(r.dscrColorClass).toBe('dscr-status-darkred')
    expect(r.dscrStatusText).toBe('No DSCR')
    expect(r.dscrActiveRowIndex).toBe(4)
  })

  it('classifies DSCR Strong correctly', () => {
    // Higher rents to get DSCR > 1.25
    const highRentInputs = { ...baseInputs, unit1Rent: '2000', unit2Rent: '1500' }
    const r = calculateAll(highRentInputs, baseExpenseConfig, 'traditional', [])
    expect(r.dscrRatio).toBeGreaterThanOrEqual(1.25)
    expect(r.dscrColorClass).toBe('dscr-status-green')
    expect(r.dscrStatusText).toBe('Strong')
    expect(r.dscrActiveRowIndex).toBe(0)
  })
})

// ══════════════════════════════════════════════════
// calculateAll - DSCR Mode
// ══════════════════════════════════════════════════
describe('calculateAll - DSCR Mode', () => {
  const dscrInputs = {
    propertyName: 'Test DSCR', propertyAddress: '',
    purchasePrice: '200000', exitArv: '260000',
    unit1Rent: '1500', unit1Misc: '0', unit2Rent: '1000', unit2Misc: '0',
    unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
    vacancyRate: '5',
    propTaxes: '3600', insurance: '1800', maintenance: '5', utilities: '200',
    propMgmt: '8', capex: '5', mortgageIns: '0',
    appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
    downPercent: '25', closingCost: '5000', rehabCost: '10000',
    interestRate: '7', loanTerm: '30',
    closingCostDscr: '4000', rehabCostDscr: '15000', dscrLtv: '75', carryMonths: '6', carryRate: '10', carryRentPercent: '0', jvSplitMain: '100',
    morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
    morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
    morbyRefiLtv: '75', morbyAppreciation: '',
  }

  const expenseConfig = {
    propTaxes: { mode: 'dollar', freq: 'yr' },
    insurance: { mode: 'dollar', freq: 'yr' },
    maintenance: { mode: 'pct', freq: 'yr' },
    utilities: { mode: 'dollar', freq: 'mo' },
    propMgmt: { mode: 'pct', freq: 'yr' },
    capex: { mode: 'pct', freq: 'yr' },
    mortgageIns: { mode: 'dollar', freq: 'mo' },
  }

  it('calculates DSCR loan amount from ARV', () => {
    const r = calculateAll(dscrInputs, expenseConfig, 'dscr', [])
    // Loan = 260000 * 0.75 = 195000
    expect(r.loanAmount).toBe(195000)
  })

  it('calculates total cash in deal', () => {
    const r = calculateAll(dscrInputs, expenseConfig, 'dscr', [])
    // Purchase: 200000, Fees: 4000, Rehab: 15000
    expect(r.dscrPurchase).toBe(200000)
    expect(r.dscrFees).toBe(4000)
    expect(r.dscrRehab).toBe(15000)
    // Carry: (200000 + 4000 + 15000) * 0.10 * (6/12) = 219000 * 0.05 = 10950
    near(r.dscrCarry, 10950, 0.01)
  })

  it('calculates cash left in deal', () => {
    const r = calculateAll(dscrInputs, expenseConfig, 'dscr', [])
    // Total cash in = 200000 + 4000 + 15000 + 10950 = 229950
    // Loan back = 195000
    // Cash left = 229950 - 195000 = 34950
    near(r.dscrCashLeft, 34950, 1)
    expect(r.dscrHighlightLabel).toBe('Cash Left in Deal')
  })

  it('detects Cash Out scenario', () => {
    // High LTV that covers everything
    const inputs = { ...dscrInputs, dscrLtv: '95', exitArv: '300000' }
    const r = calculateAll(inputs, expenseConfig, 'dscr', [])
    // Loan = 300000 * 0.95 = 285000
    // Total cash in = 200000 + 4000 + 15000 + carry = ~229950
    // Cash left = 229950 - 285000 < 0 → Cash Out!
    expect(r.dscrCashLeft).toBeLessThan(0)
    expect(r.dscrHighlightLabel).toBe('Cash Out!')
    expect(r.dscrHighlightLabelClass).toBe('green')
  })

  it('applies JV split correctly', () => {
    const inputs = { ...dscrInputs, jvSplitMain: '60' }
    const r = calculateAll(inputs, expenseConfig, 'dscr', [])
    // JV split = 60%
    expect(r.jvSplit).toBe(60)
    near(r.displayMonthlyCF, r.monthlyCashFlow * 0.6, 0.01)
    near(r.displayAnnualCF, r.cashFlow * 0.6, 0.01)
    // Cash-on-cash uses displayAnnualCF
    near(r.cashOnCash, (r.displayAnnualCF / r.cashBasis) * 100, 0.01)
    // Full CashOnCash ignores JV split
    near(r.fullCashOnCash, (r.cashFlow / r.cashBasis) * 100, 0.01)
  })

  it('formats DSCR display strings', () => {
    const r = calculateAll(dscrInputs, expenseConfig, 'dscr', [])
    expect(r.dscrLtvDisplay).toBe('75%')
    expect(r.dscrArvDisplay).toBe('$260k')
  })
})

// ══════════════════════════════════════════════════
// calculateAll - Edge Cases
// ══════════════════════════════════════════════════
describe('calculateAll - Edge Cases', () => {
  const emptyInputs = {
    propertyName: '', propertyAddress: '',
    purchasePrice: '', exitArv: '',
    unit1Rent: '', unit1Misc: '', unit2Rent: '', unit2Misc: '',
    unit3Rent: '', unit3Misc: '', unit4Rent: '', unit4Misc: '',
    vacancyRate: '',
    propTaxes: '', insurance: '', maintenance: '', utilities: '', propMgmt: '', capex: '', mortgageIns: '',
    appreciationRate: '', rentGrowth: '', costIncrease: '',
    downPercent: '', closingCost: '', rehabCost: '', interestRate: '', loanTerm: '30',
    closingCostDscr: '', rehabCostDscr: '', dscrLtv: '', carryMonths: '', carryRate: '', carryRentPercent: '0', jvSplitMain: '100',
    morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
    morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
    morbyRefiLtv: '75', morbyAppreciation: '',
  }

  const expenseConfig = {
    propTaxes: { mode: 'dollar', freq: 'yr' },
    insurance: { mode: 'dollar', freq: 'yr' },
    maintenance: { mode: 'pct', freq: 'yr' },
    utilities: { mode: 'dollar', freq: 'mo' },
    propMgmt: { mode: 'pct', freq: 'yr' },
    capex: { mode: 'pct', freq: 'yr' },
    mortgageIns: { mode: 'dollar', freq: 'mo' },
  }

  it('handles all-empty inputs without crashing', () => {
    const r = calculateAll(emptyInputs, expenseConfig, 'traditional', [])
    expect(r.grossMonthlyRent).toBe(0)
    expect(r.noi).toBe(0)
    expect(r.cashFlow).toBe(0)
    expect(r.dscrRatio).toBe(0)
    expect(r.capRate).toBe(0)
    expect(r.cashOnCash).toBe(0)
  })

  it('handles zero purchase price', () => {
    const inputs = { ...emptyInputs, unit1Rent: '1000', interestRate: '7' }
    const r = calculateAll(inputs, expenseConfig, 'traditional', [])
    expect(r.loanAmount).toBe(0)
    expect(r.capRate).toBe(0)
  })
})

// ══════════════════════════════════════════════════
// runStressTest
// ══════════════════════════════════════════════════
describe('runStressTest', () => {
  const inputs = {
    propertyName: 'Test', propertyAddress: '',
    purchasePrice: '200000', exitArv: '250000',
    unit1Rent: '2000', unit1Misc: '0', unit2Rent: '1000', unit2Misc: '0',
    unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
    vacancyRate: '5',
    propTaxes: '3000', insurance: '1500', maintenance: '5', utilities: '150',
    propMgmt: '8', capex: '5', mortgageIns: '0',
    appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
    downPercent: '25', closingCost: '5000', rehabCost: '10000',
    interestRate: '7', loanTerm: '30',
    closingCostDscr: '', rehabCostDscr: '', dscrLtv: '', carryMonths: '', carryRate: '', carryRentPercent: '0', jvSplitMain: '100',
    morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
    morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
    morbyRefiLtv: '75', morbyAppreciation: '',
  }

  const expenseConfig = {
    propTaxes: { mode: 'dollar', freq: 'yr' },
    insurance: { mode: 'dollar', freq: 'yr' },
    maintenance: { mode: 'pct', freq: 'yr' },
    utilities: { mode: 'dollar', freq: 'mo' },
    propMgmt: { mode: 'pct', freq: 'yr' },
    capex: { mode: 'pct', freq: 'yr' },
    mortgageIns: { mode: 'dollar', freq: 'mo' },
  }

  it('returns exactly 9 scenarios', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    expect(results).toHaveLength(9)
  })

  it('first scenario is base case', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    expect(results[0].isBase).toBe(true)
    expect(results[0].name).toContain('Base Case')
  })

  it('base case matches calculateAll metrics', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const all = calculateAll(inputs, expenseConfig, 'traditional', [])
    // Base case DSCR should match
    near(results[0].dscr, all.dscrRatio, 0.02)
  })

  it('rent reduction scenarios have lower DSCR', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const base = results[0]
    const rent10 = results[1]  // Rent -10%
    const rent20 = results[2]  // Rent -20%
    expect(rent10.dscr).toBeLessThan(base.dscr)
    expect(rent20.dscr).toBeLessThan(rent10.dscr)
    expect(rent20.monthlyCF).toBeLessThan(rent10.monthlyCF)
  })

  it('vacancy scenarios have lower cash flow', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const base = results[0]
    const vac15 = results[3]  // Vacancy 15%
    const vac25 = results[4]  // Vacancy 25%
    expect(vac15.monthlyCF).toBeLessThan(base.monthlyCF)
    expect(vac25.monthlyCF).toBeLessThan(vac15.monthlyCF)
  })

  it('interest rate increase scenario has lower cash flow', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const base = results[0]
    const rateUp = results[5]  // Interest +1%
    expect(rateUp.monthlyCF).toBeLessThan(base.monthlyCF)
  })

  it('insurance increase scenarios have lower cash flow', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const base = results[0]
    const ins15 = results[6]  // Insurance 1.5x
    const ins20 = results[7]  // Insurance 2x
    expect(ins15.monthlyCF).toBeLessThan(base.monthlyCF)
    expect(ins20.monthlyCF).toBeLessThan(ins15.monthlyCF)
  })

  it('worst case has lowest metrics', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    const worst = results[8]
    // Worst case should have lowest DSCR of all
    results.forEach(s => {
      expect(worst.dscr).toBeLessThanOrEqual(s.dscr + 0.01)
    })
  })

  it('status classes are assigned correctly', () => {
    const results = runStressTest(inputs, expenseConfig, 'traditional', [])
    results.forEach(s => {
      if (s.dscr >= 1.25) {
        expect(s.statusClass).toBe('status-pass')
      } else if (s.dscr >= 1.0) {
        expect(s.statusClass).toBe('status-warn')
      } else {
        expect(s.statusClass).toBe('status-fail')
      }
    })
  })
})

// ══════════════════════════════════════════════════
// calculateOffer (Morby Method)
// ══════════════════════════════════════════════════
describe('calculateOffer', () => {
  const inputs = {
    purchasePrice: '300000', exitArv: '350000',
    unit1Rent: '1500', unit1Misc: '0', unit2Rent: '1200', unit2Misc: '0',
    unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
    vacancyRate: '5',
    propTaxes: '4000', insurance: '2000', maintenance: '5', utilities: '250',
    propMgmt: '8', capex: '5', mortgageIns: '0',
    appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
    morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
    morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
    morbyRefiLtv: '75', morbyAppreciation: '',
  }

  const expenseConfig = {
    propTaxes: { mode: 'dollar', freq: 'yr' },
    insurance: { mode: 'dollar', freq: 'yr' },
    maintenance: { mode: 'pct', freq: 'yr' },
    utilities: { mode: 'dollar', freq: 'mo' },
    propMgmt: { mode: 'pct', freq: 'yr' },
    capex: { mode: 'pct', freq: 'yr' },
    mortgageIns: { mode: 'dollar', freq: 'mo' },
  }

  it('calculates DSCR loan and seller carry split', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // DSCR loan = 300000 * 0.25 = 75000
    expect(r.dscrLoanAmount).toBe(75000)
    // Seller carry = 300000 * 0.75 = 225000
    expect(r.sellerCarryAmount).toBe(225000)
  })

  it('calculates monthly payments correctly', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // DSCR payment: $75k at 8% for 30yr
    near(r.dscrMonthly, calculateMortgage(75000, 8, 30), 0.01)
    // Seller payment: $225k at 5% for 30yr
    near(r.sellerMonthly, calculateMortgage(225000, 5, 30), 0.01)
    // Total = sum
    near(r.totalMonthlyDebt, r.dscrMonthly + r.sellerMonthly, 0.01)
  })

  it('calculates monthly cash flow', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // Gross rent = (1500 + 1200) * 12 = 32400/yr
    // Effective rent = 2700 * 0.95 = 2565/mo
    // Expenses (annual): taxes 4000 + ins 2000 + maint 5%*32400=1620 + utils 250*12=3000 + mgmt 8%*32400=2592 + capex 5%*32400=1620 + mortIns 0 = 14832
    // Monthly expenses = 14832/12 = 1236
    // CF = 2565 - 1236 - totalDebt
    const grossMonthly = 1500 + 1200
    const effective = grossMonthly * 0.95
    const annualGross = grossMonthly * 12
    const totalExpYr = 4000 + 2000 + annualGross * 0.05 + 250 * 12 + annualGross * 0.08 + annualGross * 0.05 + 0
    const expectedCF = effective - totalExpYr / 12 - r.totalMonthlyDebt
    near(r.monthlyCF, expectedCF, 0.50)
  })

  it('calculates balloon analysis', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // Projected value at year 7 with 3% appreciation
    near(r.projectedValue, 300000 * Math.pow(1.03, 7), 1)
    // Balloon year
    expect(r.balloonYears).toBe(7)
    // Seller balance at balloon
    near(r.sellerBalanceAtBalloon, getLoanBalance(225000, 5, 30, 84), 1)
    // DSCR balance at balloon
    near(r.dscrBalanceAtBalloon, getLoanBalance(75000, 8, 30, 84), 1)
    // Total payoff
    near(r.totalPayoff, r.sellerBalanceAtBalloon + r.dscrBalanceAtBalloon, 0.01)
    // Max refi = projectedValue * 0.75
    near(r.maxRefi, r.projectedValue * 0.75, 0.01)
    // Surplus = maxRefi - totalPayoff
    near(r.surplus, r.maxRefi - r.totalPayoff, 0.01)
  })

  it('generates amortization table', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // numRows = max(7+3, 10) = 10
    expect(r.amortRows.length).toBe(10)

    // Year 1 values
    const row1 = r.amortRows[0]
    expect(row1.year).toBe(1)
    expect(row1.isBalloon).toBe(false)
    near(row1.propValue, 300000 * Math.pow(1.03, 1), 1)

    // Balloon year (year 7)
    const row7 = r.amortRows[6]
    expect(row7.year).toBe(7)
    expect(row7.isBalloon).toBe(true)

    // Equity should increase over time
    expect(r.amortRows[9].equity).toBeGreaterThan(r.amortRows[0].equity)
  })

  it('accumulates cumulative cash flow correctly', () => {
    const r = calculateOffer(inputs, expenseConfig)
    // Cumulative CF should be sum of all annual CFs
    let runningTotal = 0
    r.amortRows.forEach(row => {
      runningTotal += row.annualCF
      near(row.cumulativeCF, runningTotal, 0.01)
    })
  })

  it('uses override appreciation rate when provided', () => {
    const inputsOverride = { ...inputs, morbyAppreciation: '5' }
    const r = calculateOffer(inputsOverride, expenseConfig)
    // Should use 5% instead of 3%
    near(r.projectedValue, 300000 * Math.pow(1.05, 7), 1)
  })

  it('falls back to main appreciation rate when override is empty', () => {
    const r = calculateOffer(inputs, expenseConfig)
    near(r.projectedValue, 300000 * Math.pow(1.03, 7), 1)
  })

  it('generates correct number of rows for long balloon periods', () => {
    const longBalloon = { ...inputs, morbyBalloonYears: '15' }
    const r = calculateOffer(longBalloon, expenseConfig)
    // numRows = max(15+3, 10) = 18
    expect(r.amortRows.length).toBe(18)
    expect(r.amortRows[14].isBalloon).toBe(true)
  })
})

// ══════════════════════════════════════════════════
// runJvSimulation
// ══════════════════════════════════════════════════
describe('runJvSimulation', () => {
  it('runs basic simulation', () => {
    // cashIn=50000, preRefiCF=500, postRefiCF=800, refiMonth=6, paybackMonths=3, splitYou=50, months=12
    const r = runJvSimulation(50000, 500, 800, 6, 3, 50, 12)
    expect(r.months).toHaveLength(12)
    expect(r.dealCF).toHaveLength(12)
  })

  it('gives 100% to investor during payback period', () => {
    const r = runJvSimulation(50000, 500, 800, 6, 3, 50, 12)
    // Months 1-3: payback period, cashToYou = dealCF, cashToOperator = 0
    expect(r.cashToYou[0]).toBe(500)
    expect(r.cashToOperator[0]).toBe(0)
    expect(r.cashToYou[1]).toBe(500)
    expect(r.cashToOperator[1]).toBe(0)
    expect(r.cashToYou[2]).toBe(500)
    expect(r.cashToOperator[2]).toBe(0)
  })

  it('splits according to percentage after payback period', () => {
    const r = runJvSimulation(50000, 500, 800, 6, 3, 50, 12)
    // Month 4: post payback, pre refi. dealCF=500, split 50/50
    expect(r.cashToYou[3]).toBe(250)
    expect(r.cashToOperator[3]).toBe(250)
  })

  it('switches to post-refi cash flow at refi month', () => {
    const r = runJvSimulation(50000, 500, 800, 6, 3, 50, 12)
    // Month 7 (index 6): post refi, dealCF=800, split 50/50
    expect(r.dealCF[6]).toBe(800)
    expect(r.cashToYou[6]).toBe(400)
    expect(r.cashToOperator[6]).toBe(400)
  })

  it('tracks remaining capital correctly', () => {
    const r = runJvSimulation(5000, 1000, 1000, 1, 0, 50, 12)
    // No payback period (0 months), so split starts immediately
    // Month 1: dealCF=1000 (pre-refi since month <= refiMonth=1)
    // Actually refiMonth=1, so month 1 <= 1 → dealCF = preRefiCF = 1000
    // But paybackMonths=0, so month 1 > 0 → split mode
    // cashToYou = 1000 * 0.5 = 500
    // remaining = 5000 - 500 = 4500
    expect(r.remainingCapital[0]).toBe(4500)
    // Month 2: dealCF = postRefiCF = 1000, cashToYou = 500
    // remaining = 4500 - 500 = 4000
    expect(r.remainingCapital[1]).toBe(4000)
  })

  it('detects full payback month', () => {
    // cashIn=3000, dealCF=1000/mo, payback first 2 months, then 50/50
    // Month 1: cashToYou=1000, remaining=2000
    // Month 2: cashToYou=1000, remaining=1000
    // Month 3: split, cashToYou=500, remaining=500
    // Month 4: split, cashToYou=500, remaining=0
    // Month 5: split, cashToYou=500, remaining=-500 → cap at 0, paybackMonth=5
    // Wait: remaining starts at 3000
    // M1: payback, cashToYou=1000, remaining=2000
    // M2: payback, cashToYou=1000, remaining=1000
    // M3: split 50%, cashToYou=500, remaining=500
    // M4: split 50%, cashToYou=500, remaining=0
    // M5: split 50%, cashToYou=500, remaining= -500 → paybackMonth=5, capped to 0
    // Actually remaining goes to 0 at month 4, which is <= 0, so paybackMonth = 4
    // Wait: 0 is <= 0! So paybackMonth = 4
    const r = runJvSimulation(3000, 1000, 1000, 1, 2, 50, 10)
    expect(r.fullPaybackMonth).toBe(4)
    // After payback, remaining capital stays at 0
    expect(r.remainingCapital[4]).toBe(0) // month 5
  })

  it('cumulative totals are correct', () => {
    const r = runJvSimulation(10000, 500, 800, 4, 2, 60, 8)
    let cumYou = 0
    let cumOp = 0
    r.months.forEach((_, i) => {
      cumYou += r.cashToYou[i]
      cumOp += r.cashToOperator[i]
      near(r.cumCashToYou[i], cumYou, 0.01)
      near(r.cumCashToOperator[i], cumOp, 0.01)
    })
  })

  it('handles zero cash flow', () => {
    const r = runJvSimulation(10000, 0, 0, 6, 3, 50, 12)
    expect(r.fullPaybackMonth).toBeNull()
    r.remainingCapital.forEach(rc => {
      expect(rc).toBe(10000)
    })
  })

  it('handles 100% split to investor', () => {
    const r = runJvSimulation(10000, 1000, 1000, 6, 0, 100, 5)
    // All cash goes to investor
    r.cashToYou.forEach(c => expect(c).toBe(1000))
    r.cashToOperator.forEach(c => expect(c).toBe(0))
  })
})

// ══════════════════════════════════════════════════
// computeCarrySchedule
// ══════════════════════════════════════════════════
describe('computeCarrySchedule', () => {
  it('computes simple schedule without tranches', () => {
    // Total = 200000 + 5000 + 10000 = 215000
    // Default rate 8%, 6 months
    // Monthly interest = 215000 * 0.08 / 12 = 1433.33
    const r = computeCarrySchedule(200000, 5000, 10000, 6, 8, [])
    expect(r.schedule).toHaveLength(6)
    expect(r.totalCashNeeded).toBe(215000)
    expect(r.defaultAllocation).toBe(215000)
    expect(r.trancheAllocations).toHaveLength(0)

    // Each month's total should be 1433.33
    r.schedule.forEach(row => {
      near(row.default, 1433.33, 0.01)
      near(row.total, 1433.33, 0.01)
    })

    // Total interest = 1433.33 * 6 = 8600
    near(r.totalInterest, 8600, 0.01)
    expect(r.totalPoints).toBe(0)
    near(r.totalCarryCost, 8600, 0.01)
  })

  it('computes schedule with one tranche', () => {
    // Total = 100000
    // Tranche: $60k at 5%, 1 point
    // Default: remaining $40k at 10%
    const r = computeCarrySchedule(100000, 0, 0, 4, 10, [
      { amount: 60000, rate: 5, points: 1 }
    ])

    expect(r.trancheAllocations).toHaveLength(1)
    expect(r.trancheAllocations[0].allocated).toBe(60000)
    expect(r.defaultAllocation).toBe(40000)

    // Monthly: tranche = 60000 * 0.05/12 = 250, default = 40000 * 0.10/12 = 333.33
    r.schedule.forEach(row => {
      near(row.tranche0, 250, 0.01)
      near(row.default, 333.33, 0.01)
      near(row.total, 583.33, 0.01)
    })

    // Total interest = 583.33 * 4 = 2333.33
    near(r.totalInterest, 2333.33, 0.01)
    // Points = 60000 * 0.01 = 600
    near(r.totalPoints, 600, 0.01)
    // Total carry cost = 2333.33 + 600 = 2933.33
    near(r.totalCarryCost, 2933.33, 0.01)
  })

  it('computes blended rate correctly', () => {
    const r = computeCarrySchedule(100000, 0, 0, 12, 10, [
      { amount: 50000, rate: 6, points: 0 }
    ])
    // Tranche: 50k at 6%, Default: 50k at 10%
    // Monthly interest: 50000*0.06/12 + 50000*0.10/12 = 250 + 416.67 = 666.67
    // Total interest over 12 months = 8000
    // Blended rate = (666.67 * 12 / 100000 * 100) = 8%
    // Formula in code: totalInterest / carryMonths * 12 / totalCashNeeded * 100
    near(r.blendedRate, 8, 0.01)
  })

  it('handles multiple tranches', () => {
    // Total = 150000
    // T1: 50k at 4%, 0.5pts
    // T2: 60k at 6%, 1pt
    // Default: 40k at 12%
    const r = computeCarrySchedule(150000, 0, 0, 3, 12, [
      { amount: 50000, rate: 4, points: 0.5 },
      { amount: 60000, rate: 6, points: 1 }
    ])

    expect(r.trancheAllocations[0].allocated).toBe(50000)
    expect(r.trancheAllocations[1].allocated).toBe(60000)
    expect(r.defaultAllocation).toBe(40000)

    // Monthly: T1=50000*0.04/12=166.67, T2=60000*0.06/12=300, Default=40000*0.12/12=400
    const expectedMonthly = 166.67 + 300 + 400
    r.schedule.forEach(row => {
      near(row.total, expectedMonthly, 0.02)
    })

    // Points: 50000*0.005=250 + 60000*0.01=600 = 850
    near(r.totalPoints, 850, 0.01)
  })

  it('clamps tranche allocation to remaining', () => {
    // Total = 50000
    // Tranche: 80000 → only 50000 allocated
    const r = computeCarrySchedule(50000, 0, 0, 1, 10, [
      { amount: 80000, rate: 6, points: 0 }
    ])
    expect(r.trancheAllocations[0].allocated).toBe(50000)
    expect(r.defaultAllocation).toBe(0)
    // Monthly: 50000*0.06/12=250, default=0
    near(r.schedule[0].total, 250, 0.01)
  })
})

// ══════════════════════════════════════════════════
// Cross-function consistency checks
// ══════════════════════════════════════════════════
describe('Cross-function consistency', () => {
  it('getCarryCost matches computeCarrySchedule totalCarryCost', () => {
    const purchase = 200000, closing = 5000, rehab = 10000, months = 6, rate = 8

    // Without tranches
    const cost1 = getCarryCost(purchase, closing, rehab, months, rate, [])
    const sched1 = computeCarrySchedule(purchase, closing, rehab, months, rate, [])
    near(cost1, sched1.totalCarryCost, 0.01)

    // With tranches
    const tranches = [
      { amount: 100000, rate: 5, points: 2 },
      { amount: 80000, rate: 7, points: 0.5 }
    ]
    const cost2 = getCarryCost(purchase, closing, rehab, months, rate, tranches)
    const sched2 = computeCarrySchedule(purchase, closing, rehab, months, rate, tranches)
    near(cost2, sched2.totalCarryCost, 0.01)
  })

  it('calculateMortgage and getLoanBalance are consistent', () => {
    // After N payments, paying remaining balance should equal total paid
    const principal = 200000
    const rate = 7
    const years = 30
    const payment = calculateMortgage(principal, rate, years)

    // Total paid over life = payment * 360
    const totalPaid = payment * 360
    // Total interest = totalPaid - principal
    const totalInterest = totalPaid - principal
    expect(totalInterest).toBeGreaterThan(0)

    // At month 180 (15 years), balance should be between 0 and principal
    const balance180 = getLoanBalance(principal, rate, years, 180)
    expect(balance180).toBeGreaterThan(0)
    expect(balance180).toBeLessThan(principal)
  })

  it('calculateAll traditional basis equals down + closing + rehab', () => {
    const inputs = {
      propertyName: '', propertyAddress: '',
      purchasePrice: '300000', exitArv: '350000',
      unit1Rent: '1500', unit1Misc: '0', unit2Rent: '0', unit2Misc: '0',
      unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
      vacancyRate: '5',
      propTaxes: '3000', insurance: '1500', maintenance: '5', utilities: '200',
      propMgmt: '8', capex: '5', mortgageIns: '0',
      appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
      downPercent: '20', closingCost: '6000', rehabCost: '8000',
      interestRate: '6.5', loanTerm: '30',
      closingCostDscr: '', rehabCostDscr: '', dscrLtv: '', carryMonths: '', carryRate: '', carryRentPercent: '0', jvSplitMain: '100',
      morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
      morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
      morbyRefiLtv: '75', morbyAppreciation: '',
    }
    const expCfg = {
      propTaxes: { mode: 'dollar', freq: 'yr' },
      insurance: { mode: 'dollar', freq: 'yr' },
      maintenance: { mode: 'pct', freq: 'yr' },
      utilities: { mode: 'dollar', freq: 'mo' },
      propMgmt: { mode: 'pct', freq: 'yr' },
      capex: { mode: 'pct', freq: 'yr' },
      mortgageIns: { mode: 'dollar', freq: 'mo' },
    }
    const r = calculateAll(inputs, expCfg, 'traditional', [])
    expect(r.cashBasis).toBe(r.downAmount + r.feesAmount + r.rehabAmount)
    expect(r.cashBasis).toBe(300000 * 0.2 + 6000 + 8000) // 74000
  })

  it('offer DSCR + seller carry = purchase price', () => {
    const inputs = {
      purchasePrice: '400000', exitArv: '450000',
      unit1Rent: '2000', unit1Misc: '0', unit2Rent: '0', unit2Misc: '0',
      unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
      vacancyRate: '5',
      propTaxes: '3000', insurance: '1500', maintenance: '5', utilities: '200',
      propMgmt: '8', capex: '5', mortgageIns: '0',
      appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
      morbyDownPct: '30', morbyDscrRate: '7.5', morbyDscrTerm: '30',
      morbySellerRate: '4.5', morbySellerAmort: '25', morbyBalloonYears: '5',
      morbyRefiLtv: '80', morbyAppreciation: '',
    }
    const expCfg = {
      propTaxes: { mode: 'dollar', freq: 'yr' },
      insurance: { mode: 'dollar', freq: 'yr' },
      maintenance: { mode: 'pct', freq: 'yr' },
      utilities: { mode: 'dollar', freq: 'mo' },
      propMgmt: { mode: 'pct', freq: 'yr' },
      capex: { mode: 'pct', freq: 'yr' },
      mortgageIns: { mode: 'dollar', freq: 'mo' },
    }
    const r = calculateOffer(inputs, expCfg)
    expect(r.dscrLoanAmount + r.sellerCarryAmount).toBe(400000)
  })

  it('offer amort table equity = propValue - totalDebt', () => {
    const inputs = {
      purchasePrice: '250000', exitArv: '280000',
      unit1Rent: '1800', unit1Misc: '0', unit2Rent: '0', unit2Misc: '0',
      unit3Rent: '0', unit3Misc: '0', unit4Rent: '0', unit4Misc: '0',
      vacancyRate: '5',
      propTaxes: '3000', insurance: '1500', maintenance: '5', utilities: '200',
      propMgmt: '8', capex: '5', mortgageIns: '0',
      appreciationRate: '3', rentGrowth: '2', costIncrease: '2',
      morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
      morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
      morbyRefiLtv: '75', morbyAppreciation: '',
    }
    const expCfg = {
      propTaxes: { mode: 'dollar', freq: 'yr' },
      insurance: { mode: 'dollar', freq: 'yr' },
      maintenance: { mode: 'pct', freq: 'yr' },
      utilities: { mode: 'dollar', freq: 'mo' },
      propMgmt: { mode: 'pct', freq: 'yr' },
      capex: { mode: 'pct', freq: 'yr' },
      mortgageIns: { mode: 'dollar', freq: 'mo' },
    }
    const r = calculateOffer(inputs, expCfg)
    r.amortRows.forEach(row => {
      near(row.equity, row.propValue - row.totalDebt, 1)
    })
  })
})

// ══════════════════════════════════════════════════
// Numerical accuracy: mortgage payment against known values
// ══════════════════════════════════════════════════
describe('Mortgage payment accuracy against known bank values', () => {
  // These are standard amortization values used by lenders
  const knownPayments = [
    { principal: 100000, rate: 3.0, years: 30, expected: 421.60 },
    { principal: 100000, rate: 4.0, years: 30, expected: 477.42 },
    { principal: 100000, rate: 5.0, years: 30, expected: 536.82 },
    { principal: 100000, rate: 6.0, years: 30, expected: 599.55 },
    { principal: 100000, rate: 7.0, years: 30, expected: 665.30 },
    { principal: 100000, rate: 8.0, years: 30, expected: 733.76 },
    { principal: 100000, rate: 9.0, years: 30, expected: 804.62 },
    { principal: 100000, rate: 10.0, years: 30, expected: 877.57 },
    { principal: 100000, rate: 6.0, years: 15, expected: 843.86 },
    { principal: 100000, rate: 7.0, years: 15, expected: 898.83 },
    { principal: 250000, rate: 6.5, years: 30, expected: 1580.17 },
    { principal: 350000, rate: 7.25, years: 30, expected: 2387.62 },
    { principal: 500000, rate: 3.5, years: 30, expected: 2245.22 },
  ]

  knownPayments.forEach(({ principal, rate, years, expected }) => {
    it(`$${principal.toLocaleString()} at ${rate}% for ${years}yr = $${expected}`, () => {
      const payment = calculateMortgage(principal, rate, years)
      near(payment, expected, 0.02)
    })
  })
})

// ══════════════════════════════════════════════════
// Loan balance accuracy at key milestones
// ══════════════════════════════════════════════════
describe('Loan balance accuracy at key milestones', () => {
  // $200,000 at 7% for 30 years - standard amortization schedule milestones
  it('$200k at 7%/30yr balance after 1 year', () => {
    const balance = getLoanBalance(200000, 7, 30, 12)
    near(balance, 197968.38, 1)
  })

  it('$200k at 7%/30yr balance after 5 years', () => {
    const balance = getLoanBalance(200000, 7, 30, 60)
    near(balance, 188263.18, 1)
  })

  it('$200k at 7%/30yr balance after 15 years', () => {
    const balance = getLoanBalance(200000, 7, 30, 180)
    near(balance, 148037.73, 1)
  })

  it('$200k at 7%/30yr balance after 25 years', () => {
    const balance = getLoanBalance(200000, 7, 30, 300)
    near(balance, 67198.20, 1)
  })

  it('$100k at 5%/15yr balance after 5 years', () => {
    const balance = getLoanBalance(100000, 5, 15, 60)
    near(balance, 74557.09, 1)
  })
})
