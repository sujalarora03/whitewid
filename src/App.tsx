import { useState } from 'react'
import { Shell } from './components/Shell'
import { Dashboard } from './components/Dashboard'
import { CraftCalc } from './components/CraftCalc'
import { Sales } from './components/Sales'
import { Employees } from './components/Employees'
import { Inventory } from './components/Inventory'
import { Prices } from './components/Prices'
import { useStore } from './hooks/useStore'
import type { TabId } from './types'
import './index.css'

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<TabId>('dashboard')

  return (
    <Shell
      brand={store.state.settings.businessName}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'dashboard' && <Dashboard store={store} />}
      {tab === 'craft' && <CraftCalc store={store} />}
      {tab === 'sales' && <Sales store={store} />}
      {tab === 'employees' && <Employees store={store} />}
      {tab === 'inventory' && <Inventory store={store} />}
      {tab === 'prices' && <Prices store={store} />}
    </Shell>
  )
}
