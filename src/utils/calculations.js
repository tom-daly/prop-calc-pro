import { SELLER_FINANCE, SUBJECT_TO } from './offerStrategies'

// Sum gross monthly rent from units array (with legacy fallback)
export function getGrossMonthlyRent(inputs) {
  if (Array.isArray(inputs.units)) {
    return inputs.units.reduce((sum, u) => sum + (parseFloat(u.rent) || 0) + (parseFloat(u.misc) || 0), 0)
  }
  // Legacy fallback for old unit1Rent format
  let total = 0
  for (let i = 1; i <= 4; i++) {
    total += (parseFloat(inputs[`unit${i}Rent`]) || 0) + (parseFloat(inputs[`unit${i}Misc`]) || 0)
  }
  return total
}

// Parse a numeric input, returning fallback only when the value is empty/NaN (not when 0)
function num(val, fallback = 0) {
  if (val === '' || val === undefined || val === null) return fallback
  const n = parseFloat(val)
  return isNaN(n) ? fallback : n
}

// Compute chart arrays (30yr) and year 5/10 milestones for offer strategies
function computeOfferChartAndMilestones(purchasePrice, appreciationRate, annualEffectiveRent, totalExpenses, annualDebtService, rentGrowthRate, costIncreaseRate, basisForGain, getDebtAtMonth) {
  const chartAssets = []
  const chartLoans = []
  for (let y = 0; y <= 30; y++) {
    chartAssets.push(purchasePrice * Math.pow(1 + appreciationRate, y))
    chartLoans.push(getDebtAtMonth(y * 12))
  }

  function milestoneAt(years) {
    const value = purchasePrice * Math.pow(1 + appreciationRate, years)
    const debt = getDebtAtMonth(years * 12)
    const equity = value - debt
    const flow = getCumulativeFlow(annualEffectiveRent, totalExpenses, annualDebtService, rentGrowthRate, costIncreaseRate, years)
    const netGain = equity + flow - basisForGain
    return { equity, balance: debt, flow, netGain }
  }

  const m5 = milestoneAt(5)
  const m10 = milestoneAt(10)

  return {
    chartAssets, chartLoans,
    equity5: m5.equity, balance5: m5.balance, flow5: m5.flow, netGain5: m5.netGain,
    equity10: m10.equity, balance10: m10.balance, flow10: m10.flow, netGain10: m10.netGain,
  }
}

export function calculateMortgage(principal, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12
  const n = years * 12
  if (monthlyRate === 0) return principal / n
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
}

export function calculateMaxLoan(maxMonthlyPayment, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12
  const n = years * 12
  if (monthlyRate === 0) return maxMonthlyPayment * n
  return maxMonthlyPayment * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n))
}

export function getLoanBalance(principal, annualRate, years, monthsPaid) {
  const monthlyRate = annualRate / 100 / 12
  const n = years * 12
  if (monthlyRate === 0) return principal - (principal / n) * monthsPaid
  const payment = calculateMortgage(principal, annualRate, years)
  return principal * Math.pow(1 + monthlyRate, monthsPaid) - payment * ((Math.pow(1 + monthlyRate, monthsPaid) - 1) / monthlyRate)
}

export function calcExpenseYearly(field, value, config, annualGrossRent) {
  if (config.mode === 'pct') {
    return annualGrossRent * (value / 100)
  }
  return config.freq === 'mo' ? value * 12 : value
}

export function getCarryCost(purchasePrice, closingCost, rehabCost, carryMonths, defaultRate, carryTranches) {
  const totalCashNeeded = purchasePrice + closingCost + rehabCost

  if (!carryTranches || carryTranches.length === 0) {
    return totalCashNeeded * (defaultRate / 100) * (carryMonths / 12)
  }

  let remaining = totalCashNeeded
  let totalCarry = 0
  let totalPoints = 0

  carryTranches.forEach(t => {
    const allocated = Math.min(t.amount, remaining)
    remaining -= allocated
    totalCarry += allocated * (t.rate / 100) * (carryMonths / 12)
    totalPoints += allocated * ((t.points || 0) / 100)
  })

  totalCarry += remaining * (defaultRate / 100) * (carryMonths / 12)

  return totalCarry + totalPoints
}

export function getCumulativeFlow(annualEffectiveRent, totalExpenses, annualDebtService, rentGrowthRate, costIncreaseRate, years) {
  let total = 0
  let yearlyRent = annualEffectiveRent
  let yearlyExp = totalExpenses
  for (let y = 1; y <= years; y++) {
    if (y > 1) {
      yearlyRent *= (1 + rentGrowthRate)
      yearlyExp *= (1 + costIncreaseRate)
    }
    const yearNoi = yearlyRent - yearlyExp
    const yearCashFlow = yearNoi - annualDebtService
    total += yearCashFlow
  }
  return total
}

