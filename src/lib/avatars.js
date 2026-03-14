// Use initials-based avatars so faces always match names (no wrong face for name)
const HOST_NAMES = {
  'host-1': 'Sam Chen',
  'host-2': 'Marcus Rodriguez',
  'host-3': 'Alex Thompson',
  'host-4': 'Jordan Lee',
  'host-5': 'Riley Morgan',
  'host-6': 'Maya Patel',
  'demo-host-1': 'Demo Host',
};

const FACILITATOR_NAMES = {
  'fac-1': 'Alex Rivera',
  'fac-2': 'Iris Chen',
  'fac-3': 'Jordan Lee',
  'fac-4': 'Sam Chen',
  'fac-5': 'Maya Patel',
  'fac-6': 'Luna Rose',
  'demo-user-1': 'Demo User',
};

/** UI Avatars URL so initials match the displayed name */
function avatarUrlForName(name, size = 200) {
  if (!name || !name.trim()) return null;
  const encoded = encodeURIComponent(name.trim());
  return `https://ui-avatars.com/api/?name=${encoded}&size=${size}`;
}

export function getHostAvatarUrl(hostId, size = 200) {
  const name = HOST_NAMES[hostId];
  if (name) return avatarUrlForName(name, size);
  return avatarUrlForName('Host', size);
}

export function getFacilitatorAvatarUrl(facilitatorId, size = 200) {
  const name = FACILITATOR_NAMES[facilitatorId];
  if (name) return avatarUrlForName(name, size);
  return avatarUrlForName('Facilitator', size);
}

/** Demo community members: avatar URL so face (initials) matches name */
export const DEMO_MEMBER_AVATAR_NAMES = {
  'demo-user-1': 'Demo User',
  'demo-user-2': 'Alex Rivera',
  'demo-user-3': 'Sam Taylor',
  'demo-user-4': 'Jordan Kim',
  'demo-user-5': 'Casey Morgan',
};

export function getDemoMemberAvatarUrl(userId, size = 200) {
  const name = DEMO_MEMBER_AVATAR_NAMES[userId];
  if (name) return avatarUrlForName(name, size);
  return avatarUrlForName('Member', size);
}
