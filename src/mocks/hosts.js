// Host helpers — hosts are derived from spaces and events
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';
import { mockCommunities } from '@/mocks/communities';

export function getMockHosts() {
  const map = new Map();
  for (const s of mockSpaces) {
    if (s.host?.id && !map.has(s.host.id)) {
      map.set(s.host.id, s.host);
    }
  }
  for (const e of mockEvents) {
    if (e.host?.id && !map.has(e.host.id)) {
      map.set(e.host.id, e.host);
    }
  }
  return Array.from(map.values());
}

export function getMockHost(id) {
  return getMockHosts().find((h) => h.id === id) ?? null;
}

export function getHostSpaces(hostId) {
  return mockSpaces.filter((s) => s.host?.id === hostId);
}

export function getHostEvents(hostId) {
  return mockEvents.filter((e) => e.host?.id === hostId);
}

export function getHostCommunities(hostId) {
  return mockCommunities.filter((c) => c.hostIds?.includes(hostId));
}