// Main calculation: returns all computed results for traditional/dscr modes
export function calculateAll(inputs, expenseConfig, mode, carryTranches) {
  const purchasePrice = parseFloat(inputs.purchasePrice) || 0
  const exitArv = parseFloat(inputs.exitArv) || 0
  const interestRate = parseFloat(inputs.interestRate) || 0
  const loanTerm = parseFloat(inputs.loanTerm) || 30

  let loanAmount, totalOutOfPocket, cashBasis

  // DSCR-specific
  let dscrPurchase, dscrFees, dscrRehab, dscrCarry, dscrLoanAmount, dscrLtvDisplay, dscrArvDisplay
  let dscrCashLeft, dscrHighlightLabel, dscrHighlightLabelClass
  // Traditional-specific
  let downAmount, feesAmount, rehabAmount

  if (mode === 'dscr') {
    const closingCost = parseFloat(inputs.closingCostDscr) || 0
    const rehabCost = parseFloat(inputs.rehabCostDscr) || 0
    const dscrLtv = parseFloat(inputs.dscrLtv) || 0
    const carryMonths = parseFloat(inputs.carryMonths) || 0
    const carryRate = parseFloat(inputs.carryRate) || 0

    const totalCashNeeded = purchasePrice + closingCost + rehabCost
    const carryAmount = getCarryCost(purchasePrice, closingCost, rehabCost, carryMonths, carryRate, carryTranches)
    const totalCashIn = totalCashNeeded + carryAmount

    loanAmount = exitArv * (dscrLtv / 100)
    const cashBack = loanAmount
    const cashLeftInDeal = totalCashIn - cashBack

    cashBasis = cashLeftInDeal > 0 ? cashLeftInDeal : Math.abs(cashLeftInDeal)
    totalOutOfPocket = cashLeftInDeal

    dscrPurchase = purchasePrice
    dscrFees = closingCost
    dscrRehab = rehabCost
    dscrCarry = carryAmount
    dscrLoanAmount = loanAmount
    dscrLtvDisplay = dscrLtv + '%'
    dscrArvDisplay = '$' + Math.round(exitArv / 1000) + 'k'
    dscrCashLeft = cashLeftInDeal

    if (cashLeftInDeal < 0) {
      dscrHighlightLabel = 'Cash Out!'
      dscrHighlightLabelClass = 'green'
    } else {
      dscrHighlightLabel = 'Cash Left in Deal'
      dscrHighlightLabelClass = ''
    }
  } else {
    const downPct = parseFloat(inputs.downPercent) || 0
    const closingCost = parseFloat(inputs.closingCost) || 0
    const rehabCost = parseFloat(inputs.rehabCost) || 0

    const downPayment = purchasePrice * (downPct / 100)
    loanAmount = purchasePrice - downPayment
    totalOutOfPocket = downPayment + closingCost + rehabCost
    cashBasis = totalOutOfPocket

    downAmount = downPayment
    feesAmount = closingCost
    rehabAmount = rehabCost
  }

  // Revenue
  const grossMonthlyRent = getGrossMonthlyRent(inputs)
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0
  const effectiveMonthlyRent = grossMonthlyRent * (1 - vacancyRate / 100)
  const annualGrossRent = grossMonthlyRent * 12

  // Expenses
  const expenseFields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
  const expenseYearly = {}
  let totalExpenses = 0
  expenseFields.forEach(field => {
    const val = parseFloat(inputs[field]) || 0
    const yearly = calcExpenseYearly(field, val, expenseConfig[field], annualGrossRent)
    expenseYearly[field] = yearly
    totalExpenses += yearly
  })

  // NOI and Metrics
  const annualEffectiveRent = effectiveMonthlyRent * 12
  const noi = annualEffectiveRent - totalExpenses
  const monthlyPayment = calculateMortgage(loanAmount, interestRate, loanTerm)
  const annualDebtService = monthlyPayment * 12
  const cashFlow = noi - annualDebtService
  const monthlyCashFlow = cashFlow / 12

  const dscrRatio = annualDebtService > 0 ? noi / annualDebtService : 0
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0

  const jvSplit = mode === 'dscr' ? (parseFloat(inputs.jvSplitMain) || 100) : 100
  const displayMonthlyCF = monthlyCashFlow * (jvSplit / 100)
  const displayAnnualCF = cashFlow * (jvSplit / 100)
  const cashOnCash = cashBasis > 0 ? (displayAnnualCF / cashBasis) * 100 : 0
  const fullCashOnCash = cashBasis > 0 ? (cashFlow / cashBasis) * 100 : 0

  // Growth rates
  const appreciationRate = (parseFloat(inputs.appreciationRate) || 0) / 100
  const rentGrowthRate = (parseFloat(inputs.rentGrowth) || 0) / 100
  const costIncreaseRate = (parseFloat(inputs.costIncrease) || 0) / 100

  const basisForGain = mode === 'dscr' ? Math.max(totalOutOfPocket, 0) : totalOutOfPocket

  // Year 5
  const value5 = exitArv * Math.pow(1 + appreciationRate, 5)
  const balance5 = getLoanBalance(loanAmount, interestRate, loanTerm, 60)
  const equity5 = value5 - balance5
  const flow5 = getCumulativeFlow(annualEffectiveRent, totalExpenses, annualDebtService, rentGrowthRate, costIncreaseRate, 5)
  const netGain5 = equity5 + flow5 - basisForGain

  // Year 10
  const value10 = exitArv * Math.pow(1 + appreciationRate, 10)
  const balance10 = getLoanBalance(loanAmount, interestRate, loanTerm, 120)
  const equity10 = value10 - balance10
  const flow10 = getCumulativeFlow(annualEffectiveRent, totalExpenses, annualDebtService, rentGrowthRate, costIncreaseRate, 10)
  const netGain10 = equity10 + flow10 - basisForGain

  // Chart data (30 years)
  const chartAssets = []
  const chartLoans = []
  for (let y = 0; y <= 30; y++) {
    chartAssets.push(exitArv * Math.pow(1 + appreciationRate, y))
    chartLoans.push(y * 12 <= loanTerm * 12 ? getLoanBalance(loanAmount, interestRate, loanTerm, y * 12) : 0)
  }

  // DSCR indicator
  const roundedDscr = Math.round(dscrRatio * 100) / 100
  let dscrEmoji, dscrStatusText, dscrColorClass, dscrActiveRowIndex, dscrDetails
  if (roundedDscr >= 1.25) {
    dscrEmoji = '\u{1F7E2}'; dscrStatusText = 'Strong'; dscrColorClass = 'dscr-status-green'; dscrActiveRowIndex = 0; dscrDetails = 'Best rates & leverage. Minimal pushback.'
  } else if (roundedDscr >= 1.15) {
    dscrEmoji = '\u{1F7E1}'; dscrStatusText = 'Acceptable'; dscrColorClass = 'dscr-status-yellow'; dscrActiveRowIndex = 1; dscrDetails = 'Common approval range. Slightly higher rates.'
  } else if (roundedDscr >= 1.05) {
    dscrEmoji = '\u{1F7E0}'; dscrStatusText = 'Edge Case'; dscrColorClass = 'dscr-status-orange'; dscrActiveRowIndex = 2; dscrDetails = 'Expect lower LTV, higher rate, more reserves.'
  } else if (roundedDscr >= 1.00) {
    dscrEmoji = '\u{1F534}'; dscrStatusText = 'Stretch'; dscrColorClass = 'dscr-status-red'; dscrActiveRowIndex = 3; dscrDetails = 'Case-by-case. Needs strong borrower profile.'
  } else {
    dscrEmoji = '\u274C'; dscrStatusText = 'No DSCR'; dscrColorClass = 'dscr-status-darkred'; dscrActiveRowIndex = 4; dscrDetails = 'Not financeable as DSCR. Consider bridge/hard money.'
  }

  // DSCR price ranges for tooltip
  const dscrPriceRanges = computeDscrPriceRanges(noi, interestRate, loanTerm, mode, parseFloat(inputs.dscrLtv) || 0, parseFloat(inputs.downPercent) || 0)

  return {
    // Revenue
    grossMonthlyRent, effectiveMonthlyRent, annualGrossRent, annualEffectiveRent,
    // Expenses
    expenseYearly, totalExpenses,
    // Core metrics
    noi, loanAmount, monthlyPayment, annualDebtService,
    cashFlow, monthlyCashFlow, dscrRatio: roundedDscr, capRate,
    // JV-adjusted
    jvSplit, displayMonthlyCF, displayAnnualCF, cashOnCash, fullCashOnCash,
    // Basis
    cashBasis, totalOutOfPocket, basisForGain,
    // Milestones
    equity5, balance5, flow5, netGain5,
    equity10, balance10, flow10, netGain10,
    // Chart
    chartAssets, chartLoans,
    // DSCR indicator
    dscrEmoji, dscrStatusText, dscrColorClass, dscrActiveRowIndex, dscrDetails,
    dscrPriceRanges,
    // Mode-specific
    // Traditional
    downAmount, feesAmount, rehabAmount,
    // DSCR
    dscrPurchase, dscrFees, dscrRehab, dscrCarry,
    dscrLoanAmount: mode === 'dscr' ? loanAmount : undefined,
    dscrLtvDisplay, dscrArvDisplay, dscrCashLeft,
    dscrHighlightLabel, dscrHighlightLabelClass,
    // For stress test
    interestRate, loanTerm, vacancyRate,
  }
}

