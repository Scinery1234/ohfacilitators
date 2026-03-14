import apiClient from './client';
import { isDemoToken } from '@/mocks/users';
import { mockEvents } from '@/mocks/events';

function isDemoMode() {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return false;
  return isDemoToken(token);
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

export async function getMySchedule() {
  if (isDemoMode()) {
    // Return demo host's events as schedule items
    const demoEvents = mockEvents
      .filter((e) => e.host?.id === 'demo-host-1')
      .map((e) => {
        const timeStr = e.date ? `${e.date}T${parseMockTime(e.time)}` : null;
        const d = timeStr ? new Date(timeStr) : new Date();
        const startAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        return {
          id: e.id,
          type: 'event',
          title: e.title,
          startAt,
          endAt: null,
          location: e.location,
        };
      });
    // Return in same format as API: { schedule: [...] }
    return Promise.resolve({ schedule: demoEvents });
  }
  return apiClient.get('/user/profile?schedule=true');
}
