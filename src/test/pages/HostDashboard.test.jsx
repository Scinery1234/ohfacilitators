import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HostDashboard from '@/pages/HostDashboard';
import { AuthProvider } from '@/contexts/AuthContext';
import * as placesAPI from '@/api/places';
import * as eventsAPI from '@/api/events';
import * as bookingsAPI from '@/api/bookings';

vi.mock('@/api/places');
vi.mock('@/api/events');
vi.mock('@/api/bookings');

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
});

const renderHostDashboard = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HostDashboard />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('HostDashboard Page', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: [] });
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: [] });
    bookingsAPI.getMyBooking = vi.fn().mockResolvedValue({ bookings: [] });
  });

  it('should render page title', () => {
    renderHostDashboard();
    expect(screen.getByText(/host dashboard/i)).toBeInTheDocument();
  });

  it('should display statistics when user is logged in', async () => {
    localStorageMock.setItem('token', 'demo-token-host');
    const mockPlaces = [{ id: '1', title: 'Place 1' }];
    const mockEvents = [
      { id: '1', title: 'Event 1' },
      { id: '2', title: 'Event 2' },
    ];
    const mockBookings = [
      { id: '1', startAt: '2026-12-25T10:00:00Z', status: 'confirmed' },
      { id: '2', startAt: '2026-12-20T10:00:00Z', status: 'pending' },
    ];

    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: mockPlaces });
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });
    bookingsAPI.getMyBooking = vi.fn().mockResolvedValue({ bookings: mockBookings });

    renderHostDashboard();

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument();
      expect(screen.getByText('Event 1')).toBeInTheDocument();
      expect(screen.getByText('Event 2')).toBeInTheDocument();
    });
  });

  it('should show quick action cards', () => {
    renderHostDashboard();
    expect(screen.getByText(/list a place/i)).toBeInTheDocument();
    expect(screen.getByText(/host an event/i)).toBeInTheDocument();
    expect(screen.getByText(/manage places/i)).toBeInTheDocument();
  });

  it('should display recent bookings when user is logged in', async () => {
    localStorageMock.setItem('token', 'demo-token-host');
    const mockBookings = [
      {
        id: '1',
        listingTitle: 'Test Event',
        startAt: '2026-12-25T10:00:00Z',
        userName: 'John Doe',
        status: 'confirmed',
      },
    ];
    bookingsAPI.getMyBooking = vi.fn().mockResolvedValue({ bookings: mockBookings });

    renderHostDashboard();

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });
  });

  it('should display my events section when user is logged in', async () => {
    localStorageMock.setItem('token', 'demo-token-host');
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event',
        startAt: '2026-12-25T10:00:00Z',
      },
    ];
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });

    renderHostDashboard();

    await waitFor(() => {
      expect(screen.getByText(/my events/i)).toBeInTheDocument();
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
  });

  it('should display my places section when user is logged in', async () => {
    localStorageMock.setItem('token', 'demo-token-host');
    const mockPlaces = [
      {
        id: '1',
        title: 'Test Place',
        address: '123 Main St',
      },
    ];
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: mockPlaces });

    renderHostDashboard();

    await waitFor(() => {
      expect(screen.getByText(/my places/i)).toBeInTheDocument();
      expect(screen.getByText('Test Place')).toBeInTheDocument();
    });
  });

  it('should show empty states when no data', async () => {
    renderHostDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no bookings yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no places yet/i)).toBeInTheDocument();
    });
  });
});