function computeDscrPriceRanges(noi, interestRate, loanTerm, mode, ltvPct, downPct) {
  const divisor = mode === 'dscr' ? (ltvPct / 100) : (1 - downPct / 100)
  if (noi <= 0 || interestRate === 0 || divisor <= 0) return null

  const thresholds = [1.25, 1.15, 1.05, 1.00]
  const prices = thresholds.map(d => {
    const maxAds = noi / d
    const maxPayment = maxAds / 12
    const maxLoan = calculateMaxLoan(maxPayment, interestRate, loanTerm)
    return maxLoan / divisor
  })
  return prices
}

// Stress test
export function runStressTest(inputs, expenseConfig, mode, carryTranches) {
  const purchasePrice = parseFloat(inputs.purchasePrice) || 0
  const exitArv = parseFloat(inputs.exitArv) || 0
  const interestRate = parseFloat(inputs.interestRate) || 0
  const loanTerm = parseFloat(inputs.loanTerm) || 30
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0

  const grossMonthlyRent = getGrossMonthlyRent(inputs)
  const annualGrossRent = grossMonthlyRent * 12

  let loanAmount, cashBasis
  if (mode === 'dscr') {
    const dscrLtv = parseFloat(inputs.dscrLtv) || 0
    const closingCost = parseFloat(inputs.closingCostDscr) || 0
    const rehabCost = parseFloat(inputs.rehabCostDscr) || 0
    const carryMonths = parseFloat(inputs.carryMonths) || 0
    const carryRate = parseFloat(inputs.carryRate) || 0
    const carryAmount = getCarryCost(purchasePrice, closingCost, rehabCost, carryMonths, carryRate, carryTranches)
    loanAmount = exitArv * (dscrLtv / 100)
    const totalCashIn = purchasePrice + closingCost + rehabCost + carryAmount
    cashBasis = Math.max(totalCashIn - loanAmount, 1)
  } else {
    const downPct = parseFloat(inputs.downPercent) || 0
    const closingCost = parseFloat(inputs.closingCost) || 0
    const rehabCost = parseFloat(inputs.rehabCost) || 0
    const downPayment = purchasePrice * (downPct / 100)
    loanAmount = purchasePrice - downPayment
    cashBasis = downPayment + closingCost + rehabCost
  }

  const jvSplit = mode === 'dscr' ? (parseFloat(inputs.jvSplitMain) || 100) : 100

  const baseInsurance = parseFloat(inputs.insurance) || 0
  const insuranceConfig = expenseConfig.insurance
  const baseInsuranceYearly = insuranceConfig.mode === 'pct'
    ? annualGrossRent * (baseInsurance / 100)
    : (insuranceConfig.freq === 'mo' ? baseInsurance * 12 : baseInsurance)

  function calcTotalExpenses(grossRent, insuranceMultiplier = 1.0) {
    let total = 0
    const fields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
    fields.forEach(field => {
      const val = parseFloat(inputs[field]) || 0
      const config = expenseConfig[field]
      let expense
      if (config.mode === 'pct') {
        expense = grossRent * (val / 100)
      } else {
        expense = config.freq === 'mo' ? val * 12 : val
      }
      if (field === 'insurance') expense *= insuranceMultiplier
      total += expense
    })
    return total
  }

  function calcScenario(rentMultiplier, vacancyOverride, rateOverride, insuranceMultiplier = 1.0) {
    const adjGrossRent = annualGrossRent * rentMultiplier
    const adjVacancy = vacancyOverride !== null ? vacancyOverride : vacancyRate
    const adjRate = rateOverride !== null ? rateOverride : interestRate

    const effectiveRent = adjGrossRent * (1 - adjVacancy / 100)
    const expenses = calcTotalExpenses(adjGrossRent, insuranceMultiplier)
    const noi = effectiveRent - expenses

    const mp = calculateMortgage(loanAmount, adjRate, loanTerm)
    const annualDebt = mp * 12

    const dscr = annualDebt > 0 ? noi / annualDebt : 0
    const cf = noi - annualDebt
    const monthlyCF = (cf / 12) * (jvSplit / 100)
    const coc = cashBasis > 0 ? ((cf * (jvSplit / 100)) / cashBasis) * 100 : 0

    return { dscr, monthlyCF, coc }
  }

  const scenarios = [
    { name: '\u{1F4CD} Base Case', rent: 1.0, vacancy: null, rate: null, insurance: 1.0, isBase: true },
    { name: '\u{1F4C9} Rent -10%', rent: 0.9, vacancy: null, rate: null, insurance: 1.0 },
    { name: '\u{1F4C9} Rent -20%', rent: 0.8, vacancy: null, rate: null, insurance: 1.0 },
    { name: '\u{1F3DA}\uFE0F Vacancy 15%', rent: 1.0, vacancy: 15, rate: null, insurance: 1.0 },
    { name: '\u{1F3DA}\uFE0F Vacancy 25%', rent: 1.0, vacancy: 25, rate: null, insurance: 1.0 },
    { name: '\u{1F4C8} Interest +1% (' + (interestRate + 1).toFixed(1) + '%)', rent: 1.0, vacancy: null, rate: interestRate + 1, insurance: 1.0 },
    { name: '\u{1F6E1}\uFE0F Insurance 1.5x ($' + Math.round(baseInsuranceYearly * 1.5).toLocaleString() + '/yr)', rent: 1.0, vacancy: null, rate: null, insurance: 1.5 },
    { name: '\u{1F6E1}\uFE0F Insurance 2x ($' + Math.round(baseInsuranceYearly * 2).toLocaleString() + '/yr)', rent: 1.0, vacancy: null, rate: null, insurance: 2.0 },
    { name: '\u{1F480} Worst: Rent -15%, Vac 20%, Ins 2x', rent: 0.85, vacancy: 20, rate: null, insurance: 2.0 },
  ]

  return scenarios.map(s => {
    const result = calcScenario(s.rent, s.vacancy, s.rate, s.insurance || 1.0)
    let status, statusClass
    if (result.dscr >= 1.25) {
      status = '\u2713 Strong'; statusClass = 'status-pass'
    } else if (result.dscr >= 1.0) {
      status = '\u26A0 Tight'; statusClass = 'status-warn'
    } else {
      status = '\u2717 Fail'; statusClass = 'status-fail'
    }
    return { ...s, ...result, status, statusClass }
  })
}

