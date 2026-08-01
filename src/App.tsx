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
import { EmployeeLogin, OwnerGate } from './components/AuthGates'
import { useStore } from './hooks/useStore'
import {
  clearEmployeeAuth,
  isEmployeeAuthed,
  isOwnerAuthed,
  loadRole,
  loadSelectedEmployeeId,
  saveRole,
  setEmployeeAuthed,
  setOwnerAuthed,
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
  const [employeeId, setEmployeeId] = useState(() => {
    const id = loadSelectedEmployeeId()
    return id && isEmployeeAuthed(id) ? id : ''
  })
  const [ownerUnlocked, setOwnerUnlocked] = useState(() => isOwnerAuthed())
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

  const employeeLoggedIn =
    role === 'employee' &&
    Boolean(employeeId) &&
    isEmployeeAuthed(employeeId)

  function switchRole(next: AppRole) {
    saveRole(next)
    setRole(next)
    if (next === 'employee') {
      setTab('desk')
    } else {
      setTab('dashboard')
    }
  }

  function onEmployeeLogin(id: string) {
    setEmployeeAuthed(id)
    setEmployeeId(id)
    setTab('desk')
  }

  function onEmployeeLogout() {
    clearEmployeeAuth()
    setEmployeeId('')
    setTab('desk')
  }

  function onOwnerUnlock() {
    setOwnerAuthed(true)
    setOwnerUnlocked(true)
  }

  const locked = role === 'employee' && employeeLoggedIn ? employeeId : undefined

  return (
    <Shell
      brand={store.state.settings.businessName}
      ownerName={store.state.settings.ownerName}
      role={role}
      onRole={switchRole}
      employeeLabel={employeeLoggedIn ? employeeName : undefined}
      tab={tab}
      onTab={setTab}
      pendingStash={pendingStash}
      syncLabel={sync.label}
      syncTone={sync.tone}
      syncDetail={
        store.syncStatus === 'offline' || store.syncStatus === 'error'
          ? store.syncError
          : null
      }
      onRefresh={() => void store.refreshFromCloud()}
      onLogout={
        role === 'employee' && employeeLoggedIn ? onEmployeeLogout : undefined
      }
    >
      {role === 'owner' && !ownerUnlocked && (
        <OwnerGate store={store} onUnlock={onOwnerUnlock} />
      )}

      {role === 'owner' && ownerUnlocked && tab === 'dashboard' && (
        <Dashboard store={store} />
      )}
      {role === 'owner' && ownerUnlocked && tab === 'employees' && (
        <Employees store={store} />
      )}
      {role === 'owner' && ownerUnlocked && tab === 'prices' && (
        <Prices store={store} />
      )}
      {role === 'owner' &&
        ownerUnlocked &&
        (tab === 'craft' ||
          tab === 'sales' ||
          tab === 'stash' ||
          tab === 'inventory') && (
          <>
            {tab === 'craft' && <CraftCalc store={store} />}
            {tab === 'sales' && <Sales store={store} />}
            {tab === 'stash' && <Stash store={store} />}
            {tab === 'inventory' && <Inventory store={store} />}
          </>
        )}

      {role === 'employee' && !employeeLoggedIn && (
        <EmployeeLogin store={store} onLogin={onEmployeeLogin} />
      )}

      {role === 'employee' && employeeLoggedIn && tab === 'desk' && (
        <EmployeeDesk
          store={store}
          employeeId={employeeId}
          onPickEmployee={() => undefined}
          onGo={setTab}
          locked
          onLogout={onEmployeeLogout}
        />
      )}
      {role === 'employee' && employeeLoggedIn && tab === 'craft' && (
        <CraftCalc store={store} lockedEmployeeId={locked} />
      )}
      {role === 'employee' && employeeLoggedIn && tab === 'sales' && (
        <Sales store={store} lockedEmployeeId={locked} />
      )}
      {role === 'employee' && employeeLoggedIn && tab === 'stash' && (
        <Stash
          store={store}
          lockedEmployeeId={locked}
          employeeMode
        />
      )}
      {role === 'employee' && employeeLoggedIn && tab === 'inventory' && (
        <Inventory
          store={store}
          lockedEmployeeId={locked}
          employeeMode
        />
      )}
    </Shell>
  )
}
