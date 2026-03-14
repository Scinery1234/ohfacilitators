/**
 * Demo users for testing without backend.
 * Used when user clicks "Log in as User" or "Log in as Host" on Login page.
 */

import { getDemoMemberAvatarUrl, getHostAvatarUrl } from '@/lib/avatars';

export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@user.example',
  fullName: 'Demo User',
  role: 'user',
  avatarUrl: getDemoMemberAvatarUrl('demo-user-1'),
};

export const DEMO_HOST = {
  id: 'demo-host-1',
  email: 'demo@host.example',
  fullName: 'Demo Host',
  role: 'host',
  avatarUrl: getHostAvatarUrl('demo-host-1'),
};

export const DEMO_USERS = {
  user: DEMO_USER,
  host: DEMO_HOST,
};

/** Demo community member IDs for availability counts and display */
export const DEMO_COMMUNITY_MEMBER_IDS = [
  'demo-user-1',
  'demo-user-2',
  'demo-user-3',
  'demo-user-4',
  'demo-user-5',
];

/** Display names for demo community members (for lists/counts) */
export const DEMO_COMMUNITY_MEMBERS = [
  { id: 'demo-user-1', fullName: 'Demo User', email: 'demo@user.example', role: 'member' },
  { id: 'demo-user-2', fullName: 'Alex Rivera', email: 'alex@example.com', role: 'member' },
  { id: 'demo-user-3', fullName: 'Sam Taylor', email: 'sam@example.com', role: 'member' },
  { id: 'demo-user-4', fullName: 'Jordan Kim', email: 'jordan@example.com', role: 'member' },
  { id: 'demo-user-5', fullName: 'Casey Morgan', email: 'casey@example.com', role: 'member' },
];

export const DEMO_TOKEN_PREFIX = 'demo:';

export function isDemoToken(token) {
  return typeof token === 'string' && token.startsWith(DEMO_TOKEN_PREFIX);
}

export function getDemoUserFromToken(token) {
  if (!isDemoToken(token)) return null;
  const role = token.slice(DEMO_TOKEN_PREFIX.length);
  return DEMO_USERS[role] || null;
}