// Offer / Morby Method calculation
export function calculateOffer(inputs, expenseConfig) {
  const purchasePrice = num(inputs.purchasePrice)
  const downPct = num(inputs.morbyDownPct, 25)
  const dscrRate = num(inputs.morbyDscrRate, 8)
  const dscrTerm = num(inputs.morbyDscrTerm, 30)
  const sellerRate = num(inputs.morbySellerRate, 5)
  const sellerAmort = num(inputs.morbySellerAmort, 30)
  const balloonYears = num(inputs.morbyBalloonYears, 7)
  const refiLtv = num(inputs.morbyRefiLtv, 75)

  const morbyApprecInput = inputs.morbyAppreciation
  const appreciationRate = (morbyApprecInput !== '' && morbyApprecInput !== undefined && morbyApprecInput !== null
    ? parseFloat(morbyApprecInput) : (parseFloat(inputs.appreciationRate) || 0)) / 100

  const rentGrowthRate = (parseFloat(inputs.rentGrowth) || 0) / 100
  const costIncreaseRate = (parseFloat(inputs.costIncrease) || 0) / 100

  const grossMonthlyRent = getGrossMonthlyRent(inputs)
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0
  const effectiveMonthlyRent = grossMonthlyRent * (1 - vacancyRate / 100)

  const annualGrossRent = grossMonthlyRent * 12
  const expenseFields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
  let totalExpenses = 0
  expenseFields.forEach(field => {
    const val = parseFloat(inputs[field]) || 0
    totalExpenses += calcExpenseYearly(field, val, expenseConfig[field], annualGrossRent)
  })

  const dscrLoanAmount = purchasePrice * (downPct / 100)
  const sellerCarryAmount = purchasePrice * (1 - downPct / 100)

  const dscrMonthly = calculateMortgage(dscrLoanAmount, dscrRate, dscrTerm)
  const sellerMonthly = calculateMortgage(sellerCarryAmount, sellerRate, sellerAmort)
  const totalMonthlyDebt = dscrMonthly + sellerMonthly

  const annualEffectiveRent = effectiveMonthlyRent * 12
  const noi = annualEffectiveRent - totalExpenses
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0

  const monthlyExpenses = totalExpenses / 12
  const monthlyCF = effectiveMonthlyRent - monthlyExpenses - totalMonthlyDebt

  // Balloon analysis
  const balloonMonths = balloonYears * 12
  const projectedValue = purchasePrice * Math.pow(1 + appreciationRate, balloonYears)
  const sellerBalanceAtBalloon = getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, balloonMonths)
  const dscrBalanceAtBalloon = getLoanBalance(dscrLoanAmount, dscrRate, dscrTerm, balloonMonths)
  const totalPayoff = sellerBalanceAtBalloon + dscrBalanceAtBalloon
  const maxRefi = projectedValue * (refiLtv / 100)
  const surplus = maxRefi - totalPayoff

  // Amortization table
  const numRows = Math.max(balloonYears + 3, 10)
  const amortRows = []
  let cumulativeCF = 0
  let yearlyRent = effectiveMonthlyRent * 12
  let yearlyExp = totalExpenses

  for (let y = 1; y <= numRows; y++) {
    if (y > 1) {
      yearlyRent *= (1 + rentGrowthRate)
      yearlyExp *= (1 + costIncreaseRate)
    }
    const propValue = purchasePrice * Math.pow(1 + appreciationRate, y)
    const dscrBal = getLoanBalance(dscrLoanAmount, dscrRate, dscrTerm, y * 12)
    const sellerBal = y * 12 <= sellerAmort * 12 ? getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, y * 12) : 0
    const totalDebt = dscrBal + sellerBal
    const equity = propValue - totalDebt
    const annualDebt = totalMonthlyDebt * 12
    const annualCF = yearlyRent - yearlyExp - annualDebt
    cumulativeCF += annualCF

    amortRows.push({
      year: y,
      isBalloon: y === balloonYears,
      propValue, dscrBal: Math.max(dscrBal, 0), sellerBal: Math.max(sellerBal, 0),
      totalDebt: Math.max(totalDebt, 0), equity, annualCF, cumulativeCF
    })
  }

  const chartMilestones = computeOfferChartAndMilestones(
    purchasePrice, appreciationRate, annualEffectiveRent, totalExpenses,
    totalMonthlyDebt * 12, rentGrowthRate, costIncreaseRate, 0,
    (months) => {
      const d = getLoanBalance(dscrLoanAmount, dscrRate, dscrTerm, months)
      const s = months <= sellerAmort * 12 ? getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, months) : 0
      return Math.max(d, 0) + Math.max(s, 0)
    }
  )

  return {
    dscrLoanAmount, sellerCarryAmount,
    dscrMonthly, sellerMonthly, totalMonthlyDebt,
    monthlyCF, noi, capRate,
    // Balloon
    balloonYears, projectedValue, sellerBalanceAtBalloon, dscrBalanceAtBalloon,
    totalPayoff, maxRefi, surplus,
    // Amortization
    amortRows,
    // Chart & Milestones
    ...chartMilestones
  }
}

