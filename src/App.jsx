import React, { useEffect } from 'react'
import './styles/variables.css'
import './styles/required.css'
import styles from './App.module.css'
import usePropertyStore from './store/usePropertyStore'
import { OFFER } from './utils/modes'
import { SUBJECT_TO } from './utils/offerStrategies'
import Header from './components/Header'
import PrintHeader from './components/PrintHeader'
import ModeTabs from './components/ModeTabs'
import AcquisitionCard from './components/AcquisitionCard'
import RevenueCard from './components/RevenueCard'
import ExpensesCard from './components/ExpensesCard'
import GrowthCard from './components/GrowthCard'
import MetricsBar from './components/MetricsBar'
import MilestonesCard from './components/MilestonesCard'
import AssetDebtChart from './components/AssetDebtChart'
import StressTestCard from './components/StressTestCard'
import MaoCard from './components/MaoCard'
import BalloonAnalysis from './components/BalloonAnalysis'
import OfferMetricsBar from './components/OfferMetricsBar'
import OfferAmortTable from './components/OfferAmortTable'
import VaultModal from './components/VaultModal'
import CarryModal from './components/CarryModal'
import JvModal from './components/JvModal'
import SettingsModal from './components/SettingsModal'
import AiChatModal from './components/AiChatModal'
import PdfModal from './components/PdfModal'
import Toast from './components/Toast'
import Footer from './components/Footer'

export default function App() {
  const mode = usePropertyStore(s => s.currentMode)
  const offerStrategy = usePropertyStore(s => s.offerStrategy)
  const initApp = usePropertyStore(s => s.initApp)

  useEffect(() => {
    initApp()
  }, [])

  return (
    <>
      <Header />
      <PrintHeader />
      {/* Print-only: metrics at top as overview (hidden on screen) */}
      <div data-print="top-metrics" style={{ display: 'none' }}>
        {mode !== OFFER ? <MetricsBar /> : <OfferMetricsBar />}
      </div>
      <main className={styles.main} data-print-layout="main">
        <div className={styles.leftCol}>
          <div data-print="hide"><ModeTabs /></div>
          <AcquisitionCard />
          <MaoCard />
          <RevenueCard />
          <ExpensesCard />
        </div>
        <div className={styles.rightCol}>
          <GrowthCard />
          {/* Screen-only: metrics in normal position (hidden in print) */}
          <div data-print="hide">
            {mode !== OFFER ? <MetricsBar /> : <OfferMetricsBar />}
          </div>
          <MilestonesCard />
          <AssetDebtChart />
          {mode === OFFER && offerStrategy !== SUBJECT_TO && (
            <>
              <BalloonAnalysis />
              <OfferAmortTable />
            </>
          )}
          {mode !== OFFER && <StressTestCard />}
        </div>
      </main>
      <Footer />
      <VaultModal />
      <CarryModal />
      <JvModal />
      <SettingsModal />
      <AiChatModal />
      <PdfModal />
      <Toast />
    </>
  )
}
