import React, { useEffect } from 'react'
import './styles/variables.css'
import styles from './App.module.css'
import usePropertyStore from './store/usePropertyStore'
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
        {mode !== 'offer' ? <MetricsBar /> : <OfferMetricsBar />}
      </div>
      <main className={styles.main} data-print-layout="main">
        <div className={styles.leftCol}>
          <div data-print="hide"><ModeTabs /></div>
          <AcquisitionCard />
          <RevenueCard />
          <ExpensesCard />
        </div>
        <div className={styles.rightCol}>
          <GrowthCard />
          {/* Screen-only: metrics in normal position (hidden in print) */}
          <div data-print="hide">
            {mode !== 'offer' ? <MetricsBar /> : <OfferMetricsBar />}
          </div>
          <MilestonesCard />
          <AssetDebtChart />
          {mode === 'offer' && (
            <>
              <BalloonAnalysis />
              <OfferAmortTable />
            </>
          )}
          {mode !== 'offer' && <StressTestCard />}
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