// Seller Finance calculation — seller finances 100% of purchase price
export function calculateSellerFinance(inputs, expenseConfig) {
  const purchasePrice = num(inputs.purchasePrice)
  const sellerRate = num(inputs.sfSellerRate, 5)
  const sellerAmort = num(inputs.sfSellerAmort, 30)
  const balloonYears = num(inputs.sfBalloonYears, 7)
  const refiLtv = num(inputs.sfRefiLtv, 75)

  const sfApprecInput = inputs.sfAppreciation
  const appreciationRate = (sfApprecInput !== '' && sfApprecInput !== undefined && sfApprecInput !== null
    ? parseFloat(sfApprecInput) : (parseFloat(inputs.appreciationRate) || 0)) / 100

  const rentGrowthRate = (parseFloat(inputs.rentGrowth) || 0) / 100
  const costIncreaseRate = (parseFloat(inputs.costIncrease) || 0) / 100

  const grossMonthlyRent = getGrossMonthlyRent(inputs)
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0
  const effectiveMonthlyRent = grossMonthlyRent * (1 - vacancyRate / 100)

  const annualGrossRent = grossMonthlyRent * 12
  const expenseFields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
  let totalExpenses = 0
  expenseFields.forEach(field => {
    const val = parseFloat(inputs[field]) || 0
    totalExpenses += calcExpenseYearly(field, val, expenseConfig[field], annualGrossRent)
  })

  const annualEffectiveRent = effectiveMonthlyRent * 12
  const noi = annualEffectiveRent - totalExpenses
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0

  const sellerLoanAmount = purchasePrice
  const sellerMonthly = calculateMortgage(sellerLoanAmount, sellerRate, sellerAmort)
  const totalMonthlyDebt = sellerMonthly

  const monthlyExpenses = totalExpenses / 12
  const monthlyCF = effectiveMonthlyRent - monthlyExpenses - totalMonthlyDebt

  // Balloon analysis
  const balloonMonths = balloonYears * 12
  const projectedValue = purchasePrice * Math.pow(1 + appreciationRate, balloonYears)
  const sellerBalanceAtBalloon = getLoanBalance(sellerLoanAmount, sellerRate, sellerAmort, balloonMonths)
  const totalPayoff = sellerBalanceAtBalloon
  const maxRefi = projectedValue * (refiLtv / 100)
  const surplus = maxRefi - totalPayoff

  // Amortization table
  const numRows = Math.max(balloonYears + 3, 10)
  const amortRows = []
  let cumulativeCF = 0
  let yearlyRent = effectiveMonthlyRent * 12
  let yearlyExp = totalExpenses

  for (let y = 1; y <= numRows; y++) {
    if (y > 1) {
      yearlyRent *= (1 + rentGrowthRate)
      yearlyExp *= (1 + costIncreaseRate)
    }
    const propValue = purchasePrice * Math.pow(1 + appreciationRate, y)
    const sellerBal = y * 12 <= sellerAmort * 12 ? getLoanBalance(sellerLoanAmount, sellerRate, sellerAmort, y * 12) : 0
    const totalDebt = sellerBal
    const equity = propValue - totalDebt
    const annualDebt = totalMonthlyDebt * 12
    const annualCF = yearlyRent - yearlyExp - annualDebt
    cumulativeCF += annualCF

    amortRows.push({
      year: y,
      isBalloon: y === balloonYears,
      propValue, sellerBal: Math.max(sellerBal, 0),
      totalDebt: Math.max(totalDebt, 0), equity, annualCF, cumulativeCF
    })
  }

  const chartMilestones = computeOfferChartAndMilestones(
    purchasePrice, appreciationRate, annualEffectiveRent, totalExpenses,
    totalMonthlyDebt * 12, rentGrowthRate, costIncreaseRate, 0,
    (months) => months <= sellerAmort * 12 ? Math.max(getLoanBalance(sellerLoanAmount, sellerRate, sellerAmort, months), 0) : 0
  )

  return {
    strategy: SELLER_FINANCE,
    sellerLoanAmount, sellerMonthly, totalMonthlyDebt,
    monthlyCF, noi, capRate,
    balloonYears, projectedValue, sellerBalanceAtBalloon,
    totalPayoff, maxRefi, surplus,
    amortRows,
    ...chartMilestones
  }
}

