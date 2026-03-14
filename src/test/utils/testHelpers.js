/**
 * Test utilities and helpers for React Testing Library
 */

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Custom render function that includes providers
 * @param {React.ReactElement} ui
 * @param {{ route?: string, initialAuthState?: any } & import('@testing-library/react').RenderOptions} options
 */
export function renderWithProviders(ui, { route = '/', initialAuthState = null, ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/** Mock user data for testing */
export const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'user',
};

/** Mock host data for testing */
export const mockHost = {
  id: 'test-host-1',
  email: 'host@example.com',
  fullName: 'Test Host',
  role: 'host',
};

/** Mock event data */
export const mockEvent = {
  id: 'event-1',
  title: 'Test Event',
  description: 'Test description',
  startAt: '2026-12-25T10:00:00Z',
  endAt: '2026-12-25T12:00:00Z',
  capacity: 20,
  visibility: 'public',
  status: 'published',
  placeId: 'place-1',
  createdBy: 'user-1',
};

/** Mock place data */
export const mockPlace = {
  id: 'place-1',
  title: 'Test Place',
  description: 'Test place description',
  address: '123 Main St',
  visibility: 'public',
};

/** Mock booking data */
export const mockBooking = {
  id: 'booking-1',
  listingType: 'event',
  listingId: 'event-1',
  status: 'confirmed',
  startAt: '2026-12-25T10:00:00Z',
};

/** Create mock API response */
export function createMockResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

/** Create mock API error */
export function createMockError(message, status = 400) {
  const error = new Error(message);
  error.response = {
    data: { message },
    status,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  };
  return error;
}
