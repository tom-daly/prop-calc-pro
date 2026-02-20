import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { calculateAll, runStressTest, calculateOffer, calculateSellerFinance, calculateSubjectTo } from '../utils/calculations'
import { MORBY, SELLER_FINANCE, SUBJECT_TO } from '../utils/offerStrategies'
import {
  generateId, getAllProperties, saveToStorage, loadFromStorage,
  deleteFromStorage, saveWorkingState, restoreWorkingState, clearWorkingState
} from '../utils/persistence'

export const MAX_UNITS = 10

const DEFAULT_INPUTS = {
  propertyName: 'New Property Analysis',
  propertyAddress: '',
  purchasePrice: '', exitArv: '',
  units: [{ rent: '', misc: '', beds: '', bath: '' }],
  vacancyRate: '',
  propTaxes: '', insurance: '', maintenance: '', utilities: '', propMgmt: '', capex: '', mortgageIns: '',
  utilElectric: '0', utilGas: '0', utilWater: '0', utilTrash: '0', utilLawn: '0', utilOther: '0',
  appreciationRate: '', rentGrowth: '', costIncrease: '',
  downPercent: '', closingCost: '', rehabCost: '', interestRate: '', loanTerm: '30',
  closingCostDscr: '', rehabCostDscr: '', dscrLtv: '', carryMonths: '', carryRate: '', carryRentPercent: '0', jvSplitMain: '100',
  morbyDownPct: '25', morbyDscrRate: '8', morbyDscrTerm: '30',
  morbySellerRate: '5', morbySellerAmort: '30', morbyBalloonYears: '7',
  morbyRefiLtv: '75', morbyAppreciation: '',
  // Seller Finance inputs
  sfSellerRate: '5', sfSellerAmort: '30', sfBalloonYears: '7', sfRefiLtv: '75', sfAppreciation: '',
  // Subject-To inputs
  subToLoanBalance: '', subToRate: '', subToRemTerm: '25', subToEscrow: 'yes', subToDownPayment: '',
  subToSellerRate: '5', subToSellerAmort: '30', subToBalloonYears: '7', subToRefiLtv: '75', subToAppreciation: '',
}

const DEFAULT_EXPENSE_CONFIG = {
  propTaxes: { mode: 'dollar', freq: 'yr' },
  insurance: { mode: 'dollar', freq: 'yr' },
  maintenance: { mode: 'pct', freq: 'yr' },
  utilities: { mode: 'dollar', freq: 'mo' },
  propMgmt: { mode: 'pct', freq: 'yr' },
  capex: { mode: 'pct', freq: 'yr' },
  mortgageIns: { mode: 'dollar', freq: 'mo' },
}

const DEFAULT_JV_CONFIG = {
  splitYou: 50,
  paybackMonths: 6,
  refiMonth: 4,
  monthsToProject: 60,
}

