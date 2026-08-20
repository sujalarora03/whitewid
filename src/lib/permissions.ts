/** Who is performing an action in this browser session */
export type ActorCtx = {
  isOwner: boolean
  /** Logged-in employee id when not owner */
  employeeId?: string
  displayName: string
}

/**
 * Non-owners may only delete records they own (matching employee id).
 * Owner/business rows (empty owner id) are owner-only.
 */
export function canDeleteRecord(
  actor: ActorCtx,
  ownerEmployeeId: string | undefined | null,
): boolean {
  if (actor.isOwner) return true
  if (!actor.employeeId) return false
  if (!ownerEmployeeId) return false
  return ownerEmployeeId === actor.employeeId
}
