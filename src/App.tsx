import { useState } from 'react'
import { Shell } from './components/Shell'
import { Dashboard } from './components/Dashboard'
import { CraftCalc } from './components/CraftCalc'
import { Sales } from './components/Sales'
import { Stash } from './components/Stash'
import { Employees } from './components/Employees'
import { Inventory } from './components/Inventory'
import { Prices } from './components/Prices'
import { EmployeeDesk } from './components/EmployeeDesk'
import { useStore } from './hooks/useStore'
import {
  loadRole,
  loadSelectedEmployeeId,
  saveRole,
  saveSelectedEmployeeId,
  type AppRole,
} from './lib/session'
import type { TabId } from './types'
import './index.css'

function syncUi(
  status: ReturnType<typeof useStore>['syncStatus'],
  error: string | null,
) {
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
      return { label: error ? 'Sync error' : 'Sync error', tone: 'err' as const }
    default:
      return { label: 'Local', tone: 'muted' as const }
  }
}

export default function App() {
  const store = useStore()
  const [role, setRole] = useState<AppRole>(() => loadRole())
  const [employeeId, setEmployeeId] = useState(() => loadSelectedEmployeeId())
  const [tab, setTab] = useState<TabId>(() =>
    loadRole() === 'employee' ? 'desk' : 'dashboard',
  )

  const pendingStash = store.state.stashBuys.filter(
    (b) => b.status === 'pending',
  ).length
  const sync = syncUi(store.syncStatus, store.syncError)
  const employeeName = store.state.employees.find(
    (e) => e.id === employeeId,
  )?.name

  function switchRole(next: AppRole) {
    saveRole(next)
    setRole(next)
    setTab(next === 'employee' ? 'desk' : 'dashboard')
  }

  function pickEmployee(id: string) {
    saveSelectedEmployeeId(id)
    setEmployeeId(id)
  }

  const locked = role === 'employee' ? employeeId : undefined

  return (
    <Shell
      brand={store.state.settings.businessName}
      ownerName={store.state.settings.ownerName}
      role={role}
      onRole={switchRole}
      employeeLabel={employeeName}
      tab={tab}
      onTab={setTab}
      pendingStash={pendingStash}
      syncLabel={sync.label}
      syncTone={sync.tone}
      onRefresh={() => void store.refreshFromCloud()}
    >
      {role === 'owner' && tab === 'dashboard' && <Dashboard store={store} />}
      {role === 'employee' && tab === 'desk' && (
        <EmployeeDesk
          store={store}
          employeeId={employeeId}
          onPickEmployee={pickEmployee}
          onGo={setTab}
        />
      )}
      {tab === 'craft' && (
        <CraftCalc store={store} lockedEmployeeId={locked} />
      )}
      {tab === 'sales' && <Sales store={store} lockedEmployeeId={locked} />}
      {tab === 'stash' && (
        <Stash
          store={store}
          lockedEmployeeId={locked}
          employeeMode={role === 'employee'}
        />
      )}
      {role === 'owner' && tab === 'employees' && <Employees store={store} />}
      {tab === 'inventory' && (
        <Inventory
          store={store}
          lockedEmployeeId={locked}
          employeeMode={role === 'employee'}
        />
      )}
      {role === 'owner' && tab === 'prices' && <Prices store={store} />}
    </Shell>
  )
}
