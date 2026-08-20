export type AppRole = 'owner' | 'employee'

const ROLE_KEY = 'fastlane-role'
const EMP_KEY = 'fastlane-selected-employee'
const EMP_AUTH_KEY = 'fastlane-employee-authed'
const OWNER_AUTH_KEY = 'fastlane-owner-authed'

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

export function isEmployeeAuthed(employeeId: string): boolean {
  if (!employeeId) return false
  return localStorage.getItem(EMP_AUTH_KEY) === employeeId
}

export function setEmployeeAuthed(employeeId: string): void {
  localStorage.setItem(EMP_AUTH_KEY, employeeId)
  saveSelectedEmployeeId(employeeId)
}

export function clearEmployeeAuth(): void {
  localStorage.removeItem(EMP_AUTH_KEY)
  localStorage.removeItem(EMP_KEY)
}

export function isOwnerAuthed(): boolean {
  return localStorage.getItem(OWNER_AUTH_KEY) === '1'
}

export function setOwnerAuthed(ok: boolean): void {
  if (ok) localStorage.setItem(OWNER_AUTH_KEY, '1')
  else localStorage.removeItem(OWNER_AUTH_KEY)
}

export function checkPassword(expected: string, given: string): boolean {
  return expected.trim() === given.trim() && expected.trim().length > 0
}