// Subject-To calculation — take over existing mortgage + optional seller carry for equity gap
export function calculateSubjectTo(inputs, expenseConfig) {
  const purchasePrice = num(inputs.purchasePrice)
  const existingBalance = num(inputs.subToLoanBalance)
  const existingRate = num(inputs.subToRate)
  const existingRemTerm = num(inputs.subToRemTerm, 25)
  const downPayment = num(inputs.subToDownPayment)
  const sellerRate = num(inputs.subToSellerRate, 5)
  const sellerAmort = num(inputs.subToSellerAmort, 30)
  const balloonYears = num(inputs.subToBalloonYears, 7)
  const refiLtv = num(inputs.subToRefiLtv, 75)

  const subToApprecInput = inputs.subToAppreciation
  const appreciationRate = (subToApprecInput !== '' && subToApprecInput !== undefined && subToApprecInput !== null
    ? parseFloat(subToApprecInput) : (parseFloat(inputs.appreciationRate) || 0)) / 100

  const rentGrowthRate = (parseFloat(inputs.rentGrowth) || 0) / 100
  const costIncreaseRate = (parseFloat(inputs.costIncrease) || 0) / 100

  const grossMonthlyRent = getGrossMonthlyRent(inputs)
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0
  const effectiveMonthlyRent = grossMonthlyRent * (1 - vacancyRate / 100)

  const escrowIncluded = inputs.subToEscrow === 'yes'
  const annualGrossRent = grossMonthlyRent * 12
  const escrowSkip = escrowIncluded ? new Set(['propTaxes', 'insurance']) : new Set()
  const expenseFields = ['propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns']
  let totalExpenses = 0
  expenseFields.forEach(field => {
    if (escrowSkip.has(field)) return
    const val = parseFloat(inputs[field]) || 0
    totalExpenses += calcExpenseYearly(field, val, expenseConfig[field], annualGrossRent)
  })

  const annualEffectiveRent = effectiveMonthlyRent * 12
  const noi = annualEffectiveRent - totalExpenses
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0

  // Existing mortgage payment
  const existingMonthly = calculateMortgage(existingBalance, existingRate, existingRemTerm)

  // Equity gap = purchase price - existing balance - down payment → seller carry
  const equityGap = Math.max(purchasePrice - existingBalance - downPayment, 0)
  const sellerCarryAmount = equityGap
  const sellerMonthly = sellerCarryAmount > 0 ? calculateMortgage(sellerCarryAmount, sellerRate, sellerAmort) : 0
  const totalMonthlyDebt = existingMonthly + sellerMonthly

  const monthlyExpenses = totalExpenses / 12
  const monthlyCF = effectiveMonthlyRent - monthlyExpenses - totalMonthlyDebt

  // Balloon analysis
  const balloonMonths = balloonYears * 12
  const projectedValue = purchasePrice * Math.pow(1 + appreciationRate, balloonYears)
  const existingBalanceAtBalloon = getLoanBalance(existingBalance, existingRate, existingRemTerm, balloonMonths)
  const sellerBalanceAtBalloon = sellerCarryAmount > 0
    ? getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, balloonMonths)
    : 0
  const totalPayoff = existingBalanceAtBalloon + sellerBalanceAtBalloon
  const maxRefi = projectedValue * (refiLtv / 100)
  const surplus = maxRefi - totalPayoff

  // Amortization table
  const numRows = Math.max(balloonYears + 3, 10)
  const amortRows = []
  let cumulativeCF = 0
  let yearlyRent = effectiveMonthlyRent * 12
  let yearlyExp = totalExpenses

  for (let y = 1; y <= numRows; y++) {
    if (y > 1) {
      yearlyRent *= (1 + rentGrowthRate)
      yearlyExp *= (1 + costIncreaseRate)
    }
    const propValue = purchasePrice * Math.pow(1 + appreciationRate, y)
    const existBal = getLoanBalance(existingBalance, existingRate, existingRemTerm, y * 12)
    const sellerBal = sellerCarryAmount > 0 && y * 12 <= sellerAmort * 12
      ? getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, y * 12) : 0
    const totalDebt = existBal + sellerBal
    const equity = propValue - totalDebt
    const annualDebt = totalMonthlyDebt * 12
    const annualCF = yearlyRent - yearlyExp - annualDebt
    cumulativeCF += annualCF

    amortRows.push({
      year: y,
      isBalloon: y === balloonYears,
      propValue, existingBal: Math.max(existBal, 0), sellerBal: Math.max(sellerBal, 0),
      totalDebt: Math.max(totalDebt, 0), equity, annualCF, cumulativeCF
    })
  }

  const chartMilestones = computeOfferChartAndMilestones(
    purchasePrice, appreciationRate, annualEffectiveRent, totalExpenses,
    totalMonthlyDebt * 12, rentGrowthRate, costIncreaseRate, downPayment,
    (months) => {
      const e = getLoanBalance(existingBalance, existingRate, existingRemTerm, months)
      const s = sellerCarryAmount > 0 && months <= sellerAmort * 12
        ? getLoanBalance(sellerCarryAmount, sellerRate, sellerAmort, months) : 0
      return Math.max(e, 0) + Math.max(s, 0)
    }
  )

  return {
    strategy: SUBJECT_TO,
    existingBalance, existingMonthly, downPayment, sellerCarryAmount, sellerMonthly, totalMonthlyDebt,
    monthlyCF, noi, capRate,
    balloonYears, projectedValue, existingBalanceAtBalloon, sellerBalanceAtBalloon,
    totalPayoff, maxRefi, surplus,
    amortRows,
    ...chartMilestones
  }
}

