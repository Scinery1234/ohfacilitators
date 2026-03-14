import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock auth API so tests don't hit the network
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn().mockImplementation(() => {
    const token = typeof localStorage !== 'undefined' && localStorage.getItem('token');
    if (token) {
      const isHost = token.includes('host');
      return Promise.resolve({
        user: {
          id: isHost ? 'demo-host-1' : 'demo-user-1',
          email: isHost ? 'host@example.com' : 'user@example.com',
          fullName: isHost ? 'Demo Host' : 'Demo User',
          role: isHost ? 'host' : 'user',
        },
      });
    }
    return Promise.reject(new Error('No token'));
  }),
}));

// Mock me/counts for Navbar
vi.mock('@/api/me', () => ({
  getNavCounts: vi.fn().mockResolvedValue({ communities: 0, places: 0, events: 0, schedule: 0 }),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
