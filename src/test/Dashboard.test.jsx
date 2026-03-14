import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

vi.mock('@/api/places', () => ({
  getMyPlaces: vi.fn().mockResolvedValue({ places: [] }),
  getPlacesInMyCommunities: vi.fn().mockResolvedValue({ places: [] }),
}));
vi.mock('@/api/events', () => ({ getMyEvents: vi.fn().mockResolvedValue({ events: [] }) }));
vi.mock('@/api/schedule', () => ({ getMySchedule: vi.fn().mockResolvedValue({ schedule: [] }) }));

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render correctly for host user', async () => {
    localStorage.setItem('token', 'demo-token-host');

    render(
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toHaveTextContent(/demo host/i);
    });
    const hostEventLinks = screen.getAllByRole('link', { name: /host an event/i });
    expect(hostEventLinks.length).toBeGreaterThan(0);
    expect(hostEventLinks[0]).toHaveAttribute('href', '/host-event');
  });

  it('should render correctly for regular user', async () => {
    localStorage.setItem('token', 'demo-token-user');

    render(
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toHaveTextContent(/demo user/i);
    });
    // Regular user sees "List a Place" CTA (card and/or button; no separate "become a host" link)
    const listPlaceLinks = screen.getAllByRole('link', { name: /list a place/i });
    expect(listPlaceLinks.length).toBeGreaterThan(0);
  });
});
