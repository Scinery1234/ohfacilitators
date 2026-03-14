import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyPlaces, getPlacesInMyCommunities } from '@/api/places';
import { getMyEvents } from '@/api/events';
import { getMySchedule } from '@/api/schedule';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PlacesMap from '@/components/PlacesMap';

export default function Dashboard() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [placesInCommunities, setPlacesInCommunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapScope, setMapScope] = useState('mine'); // 'mine' | 'communities'

  useEffect(() => {
    if (user) {
      Promise.all([
        getMyPlaces().then((d) => d.places || []).catch(() => []),
        getPlacesInMyCommunities().then((d) => d.places || []).catch(() => []),
        getMyEvents().then((d) => d.events || []).catch(() => []),
        getMySchedule().then((d) => d.schedule || []).catch(() => []),
      ]).then(([p, pc, e, s]) => {
        setPlaces(p);
        setPlacesInCommunities(pc);
        setEvents(e);
        setSchedule(s);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const mapPlaces = mapScope === 'mine' ? places : placesInCommunities;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          Welcome back, {user?.fullName || user?.email}
        </h1>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link to="/list-place">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">List a Place</h3>
            </div>
            <p className="text-stone-600 text-sm">Create a new place listing</p>
          </Card>
        </Link>

        <Link to="/host-event">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Host an Event</h3>
            </div>
            <p className="text-stone-600 text-sm">Create a new event</p>
          </Card>
        </Link>

        <Link to="/facilitate-event">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Share Your Gifts</h3>
            </div>
            <p className="text-stone-600 text-sm">Facilitate an event</p>
          </Card>
        </Link>

        <Link to="/start-community">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-200/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Start a Community</h3>
            </div>
            <p className="text-stone-600 text-sm">Create a new community</p>
          </Card>
        </Link>
      </div>

      {/* Places Map - scope changes view */}
      {(places.length > 0 || placesInCommunities.length > 0) && (
        <Card className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-stone-900">Places Map</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMapScope('mine')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mapScope === 'mine' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                My places
              </button>
              <button
                type="button"
                onClick={() => setMapScope('communities')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mapScope === 'communities' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Places in my communities
              </button>
            </div>
          </div>
          <PlacesMap places={mapPlaces} height={340} />
        </Card>
      )}

      {/* Your Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* My Places */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">My Places</h2>
            <Link to="/my-places" className="text-sm text-primary-200 hover:text-primary-300">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-stone-500 text-sm">Loading...</div>
          ) : places.length > 0 ? (
            <div className="space-y-3">
              {places.slice(0, 3).map((place) => (
                <Link key={place.id} to={`/places/${place.id}`} className="block p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                  <h3 className="font-semibold text-stone-900 text-sm">{place.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 capitalize">{place.visibility}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-stone-500 text-sm mb-3">No places yet</p>
              <Link to="/list-place">
                <Button variant="outline" className="text-sm">List a Place</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* My Events */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">My Events</h2>
            <Link to="/my-events" className="text-sm text-primary-200 hover:text-primary-300">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-stone-500 text-sm">Loading...</div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <Link key={event.id} to={`/listings/event/${event.id}`} className="block p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                  <h3 className="font-semibold text-stone-900 text-sm">{event.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {event.startAt ? new Date(event.startAt).toLocaleDateString() : 'No date'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-stone-500 text-sm mb-3">No events yet</p>
              <Link to="/host-event">
                <Button variant="outline" className="text-sm">Host an Event</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* My Schedule */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">My Schedule</h2>
            <Link to="/my-schedule" className="text-sm text-primary-200 hover:text-primary-300">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="text-stone-500 text-sm">Loading...</div>
          ) : schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule.slice(0, 3).map((item) => (
                <div key={`${item.type}-${item.id}`} className="p-3 rounded-xl border border-stone-200">
                  <h3 className="font-semibold text-stone-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {item.startAt ? new Date(item.startAt).toLocaleDateString() : 'No date'}
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-800">
                    {item.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-stone-500 text-sm">Nothing scheduled</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
