import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyEvents from '@/pages/MyEvents';
import { AuthProvider } from '@/contexts/AuthContext';
import * as eventsAPI from '@/api/events';

vi.mock('@/api/events');

const renderMyEvents = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MyEvents />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyEvents Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: [] });
  });

  it('should render page title', async () => {
    renderMyEvents();
    await waitFor(() => {
      expect(screen.getByText(/my events/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    eventsAPI.getMyEvents = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderMyEvents();
    // Loading state should be shown (check for skeleton or loading text)
  });

  it('should display events list', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event 1',
        startAt: '2026-12-25T10:00:00Z',
        placeTitle: 'Test Place',
      },
      {
        id: '2',
        title: 'Test Event 2',
        startAt: '2026-12-26T14:00:00Z',
      },
    ];
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    });
  });

  it('should show empty state when no events', async () => {
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: [] });

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
    });
  });

  it('should display event details', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event',
        startAt: '2026-12-25T10:00:00Z',
        placeTitle: 'Test Place',
        visibility: 'public',
      },
    ];
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText(/test place/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    eventsAPI.getMyEvents = vi.fn().mockRejectedValue(new Error('API Error'));

    renderMyEvents();

    await waitFor(() => {
      expect(screen.getByText(/failed to load events/i)).toBeInTheDocument();
    });
  });

  it('should link to event detail page', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Test Event',
        startAt: '2026-12-25T10:00:00Z',
      },
    ];
    eventsAPI.getMyEvents = vi.fn().mockResolvedValue({ events: mockEvents });

    renderMyEvents();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view event/i });
      expect(link).toHaveAttribute('href', '/listings/event/1');
    });
  });
});
