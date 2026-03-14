/**
 * Smoke tests: render each page to ensure no crash.
 * Does not assert deep functionality—only that the page renders.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as ReactRouter from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { getMockCommunityDetail } from '@/mocks/communities';
import { getMockEventDetail } from '@/mocks/events';
import { getMockVenueDetail } from '@/mocks/venues';

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, useLoaderData: vi.fn() };
});

import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Explore from '@/pages/Explore';
import Communities from '@/pages/Communities';
import ContactUs from '@/pages/ContactUs';
import About from '@/pages/About';
import NotFound from '@/pages/NotFound';
import BecomeHost from '@/pages/BecomeHost';
import Dashboard from '@/pages/Dashboard';
import MyCommunities from '@/pages/MyCommunities';
import MyPlaces from '@/pages/MyPlaces';
import MyEvents from '@/pages/MyEvents';
import Profile from '@/pages/Profile';
import HostEvent from '@/pages/HostEvent';
import ListPlace from '@/pages/ListPlace';
import StartCommunity from '@/pages/StartCommunity';
import PlaceDetail from '@/pages/PlaceDetail';
import CommunityDetail from '@/pages/CommunityDetail';
import ListingDetail from '@/pages/ListingDetail';
import VenueDetail from '@/pages/VenueDetail';
import MyBookings from '@/pages/MyBookings';
import HostDashboard from '@/pages/HostDashboard';
import MySchedule from '@/pages/MySchedule';
import Messages from '@/pages/Messages';
import PlaceEdit from '@/pages/PlaceEdit';
import CommunityEdit from '@/pages/CommunityEdit';
import FacilitateEvent from '@/pages/FacilitateEvent';
import FAQ from '@/pages/FAQ';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import CommunityGuidelines from '@/pages/CommunityGuidelines';
import SafetyAndTrust from '@/pages/SafetyAndTrust';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

function renderAt(Component, route = '/', options = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Component />
      </AuthProvider>
    </MemoryRouter>,
    options
  );
}

describe('Pages smoke tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Public pages (no auth)', () => {
    it('Home renders', () => {
      renderAt(Home, '/');
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('Login renders', () => {
      renderAt(Login, '/login');
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('Register renders', () => {
      renderAt(Register, '/register');
      expect(screen.getByRole('heading', { name: /create.*account|sign up/i })).toBeInTheDocument();
    });

    it('Explore renders', () => {
      renderAt(Explore, '/explore');
      expect(screen.getByRole('heading', { level: 1 }) || document.body).toBeTruthy();
    });

    it('Communities renders', async () => {
      renderAt(Communities, '/communities');
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('ContactUs renders', () => {
      renderAt(ContactUs, '/contact-us');
      expect(document.body.textContent).toMatch(/contact|get in touch|message/i);
    });

    it('About renders', () => {
      renderAt(About, '/about');
      expect(document.body.textContent).toBeTruthy();
    });

    it('BecomeHost renders', () => {
      renderAt(BecomeHost, '/become-host');
      expect(document.body.textContent).toBeTruthy();
    });

    it('NotFound renders', () => {
      renderAt(NotFound, '/not-a-route');
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    });

    it('FAQ renders', () => {
      renderAt(FAQ, '/faq');
      expect(document.body.textContent).toBeTruthy();
    });

    it('PrivacyPolicy renders', () => {
      renderAt(PrivacyPolicy, '/privacy');
      expect(document.body.textContent).toBeTruthy();
    });

    it('TermsAndConditions renders', () => {
      renderAt(TermsAndConditions, '/terms');
      expect(document.body.textContent).toBeTruthy();
    });

    it('CommunityGuidelines renders', () => {
      renderAt(CommunityGuidelines, '/community-guidelines');
      expect(document.body.textContent).toBeTruthy();
    });

    it('SafetyAndTrust renders', () => {
      renderAt(SafetyAndTrust, '/safety-trust');
      expect(document.body.textContent).toBeTruthy();
    });
  });

  describe('Protected pages (with demo auth)', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'demo:host');
      localStorageMock.setItem('demoUser', JSON.stringify({
        id: 'demo-host-1',
        email: 'demo@host.example',
        fullName: 'Demo Host',
        role: 'host',
      }));
    });

    it('Dashboard renders', async () => {
      renderAt(Dashboard, '/dashboard');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      });
    });

    it('MyCommunities renders', async () => {
      renderAt(MyCommunities, '/my-communities');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my communities/i })).toBeInTheDocument();
      });
    });

    it('MyPlaces renders', async () => {
      renderAt(MyPlaces, '/my-places');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my places/i })).toBeInTheDocument();
      });
    });

    it('MyEvents renders', async () => {
      renderAt(MyEvents, '/my-events');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my events/i })).toBeInTheDocument();
      });
    });

    it('Profile renders', async () => {
      renderAt(Profile, '/profile');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
      });
    });

    it('HostEvent form renders', async () => {
      renderAt(HostEvent, '/host-event');
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /host an event/i })).toBeInTheDocument();
      });
    });

    it('ListPlace renders', async () => {
      renderAt(ListPlace, '/list-place');
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/list a place|create.*place|add.*place/i);
      });
    });

    it('StartCommunity renders', async () => {
      renderAt(StartCommunity, '/start-community');
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/start a community|create.*community/i);
      });
    });

    it('HostDashboard renders', async () => {
      renderAt(HostDashboard, '/host');
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('MyBookings renders', async () => {
      renderAt(MyBookings, '/bookings');
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/booking|reservation/i);
      });
    });

    it('MySchedule renders', async () => {
      renderAt(MySchedule, '/my-schedule');
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('Messages renders', async () => {
      renderAt(Messages, '/messages');
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('FacilitateEvent renders', async () => {
      renderAt(FacilitateEvent, '/facilitate-event');
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });
  });

  describe('Detail pages (with params)', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'demo:host');
      localStorageMock.setItem('demoUser', JSON.stringify({
        id: 'demo-host-1',
        email: 'demo@host.example',
        fullName: 'Demo Host',
        role: 'host',
      }));
    });

    it('PlaceDetail renders for demo place', async () => {
      render(
        <MemoryRouter initialEntries={['/places/space-demo-1']}>
          <AuthProvider>
            <Routes>
              <Route path="/places/:id" element={<PlaceDetail />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/demo host studio/i)).toBeInTheDocument();
      });
    });

    it('CommunityDetail renders for demo community', async () => {
      vi.mocked(ReactRouter.useLoaderData).mockReturnValue(getMockCommunityDetail('demo-community'));
      render(
        <MemoryRouter initialEntries={['/communities/demo-community']}>
          <AuthProvider>
            <Routes>
              <Route path="/communities/:slug" element={<CommunityDetail />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /demo community/i })).toBeInTheDocument();
      });
    });

    it('ListingDetail (event) renders for demo event', async () => {
      vi.mocked(ReactRouter.useLoaderData).mockReturnValue(getMockEventDetail('event-demo-1'));
      render(
        <MemoryRouter initialEntries={['/listings/event/event-demo-1']}>
          <AuthProvider>
            <Routes>
              <Route path="/listings/:type/:id" element={<ListingDetail />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/demo welcome workshop/i)).toBeInTheDocument();
      });
    });

    it('VenueDetail renders for demo venue', async () => {
      vi.mocked(ReactRouter.useLoaderData).mockReturnValue(getMockVenueDetail('space-demo-1'));
      render(
        <MemoryRouter initialEntries={['/venues/space-demo-1']}>
          <AuthProvider>
            <Routes>
              <Route path="/venues/:id" element={<VenueDetail />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/demo host studio|cozy art studio/i);
      });
    });
  });

  describe('Edit pages (with params)', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'demo:host');
      localStorageMock.setItem('demoUser', JSON.stringify({
        id: 'demo-host-1',
        email: 'demo@host.example',
        fullName: 'Demo Host',
        role: 'host',
      }));
    });

    it('PlaceEdit renders', async () => {
      render(
        <MemoryRouter initialEntries={['/places/space-demo-1/edit']}>
          <AuthProvider>
            <Routes>
              <Route path="/places/:id/edit" element={<PlaceEdit />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });

    it('CommunityEdit renders', async () => {
      render(
        <MemoryRouter initialEntries={['/communities/demo-community/edit']}>
          <AuthProvider>
            <Routes>
              <Route path="/communities/:slug/edit" element={<CommunityEdit />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });
  });
});
