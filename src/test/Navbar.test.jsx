import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
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

describe('Navbar - Hamburger Menu', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock window.matchMedia for responsive design
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should open and close hamburger menu', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );

    const menuButton = screen.getByLabelText(/toggle menu/i);
    expect(menuButton).toBeInTheDocument();

    // When closed on mobile: only desktop nav link (hidden), so 1 Communities link
    expect(screen.getAllByRole('link', { name: /communities/i })).toHaveLength(1);

    // Click to open - mobile panel mounts, we get 2 Communities links (desktop + mobile)
    fireEvent.click(menuButton);
    expect(screen.getAllByRole('link', { name: /communities/i })).toHaveLength(2);

    // Click to close - mobile panel unmounts, back to 1
    fireEvent.click(menuButton);
    expect(screen.getAllByRole('link', { name: /communities/i })).toHaveLength(1);
  });

  it('should close menu on Escape key', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </MemoryRouter>
    );

    const menuButton = screen.getByLabelText(/toggle menu/i);
    fireEvent.click(menuButton);
    expect(screen.getAllByRole('link', { name: /communities/i })).toHaveLength(2);

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Menu should be closed
    expect(screen.getAllByRole('link', { name: /communities/i })).toHaveLength(1);
  });
});