// JV simulation
export function runJvSimulation(cashIn, preRefiCF, postRefiCF, refiMonth, paybackMonths, splitYou, monthsToProject) {
  const results = {
    months: [], dealCF: [], cashToYou: [], cashToOperator: [],
    remainingCapital: [], cumCashToYou: [], cumCashToOperator: []
  }

  let remainingCapital = cashIn
  let cumCashToYou = 0
  let cumCashToOperator = 0
  let fullPaybackMonth = null

  for (let month = 1; month <= monthsToProject; month++) {
    const dealCF = (month <= refiMonth) ? preRefiCF : postRefiCF
    let cashToYou = 0
    let cashToOperator = 0

    if (month <= paybackMonths) {
      cashToYou = dealCF
      cashToOperator = 0
    } else {
      cashToYou = dealCF * (splitYou / 100)
      cashToOperator = dealCF * (1 - splitYou / 100)
    }

    remainingCapital -= cashToYou
    if (remainingCapital <= 0 && fullPaybackMonth === null) {
      fullPaybackMonth = month
    }

    cumCashToYou += cashToYou
    cumCashToOperator += cashToOperator

    results.months.push(month)
    results.dealCF.push(dealCF)
    results.cashToYou.push(cashToYou)
    results.cashToOperator.push(cashToOperator)
    results.remainingCapital.push(Math.max(remainingCapital, 0))
    results.cumCashToYou.push(cumCashToYou)
    results.cumCashToOperator.push(cumCashToOperator)
  }

  results.fullPaybackMonth = fullPaybackMonth
  return results
}

