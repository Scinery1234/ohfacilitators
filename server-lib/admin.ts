/**
 * Check if user is an admin (can edit/delete any community, place, event).
 * Admin if: user.role === 'admin' OR user.email is in ADMIN_EMAILS env (comma-separated).
 */
export function isAdmin(user: { email?: string; role?: string } | null): boolean {
  if (!user?.email) return false;
  if (user.role === 'admin') return true;
  const emails =
    typeof process.env.ADMIN_EMAILS === 'string'
      ? process.env.ADMIN_EMAILS.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return emails.includes((user.email || '').toLowerCase());
}
