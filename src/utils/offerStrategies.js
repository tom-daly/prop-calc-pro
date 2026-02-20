// Offer strategy keys — single source of truth
export const MORBY = 'morby'
export const SELLER_FINANCE = 'sellerFinance'
export const SUBJECT_TO = 'subjectTo'

// Display labels per strategy
export const STRATEGY_LABELS = {
  [MORBY]: 'Morby Method',
  [SELLER_FINANCE]: 'Seller Finance',
  [SUBJECT_TO]: 'Subject-To',
}

// Short badge labels (for card badges / tight spaces)
export const STRATEGY_BADGES = {
  [MORBY]: 'MORBY METHOD',
  [SELLER_FINANCE]: 'SELLER FINANCE',
  [SUBJECT_TO]: 'SUBJECT-TO',
}

// Pill button labels (for the toggle in AcquisitionCard)
export const STRATEGY_PILL_LABELS = {
  [MORBY]: 'Morby',
  [SELLER_FINANCE]: 'Seller Fin',
  [SUBJECT_TO]: 'Sub-To',
}

// Ordered list for iteration (pill rendering, etc.)
export const STRATEGIES = [MORBY, SELLER_FINANCE, SUBJECT_TO]