// Carry schedule computation
export function computeCarrySchedule(purchasePrice, closingCost, rehabCost, carryMonths, defaultRate, carryTranches) {
  const totalCashNeeded = purchasePrice + closingCost + rehabCost

  let remaining = totalCashNeeded
  const trancheAllocations = (carryTranches || []).map(t => {
    const allocated = Math.min(t.amount, remaining)
    remaining -= allocated
    return { ...t, allocated }
  })

  const defaultAllocation = remaining

  const schedule = []
  let totalInterest = 0

  for (let month = 1; month <= carryMonths; month++) {
    const row = { month }
    let monthTotal = 0

    trancheAllocations.forEach((t, i) => {
      const monthlyInterest = t.allocated * (t.rate / 100) / 12
      row[`tranche${i}`] = monthlyInterest
      monthTotal += monthlyInterest
    })

    const defaultInterest = defaultAllocation * (defaultRate / 100) / 12
    row.default = defaultInterest
    monthTotal += defaultInterest

    row.total = monthTotal
    totalInterest += monthTotal
    schedule.push(row)
  }

  let totalPoints = 0
  trancheAllocations.forEach(t => {
    totalPoints += t.allocated * ((t.points || 0) / 100)
  })

  const totalCarryCost = totalInterest + totalPoints
  const blendedRate = totalCashNeeded > 0 ? (totalInterest / carryMonths * 12 / totalCashNeeded * 100) : 0

  return {
    trancheAllocations, defaultAllocation,
    schedule, totalInterest, totalPoints, totalCarryCost,
    blendedRate, totalCashNeeded
  }
}
