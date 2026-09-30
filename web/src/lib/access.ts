export function canAccess(path: string, role: string): boolean {
  // All authenticated users can access all pages
  return true
}