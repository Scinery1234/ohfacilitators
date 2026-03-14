/**
 * Scheduling Intelligence API
 * Pre-aggregated availability data for calendar views
 * Returns per-date intelligence for venues, facilitators, hosts, and communities
 */

import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Helper: Get day of week from date string
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

// Helper: Check if time ranges overlap
function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = parseInt(start1.replace(':', ''));
  const e1 = parseInt(end1.replace(':', ''));
  const s2 = parseInt(start2.replace(':', ''));
  const e2 = parseInt(end2.replace(':', ''));
  return s1 < e2 && e1 > s2;
}

// Helper: Check if date matches recurring slot
function matchesRecurringSlot(dateStr, slot) {
  if (slot.date) return slot.date === dateStr; // Specific date
  if (slot.dayOfWeek !== null && slot.dayOfWeek !== undefined) {
    return getDayOfWeek(dateStr) === slot.dayOfWeek;
  }
  return false;
}

// Helper: Get availability for a profile on a specific date
function getProfileAvailabilityOnDate(profileId, dateStr) {
  const dayOfWeek = getDayOfWeek(dateStr);
  
  // Get recurring slots
  const recurringSlots = db
    .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND dayOfWeek = ? AND status = ?')
    .all(profileId, dayOfWeek, 'AVAILABLE');
  
  // Get specific date slots
  const dateSlots = db
    .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND date = ? AND status = ?')
    .all(profileId, dateStr, 'AVAILABLE');
  
  // Get overrides (blocked/booked)
  const overrides = db
    .prepare('SELECT * FROM availability_overrides WHERE profileId = ? AND date = ?')
    .all(profileId, dateStr);
  
  const hasBlocked = overrides.some((o) => o.status === 'BLOCKED');
  const hasBooked = overrides.some((o) => o.status === 'BOOKED');
  
  const hasAvailableSlot = recurringSlots.length > 0 || dateSlots.length > 0;
  
  if (hasBlocked) return { available: false, status: 'BLOCKED' };
  if (hasBooked) return { available: false, status: 'BOOKED' };
  if (hasAvailableSlot) return { available: true, status: 'AVAILABLE' };
  return { available: false, status: 'UNAVAILABLE' };
}

// Helper: Get community member availability count for a date
function getCommunityAvailabilityCount(communityId, dateStr) {
  // Get community members (assuming community_members table)
  const members = db
    .prepare('SELECT userId FROM community_members WHERE communityId = ?')
    .all(communityId);
  
  if (!members || members.length === 0) {
    return { availableCount: 0, total: 0, percentage: 0 };
  }
  
  let availableCount = 0;
  const dayOfWeek = getDayOfWeek(dateStr);
  
  for (const member of members) {
    const profile = db
      .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
      .get('USER', member.userId);
    
    if (profile) {
      // Check recurring slots
      const recurringSlots = db
        .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND dayOfWeek = ? AND status = ?')
        .all(profile.id, dayOfWeek, 'AVAILABLE');
      
      // Check specific date slots
      const dateSlots = db
        .prepare('SELECT * FROM availability_slots WHERE profileId = ? AND date = ? AND status = ?')
        .all(profile.id, dateStr, 'AVAILABLE');
      
      // Check for blocks
      const blocks = db
        .prepare('SELECT * FROM availability_overrides WHERE profileId = ? AND date = ? AND status = ?')
        .all(profile.id, dateStr, 'BLOCKED');
      
      if (blocks.length === 0 && (recurringSlots.length > 0 || dateSlots.length > 0)) {
        availableCount++;
      }
    }
  }
  
  const total = members.length;
  const percentage = total > 0 ? Math.round((availableCount / total) * 100) : 0;
  
  return { availableCount, total, percentage };
}

// Helper: Get available facilitators for a date
function getAvailableFacilitators(communityId, dateStr) {
  // Get facilitators from community (assuming facilitatorIds in community or separate table)
  // For now, get all users with facilitator role in community
  const facilitators = db
    .prepare(
      `SELECT u.id, u.fullName, u.email 
       FROM users u 
       JOIN community_members cm ON u.id = cm.userId 
       WHERE cm.communityId = ? AND (u.role = 'facilitator' OR cm.role = 'facilitator')`
    )
    .all(communityId);
  
  const available = [];
  
  for (const fac of facilitators) {
    const profile = db
      .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
      .get('USER', fac.id);
    
    if (profile) {
      const availability = getProfileAvailabilityOnDate(profile.id, dateStr);
      if (availability.available || availability.status === 'TENTATIVE') {
        available.push({
          id: fac.id,
          name: fac.fullName,
          avatarUrl: null, // Add avatar URL if available
          status: availability.status,
        });
      }
    }
  }
  
  return available;
}

/**
 * GET /api/scheduling/intelligence
 * Get pre-aggregated availability intelligence for a month
 */
router.get('/', (req, res) => {
  try {
    const { month, year, communityId, venueId, facilitatorId, hostId } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }
    
    // Generate all dates in the month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const result = {};
    
    // Process each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum, day);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = {
        venueAvailable: null,
        venueStatus: null,
        facilitatorAvailable: null,
        facilitatorStatus: null,
        hostAvailable: null,
        communityAvailableCount: 0,
        communityTotal: 0,
        communityAvailabilityPercentage: 0,
        availableFacilitators: [],
      };
      
      // Venue availability
      if (venueId) {
        const venueProfile = db
          .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
          .get('VENUE', venueId);
        
        if (venueProfile) {
          const venueAvail = getProfileAvailabilityOnDate(venueProfile.id, dateStr);
          dayData.venueAvailable = venueAvail.available;
          dayData.venueStatus = venueAvail.status;
        } else {
          dayData.venueAvailable = false;
          dayData.venueStatus = 'UNAVAILABLE';
        }
      }
      
      // Facilitator availability
      if (facilitatorId) {
        const facProfile = db
          .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
          .get('USER', facilitatorId);
        
        if (facProfile) {
          const facAvail = getProfileAvailabilityOnDate(facProfile.id, dateStr);
          dayData.facilitatorAvailable = facAvail.available;
          dayData.facilitatorStatus = facAvail.status;
        } else {
          dayData.facilitatorAvailable = false;
          dayData.facilitatorStatus = 'UNAVAILABLE';
        }
      }
      
      // Host availability
      if (hostId) {
        const hostProfile = db
          .prepare('SELECT * FROM availability_profiles WHERE ownerType = ? AND ownerId = ?')
          .get('USER', hostId);
        
        if (hostProfile) {
          const hostAvail = getProfileAvailabilityOnDate(hostProfile.id, dateStr);
          dayData.hostAvailable = hostAvail.available;
        } else {
          dayData.hostAvailable = false;
        }
      }
      
      // Community availability
      if (communityId) {
        const commAvail = getCommunityAvailabilityCount(communityId, dateStr);
        dayData.communityAvailableCount = commAvail.availableCount;
        dayData.communityTotal = commAvail.total;
        dayData.communityAvailabilityPercentage = commAvail.percentage;
        
        // Get available facilitators
        dayData.availableFacilitators = getAvailableFacilitators(communityId, dateStr);
      }
      
      result[dateStr] = dayData;
    }
    
    res.json(result);
  } catch (err) {
    console.error('Scheduling intelligence error:', err);
    res.status(500).json({ message: 'Failed to compute scheduling intelligence' });
  }
});

export default router;