const usePropertyStore = create(subscribeWithSelector((set, get) => ({
  currentPropertyId: null,
  currentMode: 'traditional',
  offerStrategy: MORBY,
  inputs: { ...DEFAULT_INPUTS },
  expenseConfig: JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CONFIG)),
  carryTranches: [],
  jvConfig: { ...DEFAULT_JV_CONFIG },

  // Computed results
  results: null,
  offerResults: null,
  stressResults: [],

  // Toast
  toastMessage: '',
  toastVisible: false,

  // Actions
  setMode: (mode) => {
    set({ currentMode: mode })
    get().recalculate()
  },

  setOfferStrategy: (strategy) => {
    set({ offerStrategy: strategy })
    get().recalculate()
    get()._debouncedAutoSave()
  },

  setInput: (key, value) => {
    set(state => ({ inputs: { ...state.inputs, [key]: value } }))
    get().recalculate()
    get()._debouncedAutoSave()
  },

  setInputBatch: (updates) => {
    set(state => ({ inputs: { ...state.inputs, ...updates } }))
    get().recalculate()
    get()._debouncedAutoSave()
  },

  setUnitInput: (index, field, value) => {
    set(state => {
      const units = state.inputs.units.map((u, i) =>
        i === index ? { ...u, [field]: value } : u
      )
      return { inputs: { ...state.inputs, units } }
    })
    get().recalculate()
    get()._debouncedAutoSave()
  },

  addUnit: () => {
    set(state => {
      if (state.inputs.units.length >= MAX_UNITS) return state
      const units = [...state.inputs.units, { rent: '', misc: '', beds: '', bath: '' }]
      return { inputs: { ...state.inputs, units } }
    })
    get().recalculate()
    get()._debouncedAutoSave()
  },

  removeUnit: (index) => {
    set(state => {
      if (state.inputs.units.length <= 1) return state
      const units = state.inputs.units.filter((_, i) => i !== index)
      return { inputs: { ...state.inputs, units } }
    })
    get().recalculate()
    get()._debouncedAutoSave()
  },

  setExpenseConfig: (field, updates) => {
    set(state => ({
      expenseConfig: {
        ...state.expenseConfig,
        [field]: { ...state.expenseConfig[field], ...updates }
      }
    }))
    get().recalculate()
    get()._debouncedAutoSave()
  },

  setCarryTranches: (tranches) => {
    set({ carryTranches: tranches })
    get().recalculate()
  },

  setJvConfig: (config) => {
    set({ jvConfig: config })
  },

  recalculate: () => {
    const { inputs, expenseConfig, currentMode, carryTranches, offerStrategy } = get()
    const results = calculateAll(inputs, expenseConfig, currentMode, carryTranches)
    const stressResults = runStressTest(inputs, expenseConfig, currentMode, carryTranches)
    let offerResults = null
    if (currentMode === 'offer') {
      if (offerStrategy === SELLER_FINANCE) {
        offerResults = calculateSellerFinance(inputs, expenseConfig)
      } else if (offerStrategy === SUBJECT_TO) {
        offerResults = calculateSubjectTo(inputs, expenseConfig)
      } else {
        offerResults = calculateOffer(inputs, expenseConfig)
      }
    }
    set({ results, stressResults, offerResults })
  },

  showToast: (message = 'Auto-saved') => {
    set({ toastMessage: message, toastVisible: true })
    setTimeout(() => set({ toastVisible: false }), 2000)
  },

  // Persistence
  _autoSaveTimeout: null,
  _debouncedAutoSave: () => {
    const state = get()
    if (state._autoSaveTimeout) clearTimeout(state._autoSaveTimeout)
    const timeout = setTimeout(() => {
      try {
        const { currentPropertyId, currentMode, offerStrategy, inputs, carryTranches, jvConfig, expenseConfig } = get()
        const workingState = {
          currentPropertyId, currentMode, offerStrategy, inputs,
          carryTranches: [...carryTranches],
          jvConfig: { ...jvConfig },
          expenseConfig: JSON.parse(JSON.stringify(expenseConfig)),
          lastModified: Date.now()
        }
        saveWorkingState(workingState)
        if (currentPropertyId) {
          get()._saveToVault()
        }
        get().showToast()
      } catch (e) {
        console.error('Auto-save error:', e)
      }
    }, 500)
    set({ _autoSaveTimeout: timeout })
  },

  _saveToVault: () => {
    const { currentPropertyId, currentMode, inputs, carryTranches, jvConfig, expenseConfig } = get()
    if (!currentPropertyId) return

    const sharedInputIds = [
      'propertyName', 'propertyAddress', 'purchasePrice', 'exitArv',
      'vacancyRate',
      'propTaxes', 'insurance', 'maintenance', 'utilities', 'propMgmt', 'capex', 'mortgageIns',
      'utilElectric', 'utilGas', 'utilWater', 'utilTrash', 'utilLawn', 'utilOther',
      'appreciationRate', 'rentGrowth', 'costIncrease'
    ]
    const traditionalInputIds = ['downPercent', 'closingCost', 'rehabCost', 'interestRate', 'loanTerm']
    const dscrInputIds = ['closingCostDscr', 'rehabCostDscr', 'dscrLtv', 'carryMonths', 'carryRate', 'carryRentPercent', 'interestRate', 'loanTerm', 'jvSplitMain']
    const offerInputIds = [
      'morbyDownPct', 'morbyDscrRate', 'morbyDscrTerm', 'morbySellerRate', 'morbySellerAmort', 'morbyBalloonYears', 'morbyRefiLtv', 'morbyAppreciation',
      'sfSellerRate', 'sfSellerAmort', 'sfBalloonYears', 'sfRefiLtv', 'sfAppreciation',
      'subToLoanBalance', 'subToRate', 'subToRemTerm', 'subToEscrow', 'subToDownPayment', 'subToSellerRate', 'subToSellerAmort', 'subToBalloonYears', 'subToRefiLtv', 'subToAppreciation',
    ]

    const { offerStrategy } = get()
    const data = {
      name: inputs.propertyName,
      lastModified: Date.now(),
      currentMode,
      offerStrategy,
      inputs: {},
      traditional: {},
      dscr: {},
      offer: {},
      carryTranches: [...carryTranches],
      jvConfig: { ...jvConfig },
      expenseConfig: JSON.parse(JSON.stringify(expenseConfig))
    }

    sharedInputIds.forEach(id => { data.inputs[id] = inputs[id] })
    data.inputs.units = inputs.units.map(u => ({ ...u }))
    traditionalInputIds.forEach(id => { data.traditional[id] = inputs[id] })
    dscrInputIds.forEach(id => { data.dscr[id] = inputs[id] })
    offerInputIds.forEach(id => { data.offer[id] = inputs[id] })

    saveToStorage(currentPropertyId, data)
  },

  saveData: () => {
    let { currentPropertyId } = get()
    if (!currentPropertyId) {
      currentPropertyId = generateId()
      set({ currentPropertyId })
    }
    get()._saveToVault()

    const { currentMode, offerStrategy, inputs, carryTranches, jvConfig, expenseConfig } = get()
    saveWorkingState({
      currentPropertyId, currentMode, offerStrategy, inputs,
      carryTranches: [...carryTranches],
      jvConfig: { ...jvConfig },
      expenseConfig: JSON.parse(JSON.stringify(expenseConfig)),
      lastModified: Date.now()
    })
  },

  loadProperty: (propertyId) => {
    const data = loadFromStorage(propertyId)
    if (!data) return

    const newInputs = { ...DEFAULT_INPUTS, units: [{ rent: '', misc: '', beds: '', bath: '' }] }
    // Restore shared inputs
    Object.entries(data.inputs || {}).forEach(([id, value]) => {
      if (id === 'units') return // handled below
      newInputs[id] = value
    })
    Object.entries(data.traditional || {}).forEach(([id, value]) => { newInputs[id] = value })
    Object.entries(data.dscr || {}).forEach(([id, value]) => { newInputs[id] = value })
    Object.entries(data.offer || {}).forEach(([id, value]) => { newInputs[id] = value })

    // Restore units array, or migrate from old unit1Rent/unit2Rent format
    if (Array.isArray(data.inputs?.units)) {
      newInputs.units = data.inputs.units.map(u => ({ rent: u.rent || '', misc: u.misc || '', beds: u.beds || '', bath: u.bath || '' }))
    } else {
      // Migrate from old format
      const migrated = []
      for (let i = 1; i <= 4; i++) {
        const rent = data.inputs?.[`unit${i}Rent`] || newInputs[`unit${i}Rent`] || ''
        const misc = data.inputs?.[`unit${i}Misc`] || newInputs[`unit${i}Misc`] || ''
        if (rent || misc || i === 1) migrated.push({ rent, misc })
      }
      newInputs.units = migrated.length > 0 ? migrated : [{ rent: '', misc: '', beds: '', bath: '' }]
    }

    const expenseConfig = data.expenseConfig
      ? JSON.parse(JSON.stringify(data.expenseConfig))
      : JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CONFIG))

    const carryTranches = data.carryTranches || []
    const jvConfig = data.jvConfig ? { ...DEFAULT_JV_CONFIG, ...data.jvConfig } : { ...DEFAULT_JV_CONFIG }

    set({
      currentPropertyId: propertyId,
      inputs: newInputs,
      expenseConfig,
      carryTranches,
      jvConfig,
      currentMode: data.currentMode || 'traditional',
      offerStrategy: data.offerStrategy || MORBY,
    })
    get().recalculate()
  },

  newProperty: () => {
    clearWorkingState()
    set({
      currentPropertyId: null,
      currentMode: 'traditional',
      offerStrategy: MORBY,
      inputs: { ...DEFAULT_INPUTS },
      expenseConfig: JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CONFIG)),
      carryTranches: [],
      jvConfig: { ...DEFAULT_JV_CONFIG },
    })
    get().recalculate()
  },

  deleteProperty: () => {
    const { currentPropertyId } = get()
    if (!currentPropertyId) return
    deleteFromStorage(currentPropertyId)
    get().newProperty()
  },

  duplicateProperty: () => {
    const state = get()
    state.saveData()

    const data = loadFromStorage(state.currentPropertyId)
    if (!data) {
      // No saved data, just change name and save as new
      set(s => ({
        currentPropertyId: null,
        inputs: { ...s.inputs, propertyName: s.inputs.propertyName + ' (Copy)' }
      }))
      get().saveData()
      return
    }

    const newId = generateId()
    const duplicateData = {
      ...data,
      name: (data.name || 'Untitled') + ' (Copy)',
      lastModified: Date.now()
    }
    if (duplicateData.inputs && duplicateData.inputs.propertyName) {
      duplicateData.inputs.propertyName = duplicateData.name
    }
    saveToStorage(newId, duplicateData)
    get().loadProperty(newId)
  },

  // Restore from working state (called on init)
  restoreState: () => {
    const saved = restoreWorkingState()
    if (!saved) return false

    try {
      const newInputs = { ...DEFAULT_INPUTS, units: [{ rent: '', misc: '', beds: '', bath: '' }] }
      Object.entries(saved.inputs || {}).forEach(([id, value]) => {
        if (id === 'units') return
        newInputs[id] = value
      })
      // Restore units array, or migrate from old format
      if (Array.isArray(saved.inputs?.units)) {
        newInputs.units = saved.inputs.units.map(u => ({ rent: u.rent || '', misc: u.misc || '', beds: u.beds || '', bath: u.bath || '' }))
      } else {
        const migrated = []
        for (let i = 1; i <= 4; i++) {
          const rent = saved.inputs?.[`unit${i}Rent`] || ''
          const misc = saved.inputs?.[`unit${i}Misc`] || ''
          if (rent || misc || i === 1) migrated.push({ rent, misc })
        }
        newInputs.units = migrated.length > 0 ? migrated : [{ rent: '', misc: '', beds: '', bath: '' }]
      }

      const expenseConfig = saved.expenseConfig
        ? JSON.parse(JSON.stringify(saved.expenseConfig))
        : JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CONFIG))

      set({
        currentPropertyId: saved.currentPropertyId,
        currentMode: saved.currentMode || 'traditional',
        offerStrategy: saved.offerStrategy || MORBY,
        inputs: newInputs,
        expenseConfig,
        carryTranches: saved.carryTranches || [],
        jvConfig: saved.jvConfig ? { ...DEFAULT_JV_CONFIG, ...saved.jvConfig } : { ...DEFAULT_JV_CONFIG },
      })
      get().recalculate()
      return true
    } catch (e) {
      console.error('Error restoring working state:', e)
      return false
    }
  },

  initApp: () => {
    if (get().restoreState()) return
    const properties = getAllProperties()
    if (properties.length > 0) {
      get().loadProperty(properties[0].id)
    } else {
      get().recalculate()
    }
  },
})))

export default usePropertyStore
