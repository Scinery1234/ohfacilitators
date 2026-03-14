import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicPlaces } from '@/api/places';
import { getPublicEvents } from '@/api/events';
import { getSpaceImage, getEventImage } from '@/lib/listingImages';
import PlacesMap from '@/components/PlacesMap';
import Button from '@/components/ui/Button';
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';

function mockSpaceToPlace(s) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    address: s.address || s.locationArea,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    creatorName: s.host?.name,
    createdBy: s.host?.id,
  };
}
function parseMockTime(t) {
  if (!t) return '12:00:00';
  const am = /^(\d{1,2}):(\d{2})\s*AM$/i.exec(t);
  if (am) {
    const h = Number(am[1]) === 12 ? 0 : Number(am[1]);
    return `${String(h).padStart(2, '0')}:${am[2]}:00`;
  }
  const pm = /^(\d{1,2}):(\d{2})\s*PM$/i.exec(t);
  if (pm) {
    const h = Number(pm[1]) === 12 ? 12 : Number(pm[1]) + 12;
    return `${String(h).padStart(2, '0')}:${pm[2]}:00`;
  }
  return '12:00:00';
}
function mockEventToDisplay(e) {
  const timeStr = e.date ? `${e.date}T${parseMockTime(e.time)}` : null;
  const d = timeStr ? new Date(timeStr) : new Date();
  const startAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  return {
    id: e.id,
    title: e.title,
    startAt,
    placeTitle: e.location,
    creatorName: e.host?.name,
  };
}

const CATEGORIES = ['All'];

function formatEventDate(startAt) {
  if (!startAt) return '';
  const d = new Date(startAt);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatEventTime(startAt) {
  if (!startAt) return '';
  return new Date(startAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function Explore() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'all'; // all | spaces | events

  const [selectedType, setSelectedType] = useState(typeParam || 'all');
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state when URL params change (e.g. from home page path selector)
  useEffect(() => {
    const t = searchParams.get('type') || 'all';
    setSelectedType(t);
  }, [searchParams]);

  // Show mocks immediately for instant UI; fetch API in background and merge
  useEffect(() => {
    setError(null);
    const type = typeParam;
    const mockPlaces = mockSpaces.map(mockSpaceToPlace);
    const mockEventsList = mockEvents.map(mockEventToDisplay);

    if (type === 'spaces') {
      setPlaces(mockPlaces);
      setLoading(false);
      setApiLoading(true);
      getPublicPlaces()
        .then((r) => setPlaces([...(r.places ?? []), ...mockPlaces]))
        .catch(() => {})
        .finally(() => setApiLoading(false));
      return;
    }
    if (type === 'events') {
      setEvents(mockEventsList);
      setLoading(false);
      setApiLoading(true);
      getPublicEvents()
        .then((r) => setEvents([...(r.events ?? []), ...mockEventsList]))
        .catch(() => {})
        .finally(() => setApiLoading(false));
      return;
    }
    // type === 'all': show mocks immediately, fetch both in parallel
    setPlaces(mockPlaces);
    setEvents(mockEventsList);
    setLoading(false);
    setApiLoading(true);
    Promise.all([
      getPublicPlaces().then((r) => [...(r.places ?? []), ...mockPlaces]).catch(() => mockPlaces),
      getPublicEvents().then((r) => [...(r.events ?? []), ...mockEventsList]).catch(() => mockEventsList),
    ])
      .then(([p, e]) => { setPlaces(p); setEvents(e); })
      .finally(() => setApiLoading(false));
  }, [typeParam]);

  const handleTypeChange = (t) => {
    setSelectedType(t);
    setSearchParams((p) => ({ ...Object.fromEntries(p), type: t }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
          Discover
        </h1>
        <p className="mt-2 text-stone-600">
          Events, spaces, and facilitators open to the public. Or explore communities for more.
        </p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-8 border-b border-stone-200">
        {['all', 'spaces', 'events'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
              selectedType === t
                ? 'bg-stone-900 text-white border-b-2 border-stone-900'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {t === 'all' ? 'All' : t === 'spaces' ? 'Spaces' : 'Experiences'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-stone-500">Loading listings…</div>
      )}

      {apiLoading && !loading && (
        <p className="mb-6 text-center text-sm text-stone-500">Loading more listings…</p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 mb-8">
          {error}
        </div>
      )}

      {/* Spaces grid - real data from API */}
      {!loading && (selectedType === 'all' || selectedType === 'spaces') && places.length > 0 && (
        <section className="mb-14">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-display font-semibold text-stone-900">Spaces</h2>
            <div className="flex flex-wrap gap-2">
              {user && (
                <Link to="/my-places">
                  <Button variant="secondary" className="text-sm">My venues</Button>
                </Link>
              )}
              <Link to="/list-place">
                <Button variant="primary" className="text-sm">List your own</Button>
              </Link>
            </div>
          </div>
          {places.some((p) => p.lat != null && p.lng != null) && (
            <div className="mb-8">
              <PlacesMap places={places} title="Map of spaces" height={300} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {places.map((place) => (
              <Link
                key={place.id}
                to={`/places/${place.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={place.imageUrl || getSpaceImage({ id: place.id, category: 'Space' })}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                    {place.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {place.creatorName ? `by ${place.creatorName}` : ''}
                    {place.address ? ` · ${place.address}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Events grid - real data from API */}
      {!loading && (selectedType === 'all' || selectedType === 'events') && events.length > 0 && (
        <section>
          <h2 className="text-xl font-display font-semibold text-stone-900 mb-6">Experiences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/listings/event/${event.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
              >
                <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                  <img
                    src={getEventImage(event)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatEventDate(event.startAt)} · {formatEventTime(event.startAt)}
                    {event.placeTitle ? ` · ${event.placeTitle}` : ''}
                    {event.communityName ? ` · ${event.communityName}` : ''}
                    {event.creatorName ? ` · ${event.creatorName}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && ((selectedType === 'spaces' && places.length === 0) ||
        (selectedType === 'events' && events.length === 0) ||
        (selectedType === 'all' && places.length === 0 && events.length === 0)) && (
        <div className="text-center py-16 rounded-2xl border border-stone-200 bg-stone-50">
          <p className="text-stone-600">No listings yet. Create a place or event to see it here.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/list-place">
              <Button variant="primary" className="text-sm">List a place</Button>
            </Link>
            <Link to="/host-event">
              <Button variant="outline" className="text-sm">Host an event</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
