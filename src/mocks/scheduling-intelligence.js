/**
 * Mock scheduling intelligence data for demo mode
 * Uses the unified availability engine so calendar views match venue/user availability.
 */

import { getHostAvatarUrl, getFacilitatorAvatarUrl, getDemoMemberAvatarUrl } from '@/lib/avatars';
import { checkMockVenueAvailability, checkMockUserAvailability, getMockAvailabilityProfile } from '@/mocks/availability-unified';

// Demo facilitator list for availableFacilitators (names match mock facilitators)
const DEMO_FACILITATORS = [
  { id: 'demo-host-1', name: 'Demo Host', avatarUrl: getHostAvatarUrl('demo-host-1') },
  { id: 'demo-user-1', name: 'Demo User', avatarUrl: getDemoMemberAvatarUrl('demo-user-1') },
  { id: 'fac-1', name: 'Iris West', avatarUrl: getFacilitatorAvatarUrl('fac-1') },
  { id: 'fac-2', name: 'Luna Martinez', avatarUrl: getFacilitatorAvatarUrl('fac-2') },
  { id: 'fac-3', name: 'Dev Patel', avatarUrl: getFacilitatorAvatarUrl('fac-3') },
  { id: 'fac-4', name: 'Zara Khan', avatarUrl: getFacilitatorAvatarUrl('fac-4') },
];

// Generate mock intelligence for a month using unified availability engine
export function getMockSchedulingIntelligence({ month, year, communityId, venueId, facilitatorId, hostId }) {
  const yearNum = parseInt(year);
  const monthNum = parseInt(month) - 1;
  const lastDay = new Date(yearNum, monthNum + 1, 0);
  const daysInMonth = lastDay.getDate();

  const result = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(yearNum, monthNum, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    const dayPattern = day % 7;
    const weekPattern = Math.floor((day - 1) / 7) % 4;

    // Community availability (unchanged: heatmap-style signal)
    let communityPercentage = 0;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      communityPercentage = 40 + (dayPattern * 6) + (weekPattern * 5);
    } else {
      communityPercentage = 20 + (dayPattern * 5) + (weekPattern * 3);
    }
    communityPercentage = Math.min(100, Math.max(0, communityPercentage));
    const totalMembers = 30;
    const availableCount = Math.round((communityPercentage / 100) * totalMembers);

    // Venue: from unified engine
    let venueAvailable = null;
    let venueStatus = null;
    if (venueId) {
      const check = checkMockVenueAvailability(venueId, dateStr, '09:00', '17:00');
      venueAvailable = check?.available ?? false;
      const hasBooked = check?.conflicts?.some((c) => c.status === 'BOOKED');
      venueStatus = venueAvailable ? 'AVAILABLE' : hasBooked ? 'BOOKED' : 'BLOCKED';
    }

    // Facilitator: from unified engine (USER profile)
    let facilitatorAvailable = null;
    let facilitatorStatus = null;
    if (facilitatorId) {
      const check = checkMockUserAvailability(facilitatorId, dateStr, '09:00', '17:00');
      facilitatorAvailable = check?.available ?? false;
      facilitatorStatus = facilitatorAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
    }

    // Host: from unified engine (USER profile)
    let hostAvailable = null;
    if (hostId) {
      const check = checkMockUserAvailability(hostId, dateStr, '09:00', '17:00');
      hostAvailable = check?.available ?? false;
    }

    // Available facilitators this day: those with USER profile and available 9–5
    let availableFacilitators = [];
    if (communityId) {
      availableFacilitators = DEMO_FACILITATORS.filter((fac) => {
        const profile = getMockAvailabilityProfile('USER', fac.id);
        if (!profile) return false;
        const check = checkMockUserAvailability(fac.id, dateStr, '09:00', '17:00');
        return check?.available ?? false;
      });
      // Keep 1–3 for visual variation if many available
      if (availableFacilitators.length > 3) {
        availableFacilitators = availableFacilitators.slice(0, 2 + (day % 2));
      }
    }

    result[dateStr] = {
      venueAvailable,
      venueStatus,
      facilitatorAvailable,
      facilitatorStatus,
      hostAvailable,
      communityAvailableCount: availableCount,
      communityTotal: totalMembers,
      communityAvailabilityPercentage: communityPercentage,
      availableFacilitators,
    };
  }

  return result;
}
