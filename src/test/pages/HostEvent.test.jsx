import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HostEvent from '@/pages/HostEvent';
import { AuthProvider } from '@/contexts/AuthContext';
import * as eventsAPI from '@/api/events';
import * as placesAPI from '@/api/places';
import * as communitiesAPI from '@/api/communities';

// Mock API functions
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
vi.mock('@/components/ImageUploadField', () => ({
  default: ({ label }) => <div data-testid="image-upload">{label}</div>,
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderHostEvent = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HostEvent />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('HostEvent Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: [] });
    communitiesAPI.getMyCommunities = vi.fn().mockResolvedValue({ communities: [] });
  });

  it('should render form fields', async () => {
    renderHostEvent();

    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/start date & time/i)).toBeInTheDocument();
  });

  it('should show required field indicator', async () => {
    renderHostEvent();
    
    await waitFor(() => {
      const titleLabel = screen.getByText(/event title/i);
      expect(titleLabel.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });

  it('should display validation errors', async () => {
    renderHostEvent();

    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('should load user places', async () => {
    const mockPlaces = [
      { id: '1', title: 'Test Place' },
      { id: '2', title: 'Another Place' },
    ];
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: mockPlaces });

    renderHostEvent();

    await waitFor(() => {
      expect(placesAPI.getMyPlaces).toHaveBeenCalled();
    });

    // Places appear in select options (may include "✓ Available" or "(Not available)")
    expect(await screen.findByText(/Test Place/)).toBeInTheDocument();
    expect(screen.getByText(/Another Place/)).toBeInTheDocument();
  });

  it('should load user communities', async () => {
    const mockCommunities = [
      { id: '1', name: 'Test Community' },
    ];
    communitiesAPI.getMyCommunities = vi.fn().mockResolvedValue({ communities: mockCommunities });

    renderHostEvent();

    await waitFor(() => {
      expect(communitiesAPI.getMyCommunities).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });
  });

  it('should show message when no places available', async () => {
    placesAPI.getMyPlaces = vi.fn().mockResolvedValue({ places: [] });

    renderHostEvent();

    await waitFor(() => {
      expect(screen.getByText(/you don't have any places yet/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockEventResponse = { id: '123', title: 'Test Event' };
    eventsAPI.createEvent = vi.fn().mockResolvedValue({ event: mockEventResponse });

    renderHostEvent();

    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/event title/i);
    const startAtInput = screen.getByLabelText(/start date & time/i);
    const capacityInput = screen.getByLabelText(/capacity/i);

    fireEvent.change(titleInput, { target: { value: 'Test Event' } });
    fireEvent.change(startAtInput, { target: { value: '2026-12-25T10:00' } });
    fireEvent.change(capacityInput, { target: { value: '10' } });
    fireEvent.blur(titleInput);
    fireEvent.blur(startAtInput);

    await waitFor(() => {
      expect(titleInput).toHaveValue('Test Event');
      expect(startAtInput).toHaveValue('2026-12-25T10:00');
    });

    const form = screen.getByRole('button', { name: /create event/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(eventsAPI.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Event',
          })
        );
      },
      { timeout: 3000 }
    );
  });
});
