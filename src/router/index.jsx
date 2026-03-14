import { createBrowserRouter } from 'react-router-dom';
import { getCommunityDetail } from '@/api/communities';
import { getPlace } from '@/api/places';
import { getEvent } from '@/api/events';
import { getMockCommunityDetail } from '@/mocks/communities';
import { getMockVenueDetail } from '@/mocks/venues';
import { getMockEventDetail } from '@/mocks/events';
import Layout from '@/components/layout/Layout';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Communities from '@/pages/Communities';
import CommunityDetail from '@/pages/CommunityDetail';
import CommunityEdit from '@/pages/CommunityEdit';
import HostDetail from '@/pages/HostDetail';
import FacilitatorDetail from '@/pages/FacilitatorDetail';
import VenueDetail from '@/pages/VenueDetail';
import ContactUs from '@/pages/ContactUs';
import About from '@/pages/About';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsAndConditions from '@/pages/TermsAndConditions';
import FAQ from '@/pages/FAQ';
import CommunityGuidelines from '@/pages/CommunityGuidelines';
import SafetyAndTrust from '@/pages/SafetyAndTrust';
import ListingDetail from '@/pages/ListingDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import BecomeHost from '@/pages/BecomeHost';
import MyBookings from '@/pages/MyBookings';
import HostDashboard from '@/pages/HostDashboard';
import MyPlaces from '@/pages/MyPlaces';
import MyEvents from '@/pages/MyEvents';
import MySchedule from '@/pages/MySchedule';
import PlaceDetail from '@/pages/PlaceDetail';
import PlaceEdit from '@/pages/PlaceEdit';
import Profile from '@/pages/Profile';
import Messages from '@/pages/Messages';
import ListPlace from '@/pages/ListPlace';
import HostEvent from '@/pages/HostEvent';
import FacilitateEvent from '@/pages/FacilitateEvent';
import StartCommunity from '@/pages/StartCommunity';
import MyCommunities from '@/pages/MyCommunities';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/common/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'communities', element: <Communities /> },
      {
        path: 'communities/:slug',
        element: <CommunityDetail />,
        loader: async ({ params }) => {
          const slug = params.slug;
          if (!slug) return null;
          const mock = getMockCommunityDetail(slug);
          if (mock) return mock;
          // For API communities, return null so navigation is instant; component fetches in background
          return null;
        },
      },
      { path: 'communities/:slug/edit', element: <CommunityEdit /> },
      { path: 'hosts/:id', element: <HostDetail /> },
      { path: 'facilitators/:id', element: <FacilitatorDetail /> },
      {
        path: 'venues/:id',
        element: <VenueDetail />,
        loader: async ({ params }) => {
          const id = params.id;
          if (!id) return null;
          const mock = getMockVenueDetail(id);
          if (mock) return mock;
          try {
            const data = await getPlace(id);
            return { place: data.place ?? data };
          } catch (e) {
            const fallback = getMockVenueDetail(id);
            if (fallback) return fallback;
            throw e;
          }
        },
      },
      { path: 'explore', element: <Explore /> },
      { path: 'contact-us', element: <ContactUs /> },
      { path: 'about', element: <About /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <TermsAndConditions /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'community-guidelines', element: <CommunityGuidelines /> },
      { path: 'safety-trust', element: <SafetyAndTrust /> },
      {
        path: 'listings/:type/:id',
        element: <ListingDetail />,
        loader: async ({ params }) => {
          const { type, id } = params;
          if (!id || type !== 'event') return null;
          const mock = getMockEventDetail(id);
          if (mock) return mock;
          try {
            const data = await getEvent(id);
            return { event: data.event ?? data };
          } catch (e) {
            const fallback = getMockEventDetail(id);
            if (fallback) return fallback;
            throw e;
          }
        },
      },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'become-host',
        element: <BecomeHost />,
      },
      {
        path: 'bookings',
        element: (
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'host',
        element: (
          <ProtectedRoute>
            <HostDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-communities',
        element: (
          <ProtectedRoute>
            <MyCommunities />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-places',
        element: (
          <ProtectedRoute>
            <MyPlaces />
          </ProtectedRoute>
        ),
      },
      {
        path: 'places/:id',
        element: (
          <ProtectedRoute>
            <PlaceDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'places/:id/edit',
        element: (
          <ProtectedRoute>
            <PlaceEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: 'list-place',
        element: (
          <ProtectedRoute>
            <ListPlace />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-events',
        element: (
          <ProtectedRoute>
            <MyEvents />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-schedule',
        element: (
          <ProtectedRoute>
            <MySchedule />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'messages',
        element: (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'host-event',
        element: (
          <ProtectedRoute>
            <HostEvent />
          </ProtectedRoute>
        ),
      },
      {
        path: 'facilitate-event',
        element: (
          <ProtectedRoute>
            <FacilitateEvent />
          </ProtectedRoute>
        ),
      },
      {
        path: 'start-community',
        element: (
          <ProtectedRoute>
            <StartCommunity />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default router;
