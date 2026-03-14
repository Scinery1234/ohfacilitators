// Venue helpers — venues = spaces; get events at a venue by matching location
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';
import { mockCommunities } from '@/mocks/communities';
import { mockFacilitators } from '@/mocks/facilitators';
import { getVenueTestimonials } from '@/mocks/venueTestimonials';

export const mockVenues = mockSpaces; // venues are spaces

export function getMockVenue(id) {
  return mockSpaces.find((s) => s.id === id) ?? null;
}

/** Get venue (space) id for an event — event.location matches space.title */
export function getVenueIdForEvent(event) {
  if (!event?.location) return null;
  const space = mockSpaces.find((s) => s.title === event.location);
  return space?.id ?? null;
}

/** Get facilitators associated with this venue (from communities that use it) */
export function getVenueFacilitators(venueId) {
  const communities = mockCommunities.filter((c) => c.spaceIds?.includes(venueId));
  const facilitatorIds = [...new Set(communities.flatMap((c) => c.facilitatorIds || []))];
  return mockFacilitators.filter((f) => facilitatorIds.includes(f.id));
}

export function getVenueCommunities(venueId) {
  return mockCommunities.filter((c) => c.spaceIds?.includes(venueId));
}

export function getVenueEvents(venueId) {
  const venue = getMockVenue(venueId);
  if (!venue) return [];
  return mockEvents.filter((e) => e.location === venue.title);
}

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

/** Full venue detail for loader (instant load without API) */
export function getMockVenueDetail(id) {
  const mockVenue = getMockVenue(id);
  if (!mockVenue) return null;
  const mockEventsList = getVenueEvents(id);
  return {
    place: {
      ...mockVenue,
      events: mockEventsList.map((e) => {
        const timeStr = e.date ? `${e.date}T${parseMockTime(e.time)}` : null;
        const startAt = timeStr ? (() => {
          const d = new Date(timeStr);
          return isNaN(d.getTime()) ? null : d.toISOString();
        })() : null;
        return {
          id: e.id,
          title: e.title,
          startAt,
          endAt: null,
          visibility: 'public',
          date: e.date || (startAt ? startAt.slice(0, 10) : ''),
          time: e.time ?? null,
          location: e.location ?? null,
          locationArea: e.locationArea ?? null,
          price: e.price ?? null,
          imageUrl: e.imageUrl ?? null,
        };
      }),
      collaborators: mockVenue.host ? [{ userId: mockVenue.host.id, fullName: mockVenue.host.name, role: 'owner' }] : [],
      createdBy: mockVenue.host?.id || null,
    },
  };
}

export function getVenueTestimonialsForVenue(venueId) {
  return getVenueTestimonials(venueId);
}

/** Get display location for a venue: exact address if public, rough area otherwise */
export function getVenueLocationText(venue) {
  if (!venue) return null;
  if (venue.addressPublic && venue.address) return venue.address;
  return [venue.locationArea, venue.location].filter(Boolean).join(' — ') || null;
}

/** Whether venue has exact address (public) vs rough location only */
export function isVenueAddressPublic(venue) {
  return Boolean(venue?.addressPublic && venue?.address);
}
