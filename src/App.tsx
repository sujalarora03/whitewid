import { useState } from 'react'
import { Shell } from './components/Shell'
import { Dashboard } from './components/Dashboard'
import { CraftCalc } from './components/CraftCalc'
import { Sales } from './components/Sales'
import { Stash } from './components/Stash'
import { Employees } from './components/Employees'
import { Inventory } from './components/Inventory'
import { Prices } from './components/Prices'
import { useStore } from './hooks/useStore'
import type { TabId } from './types'
import './index.css'

function syncUi(status: ReturnType<typeof useStore>['syncStatus'], error: string | null) {
  switch (status) {
    case 'booting':
    case 'loading':
      return { label: 'Loading cloud…', tone: 'muted' as const }
    case 'saving':
      return { label: 'Saving…', tone: 'warn' as const }
    case 'synced':
      return { label: 'Cloud synced', tone: 'ok' as const }
    case 'offline':
      return { label: 'Offline (local only)', tone: 'warn' as const }
    case 'error':
      return { label: error ? `Sync error` : 'Sync error', tone: 'err' as const }
    default:
      return { label: 'Local', tone: 'muted' as const }
  }
}

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<TabId>('dashboard')
  const pendingStash = store.state.stashBuys.filter(
    (b) => b.status === 'pending',
  ).length
  const sync = syncUi(store.syncStatus, store.syncError)

  return (
    <Shell
      brand={store.state.settings.businessName}
      ownerName={store.state.settings.ownerName}
      tab={tab}
      onTab={setTab}
      pendingStash={pendingStash}
      syncLabel={sync.label}
      syncTone={sync.tone}
      onRefresh={() => void store.refreshFromCloud()}
    >
      {tab === 'dashboard' && <Dashboard store={store} />}
      {tab === 'craft' && <CraftCalc store={store} />}
      {tab === 'sales' && <Sales store={store} />}
      {tab === 'stash' && <Stash store={store} />}
      {tab === 'employees' && <Employees store={store} />}
      {tab === 'inventory' && <Inventory store={store} />}
      {tab === 'prices' && <Prices store={store} />}
    </Shell>
  )
}
