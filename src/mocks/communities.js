// Mock communities data — spaces, events, hosts, facilitators can belong to multiple communities
// Community types: open (anyone can join), closed (invite only), approval (request to join)

import { mockSpaces } from './spaces';
import { mockEvents } from './events';

export const communityTypes = {
  open: 'Open',
  closed: 'Closed',
  approval: 'Approval required',
};

export const DEMO_COMMUNITY_ID = 'comm-demo';

export const mockCommunities = [
  {
    id: 'comm-demo',
    slug: 'demo-community',
    name: 'Demo Community',
    imageUrl: '/pexels-cottonbro-4009398.jpg',
    description: 'A sample community for trying out the platform. Demo Host runs venues and events here; multiple members can mark their availability.',
    type: 'open',
    locationArea: 'Sydney',
    spaceIds: ['space-demo-1', 'space-demo-2'],
    eventIds: ['event-demo-1', 'event-demo-2'],
    hostIds: ['demo-host-1'],
    facilitatorIds: ['demo-host-1', 'demo-user-1'],
    memberCount: 5,
  },
  {
    id: 'comm-1',
    slug: 'queer-south-asian-community',
    name: 'Queer South Asian Community',
    imageUrl: '/pexels-cottonbro-4009398.jpg',
    description: 'A vibrant, welcoming space for LGBTQ+ people and allies. We host art workshops, social gatherings, wellness events, and cultural celebrations that center diverse experiences and foster meaningful connections.',
    type: 'open',
    locationArea: 'Sydney CBD',
    spaceIds: ['space-1', 'space-2'],
    eventIds: ['event-1', 'event-2', 'event-5', 'event-9'],
    hostIds: ['host-1', 'host-2'],
    facilitatorIds: ['fac-1', 'fac-4'],
    memberCount: 120,
  },
  {
    id: 'comm-2',
    slug: 'sydney-spiritual-community',
    name: 'Sydney Spiritual Community',
    imageUrl: '/pexels-polina-zimmerman-3747468.jpg',
    description: 'Explore mindfulness, meditation, and holistic wellness in a welcoming, secular space. Our events include sound baths, yoga, tarot and oracle readings, astrology workshops, and community circles—all designed for personal growth and spiritual exploration.',
    type: 'open',
    locationArea: 'Inner West',
    spaceIds: ['space-2', 'space-5'],
    eventIds: ['event-2', 'event-4', 'event-5', 'event-6'],
    hostIds: ['host-2', 'host-4'],
    facilitatorIds: ['fac-1', 'fac-2', 'fac-6'],
    memberCount: 85,
  },
  {
    id: 'comm-3',
    slug: 'interfaith-community',
    name: 'Interfaith Spiritual Circle',
    imageUrl: '/pexels-roman-odintsov-8063880.jpg',
    description: 'A multi-faith community celebrating shared values of spirituality, ritual, and togetherness. We host ceremonial gatherings, cultural celebrations, educational talks on various traditions, and spaces for collective prayer and reflection.',
    type: 'approval',
    locationArea: 'North Shore',
    spaceIds: ['space-4', 'space-6'],
    eventIds: ['event-4', 'event-7'],
    hostIds: ['host-4', 'host-6'],
    facilitatorIds: ['fac-3'],
    memberCount: 200,
  },
  {
    id: 'comm-4',
    slug: 'cultural-language-community',
    name: 'Cultural Language & Heritage Group',
    imageUrl: '/pexels-wilcle-nunes-38713774-27165070.jpg',
    description: 'Preserving language, culture, and heritage through community connection. We organize language classes, cultural celebrations, cooking workshops, and social events that strengthen bonds and foster appreciation for diverse traditions.',
    type: 'approval',
    locationArea: 'Parramatta',
    spaceIds: ['space-3', 'space-6'],
    eventIds: ['event-3', 'event-8'],
    hostIds: ['host-3', 'host-6'],
    facilitatorIds: ['fac-3', 'fac-5'],
    memberCount: 150,
  },
];

export const getMockCommunity = (idOrSlug) => {
  return mockCommunities.find(
    (c) => c.id === idOrSlug || c.slug === idOrSlug
  );
};

/** Full detail payload for mock community (for instant load without API) */
export function getMockCommunityDetail(slug) {
  const c = getMockCommunity(slug);
  if (!c) return null;
  const spaceIds = new Set(c.spaceIds || []);
  const eventIds = new Set(c.eventIds || []);
  function parseMockTime(t) {
    if (!t) return '12:00:00';
    const am = /^(\d{1,2}):(\d{2})\s*AM$/i.exec(t);
    if (am) {
      const h = Number(am[1]) === 12 ? 0 : Number(am[1]);
      return `${String(h).padStart(2, '0')}:${am[2]}:00`;
    }
    const pm = /^(\d{1,2}):(\d{2})\s*PM$/i.exec(t);
    if (pm) {
      const h = Number(pm[1]) === 12 ? 12 : Number(pm[1]) + 12;
      return `${String(h).padStart(2, '0')}:${pm[2]}:00`;
    }
    return '12:00:00';
  }
  const places = mockSpaces.filter((s) => spaceIds.has(s.id)).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    address: s.address || s.locationArea,
    creatorName: s.host?.name ?? null,
    createdBy: s.host?.id,
    imageUrl: s.images?.[0] ?? s.imageUrl ?? null,
  }));
  const events = mockEvents.filter((e) => eventIds.has(e.id)).map((e) => {
    const timeStr = e.date ? `${e.date}T${parseMockTime(e.time)}` : null;
    const d = timeStr ? new Date(timeStr) : new Date();
    const startAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    return {
      id: e.id,
      title: e.title,
      startAt,
      placeTitle: e.location ?? null,
      creatorName: e.host?.name ?? null,
      createdBy: e.host?.id,
      date: e.date || (startAt ? startAt.slice(0, 10) : ''),
      time: e.time ?? null,
      location: e.location ?? null,
      locationArea: e.locationArea ?? null,
      price: e.price ?? null,
      imageUrl: e.imageUrl ?? null,
    };
  });
  return {
    community: {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      creatorName: null,
      locationArea: c.locationArea ?? null,
      type: c.type ?? 'open',
      imageUrl: c.imageUrl ?? null,
    },
    places,
    events,
  };
}

// Global/public content — events, spaces, facilitators open to everyone (not community-gated)
export const getGlobalEvents = (events, communities) => {
  const openCommunityIds = communities.filter((c) => c.type === 'open').map((c) => c.id);
  return events.filter((e) => {
    const eventCommunityIds = communities.filter((c) => c.eventIds?.includes(e.id)).map((c) => c.id);
    return eventCommunityIds.some((id) => openCommunityIds.includes(id));
  });
};

export const getGlobalSpaces = (spaces, communities) => {
  const openCommunityIds = communities.filter((c) => c.type === 'open').map((c) => c.id);
  return spaces.filter((s) => {
    const spaceCommunityIds = communities.filter((c) => c.spaceIds?.includes(s.id)).map((c) => c.id);
    return spaceCommunityIds.some((id) => openCommunityIds.includes(id));
  });
};

export const getGlobalFacilitators = (facilitators, communities) => {
  const openCommunityIds = communities.filter((c) => c.type === 'open').map((c) => c.id);
  return facilitators.filter((f) => {
    const facCommunityIds = communities.filter((c) => c.facilitatorIds?.includes(f.id)).map((c) => c.id);
    return facCommunityIds.some((id) => openCommunityIds.includes(id));
  });
};
