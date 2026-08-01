import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { checkPassword } from '../lib/session'

export function EmployeeLogin({
  store,
  onLogin,
}: {
  store: StoreApi
  onLogin: (employeeId: string) => void
}) {
  const active = store.state.employees.filter((e) => e.active)
  const [employeeId, setEmployeeId] = useState(active[0]?.id ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const emp = active.find((x) => x.id === employeeId)
    if (!emp) {
      setError('Pick your account')
      return
    }
    if (!checkPassword(emp.password, password)) {
      setError('Wrong password')
      return
    }
    setError(null)
    onLogin(emp.id)
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Crew login</p>
          <h2 className="hero-brand">{store.state.settings.businessName}</h2>
          <p className="hero-copy">
            Sign in with the account {store.state.settings.ownerName} created for
            you.
          </p>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <KeyRound size={16} /> Employee login
          </h3>
        </header>
        {active.length === 0 ? (
          <p className="empty">
            No accounts yet — ask the owner to add you under Crew.
          </p>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Your account</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {active.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password from owner"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="discord-status err">{error}</p>}
            <button type="submit" className="btn primary">
              Sign in
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export function OwnerGate({
  store,
  onUnlock,
}: {
  store: StoreApi
  onUnlock: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!checkPassword(store.state.settings.ownerPassword, password)) {
      setError('Wrong owner password')
      return
    }
    setError(null)
    onUnlock()
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <KeyRound size={16} /> Owner unlock
          </h3>
        </header>
        <p className="muted panel-intro">
          Enter the owner password for {store.state.settings.ownerName}.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Owner password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="discord-status err">{error}</p>}
          <button type="submit" className="btn primary">
            Unlock owner mode
          </button>
        </form>
      </section>
    </div>
  )
}
