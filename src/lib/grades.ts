export const EMPLOYEE_GRADES = [
  'Recruit',
  'Junior Seller',
  'Senior Seller',
  'Manager',
  'CEO',
  'Owner',
] as const

export type EmployeeGrade = (typeof EMPLOYEE_GRADES)[number]

export function gradeIndex(grade: string): number {
  const i = EMPLOYEE_GRADES.indexOf(grade as EmployeeGrade)
  return i >= 0 ? i : 1
}

export function promoteGrade(grade: string): EmployeeGrade {
  const i = gradeIndex(grade)
  return EMPLOYEE_GRADES[Math.min(EMPLOYEE_GRADES.length - 1, i + 1)]!
}

export function demoteGrade(grade: string): EmployeeGrade {
  const i = gradeIndex(grade)
  return EMPLOYEE_GRADES[Math.max(0, i - 1)]!
}
