export type AppRole = 'owner' | 'employee'

const ROLE_KEY = 'white-widow-role'
const EMP_KEY = 'white-widow-selected-employee'

export function loadRole(): AppRole {
  const q = new URLSearchParams(window.location.search).get('role')
  if (q === 'employee' || q === 'crew') return 'employee'
  if (q === 'owner') return 'owner'
  const saved = localStorage.getItem(ROLE_KEY)
  return saved === 'employee' ? 'employee' : 'owner'
}

export function saveRole(role: AppRole): void {
  localStorage.setItem(ROLE_KEY, role)
  const url = new URL(window.location.href)
  if (role === 'employee') url.searchParams.set('role', 'employee')
  else url.searchParams.delete('role')
  window.history.replaceState({}, '', url.toString())
}

export function loadSelectedEmployeeId(): string {
  return localStorage.getItem(EMP_KEY) ?? ''
}

export function saveSelectedEmployeeId(id: string): void {
  if (id) localStorage.setItem(EMP_KEY, id)
  else localStorage.removeItem(EMP_KEY)
}
