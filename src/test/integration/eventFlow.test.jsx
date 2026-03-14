import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HostEvent from '@/pages/HostEvent';
import MyEvents from '@/pages/MyEvents';
import { AuthProvider } from '@/contexts/AuthContext';
import * as eventsAPI from '@/api/events';
import * as placesAPI from '@/api/places';
import * as communitiesAPI from '@/api/communities';

vi.mock('@/api/events');
vi.mock('@/api/places');
vi.mock('@/api/communities');
vi.mock('@/api/availability-unified', () => ({
  checkVenueAvailability: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/api/availability', () => ({
  getFacilitatorAvailability: vi.fn().mockResolvedValue([]),
  getMemberAvailabilityCount: vi.fn().mockResolvedValue(null),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Event Creation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: [] });
    communitiesAPI.getMyCommunities = vi.fn().mockResolvedValue({ communities: [] });
  });

  it('should complete full event creation flow', async () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Integration Test Event',
      startAt: '2026-12-25T10:00:00Z',
    };
    eventsAPI.createEvent = vi.fn().mockResolvedValue({ event: mockEvent });

    render(
      <MemoryRouter>
        <AuthProvider>
          <HostEvent />
        </AuthProvider>
      </MemoryRouter>
    );

    // Fill in form
    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/event title/i);
    const startAtInput = screen.getByLabelText(/start date & time/i);
    const capacityInput = screen.getByLabelText(/capacity/i);
    fireEvent.change(titleInput, { target: { value: 'Integration Test Event' } });
    fireEvent.change(startAtInput, { target: { value: '2026-12-25T10:00' } });
    fireEvent.change(capacityInput, { target: { value: '10' } });
    fireEvent.blur(titleInput);
    fireEvent.blur(startAtInput);

    await waitFor(() => {
      expect(titleInput).toHaveValue('Integration Test Event');
      expect(startAtInput).toHaveValue('2026-12-25T10:00');
    });

    const form = screen.getByRole('button', { name: /create event/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(eventsAPI.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Integration Test Event',
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it('should display created event in MyEvents', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        title: 'Created Event',
        startAt: '2026-12-25T10:00:00Z',
        visibility: 'public',
      },
    ];
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MyEvents />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Created Event')).toBeInTheDocument();
    });
  });
});
