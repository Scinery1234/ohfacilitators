import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getExploreData, getMyCommunities } from '@/api/communities';
import { getMyEvents } from '@/api/events';
import { getMyPlaces } from '@/api/places';
import { getMyBooking } from '@/api/bookings';
import { getSpaceImage, getEventImage, imgYoga, getCommunityImage } from '@/lib/listingImages';
import { getHostAvatarUrl, getFacilitatorAvatarUrl } from '@/lib/avatars';
import EventsCalendar from '@/components/EventsCalendar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { mockCommunities } from '@/mocks/communities';
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';
import { mockFacilitators } from '@/mocks/facilitators';

const TAB_IDS = { communities: 'communities', venues: 'spaces', events: 'events', calendar: 'calendar', hosts: 'hosts', facilitators: 'facilitators' };

// Slug or id for community link — use slug when present, else id (API supports id lookup for null-slug communities)
function getCommunitySlug(c) {
  if (c?.slug) return c.slug;
  return c?.id || '';
}

// Map mock community to API shape for display
function mockCommunityToDisplay(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    visibility: 'public',
    locationArea: c.locationArea || null,
    type: c.type || 'open',
    imageUrl: null,
  };
}
// Map mock space to place shape (createdBy/creatorName for hosts)
function mockSpaceToPlace(s) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    address: s.address || s.locationArea,
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
    createdBy: e.host?.id || e.createdBy || e.proposed_by,
    date: e.date || (startAt ? startAt.slice(0, 10) : ''),
    time: e.time ?? null,
    location: e.location ?? null,
    locationArea: e.locationArea ?? null,
    price: e.price ?? null,
  };
}

function formatEventDate(startAt) {
  if (!startAt) return '';
  return new Date(startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Communities() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'communities';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => TAB_IDS[tabParam] ?? tabParam ?? 'communities');
  const [communities, setCommunities] = useState([]);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [myHostedEvents, setMyHostedEvents] = useState([]);
  const [myHostedPlaces, setMyHostedPlaces] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(true);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [communitiesPage, setCommunitiesPage] = useState(1);
  const [totalCommunityPages, setTotalCommunityPages] = useState(1);

  useEffect(() => {
    const t = searchParams.get('tab') || 'communities';
    setActiveTab(TAB_IDS[t] ?? t ?? 'communities');
  }, [searchParams]);

  // Show mocks immediately for instant UI; fetch API in background and merge
  useEffect(() => {
    const mockList = mockCommunities.map(mockCommunityToDisplay);
    const mockPlacesList = mockSpaces.map(mockSpaceToPlace);
    const mockEventsList = mockEvents.map(mockEventToDisplay);

    setCommunities(mockList);
    setPlaces(mockPlacesList);
    setEvents(mockEventsList);
    setPlacesLoaded(true);
    setEventsLoaded(true);
    setLoading(false);
    setApiLoading(true);

    const exploreData = getExploreData()
      .then((r) => ({
        communities: r.communities ?? [],
        places: r.places ?? [],
        events: r.events ?? [],
      }))
      .catch(() => ({ communities: [], places: [], events: [] }));

    const myCommunities = user ? getMyCommunities().then((r) => r.communities ?? []).catch(() => []) : Promise.resolve([]);
    
    // Fetch user's hosted events and places
    const myHostedData = user
      ? Promise.all([
          getMyEvents().then((r) => r.events ?? []).catch(() => []),
          getMyPlaces().then((r) => r.places ?? []).catch(() => []),
          getMyBooking().then((r) => {
            const bookings = r?.bookings ?? r ?? [];
            return Array.isArray(bookings) ? bookings : [];
          }).catch(() => []),
        ])
      : Promise.resolve([[], [], []]);

    Promise.all([exploreData, myCommunities, myHostedData]).then(([explore, my, [hostedEvents, hostedPlaces, bookings]]) => {
      const byId = new Map(explore.communities.map((c) => [c.id, c]));
      my.forEach((c) => { if (!byId.has(c.id)) byId.set(c.id, { ...c, _isMine: true }); });
      const apiList = [...byId.values()].sort((a, b) => (b._isMine ? 1 : 0) - (a._isMine ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setCommunities([...apiList, ...mockList]);
      setPlaces([...explore.places, ...mockPlacesList]);
      setEvents([...explore.events, ...mockEventsList]);
      setMyHostedEvents(hostedEvents);
      setMyHostedPlaces(hostedPlaces);
      setMyBookings(bookings);
    }).finally(() => setApiLoading(false));
  }, [user]);

  useEffect(() => {
    if ((activeTab === 'spaces' || activeTab === 'hosts') && !placesLoading) {
      // Places already loaded from explore endpoint, skip lazy loading
      return;
    }
  }, [activeTab, placesLoaded, placesLoading]);

  useEffect(() => {
    if ((activeTab === 'events' || activeTab === 'calendar') && !eventsLoading) {
      // Events already loaded from explore endpoint, skip lazy loading
      return;
    }
  }, [activeTab, eventsLoaded, eventsLoading]);

  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities;
    const q = searchQuery.toLowerCase();
    return communities.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }, [communities, searchQuery]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.placeTitle || '').toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const filteredSpaces = useMemo(() => {
    if (!searchQuery.trim()) return places;
    const q = searchQuery.toLowerCase();
    return places.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
    );
  }, [places, searchQuery]);

  // Organize events by relationship: hosted, attending, others
  const organizedEvents = useMemo(() => {
    if (!user) {
      return { hosted: [], attending: [], others: filteredEvents };
    }

    const userId = user.id;
    const hostedIds = new Set(myHostedEvents.map((e) => e.id));
    // Also check createdBy/proposed_by for events not in myHostedEvents but created by user
    const alsoHostedIds = new Set(
      filteredEvents
        .filter((e) => {
          const creatorId = e.createdBy || e.proposed_by || e.creatorId;
          return creatorId === userId;
        })
        .map((e) => e.id)
    );
    const allHostedIds = new Set([...hostedIds, ...alsoHostedIds]);
    
    const attendingIds = new Set(
      myBookings
        .filter((b) => b.listingType === 'event' && b.status !== 'cancelled')
        .map((b) => b.listingId)
    );

    const hosted = filteredEvents.filter((e) => allHostedIds.has(e.id));
    const attending = filteredEvents.filter(
      (e) => !allHostedIds.has(e.id) && attendingIds.has(e.id)
    );
    const others = filteredEvents.filter(
      (e) => !allHostedIds.has(e.id) && !attendingIds.has(e.id)
    );

    return { hosted, attending, others };
  }, [filteredEvents, user, myHostedEvents, myBookings]);

  // Organize spaces by relationship: hosted, others
  const organizedSpaces = useMemo(() => {
    if (!user) {
      return { hosted: [], others: filteredSpaces };
    }

    const userId = user.id;
    const hostedIds = new Set(myHostedPlaces.map((p) => p.id));
    // Also check createdBy for places not in myHostedPlaces but created by user
    const alsoHostedIds = new Set(
      filteredSpaces
        .filter((p) => {
          const creatorId = p.createdBy || p.creatorId;
          return creatorId === userId;
        })
        .map((p) => p.id)
    );
    const allHostedIds = new Set([...hostedIds, ...alsoHostedIds]);

    const hosted = filteredSpaces.filter((p) => allHostedIds.has(p.id));
    const others = filteredSpaces.filter((p) => !allHostedIds.has(p.id));

    return { hosted, others };
  }, [filteredSpaces, user, myHostedPlaces]);

  const featuredHosts = useMemo(() => {
    const byCreator = new Map();
    places.forEach((p) => {
      if (p.createdBy && p.creatorName) byCreator.set(p.createdBy, { id: p.createdBy, name: p.creatorName });
    });
    return [...byCreator.values()].slice(0, 6);
  }, [places]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
      {/* Search bar */}
      <div className="mb-10 rounded-2xl border border-stone-200 bg-white shadow-sm p-4 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-stone-900 tracking-tight mb-4">
          Explore communities
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search communities, events, spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 pl-10 pr-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs to jump between sections */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-200 pt-4 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: 'communities', label: 'Communities' },
            { id: 'venues', label: 'Venues' },
            { id: 'events', label: 'Events' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'hosts', label: 'Hosts' },
            { id: 'facilitators', label: 'Facilitators' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                const tabValue = id === 'venues' ? 'spaces' : id;
                setActiveTab(tabValue);
                const tabKey = id === 'venues' ? 'venues' : id === 'spaces' ? 'venues' : id;
                setSearchParams((p) => ({ ...Object.fromEntries(p), tab: tabKey }));
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                activeTab === (id === 'venues' ? 'spaces' : id)
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Communities section */}
      {activeTab === 'communities' && (
      <section className="mb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight">
            Communities
          </h2>
          <div className="flex flex-wrap gap-2">
            {user && (
              <Link to="/my-communities">
                <Button variant="secondary" className="text-sm">My communities</Button>
              </Link>
            )}
            <Link to="/start-community">
              <Button variant="primary" className="text-sm">List your own</Button>
            </Link>
          </div>
        </div>
        {loading ? (
          <p className="text-stone-500 py-8">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredCommunities.map((community) => (
                <Link
                  key={community.id}
                  to={`/communities/${getCommunitySlug(community)}`}
                  className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img
                      src={getCommunityImage(community)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                      {community.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500 line-clamp-2">{community.description || '—'}</p>
                    {community.tags && community.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {community.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {(community.locationArea || community.type) && (
                      <p className="mt-1 text-xs text-stone-400">
                        {community.locationArea}
                        {community.locationArea && community.type && ' · '}
                        {community.type === 'open' && 'Open'}
                        {community.type === 'approval' && 'Approval required'}
                        {community.type === 'closed' && 'Invite only'}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {filteredCommunities.length === 0 && (
              <p className="text-stone-500 py-8 text-center">No communities match your search.</p>
            )}
            {apiLoading && (
              <p className="mt-6 text-center text-sm text-stone-500">Loading more communities…</p>
            )}
            {/* Pagination controls */}
            {totalCommunityPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setCommunitiesPage(Math.max(1, communitiesPage - 1))}
                  disabled={communitiesPage === 1}
                  className="px-4 py-2 rounded-lg bg-stone-100 text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-stone-600">
                  Page {communitiesPage} of {totalCommunityPages}
                </span>
                <button
                  onClick={() => setCommunitiesPage(Math.min(totalCommunityPages, communitiesPage + 1))}
                  disabled={communitiesPage === totalCommunityPages}
                  className="px-4 py-2 rounded-lg bg-stone-100 text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
      )}

      {/* Calendar section */}
      {activeTab === 'calendar' && (
      <section className="mb-14">
        <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-6">
          Event calendar
        </h2>
        <p className="text-stone-600 text-sm mb-6">
          Browse events by date. Click an event to see details.
        </p>
        {events.length === 0 && eventsLoading ? (
          <p className="text-stone-500 py-8">Loading…</p>
        ) : (
          <>
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <EventsCalendar events={filteredEvents.map((e) => {
              const d = e.startAt ? new Date(e.startAt) : null;
              const validD = d && !Number.isNaN(d.getTime()) ? d : null;
              return {
                ...e,
                date: e.date || (validD ? validD.toISOString().slice(0, 10) : ''),
                time: e.time || (validD ? validD.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''),
                location: e.location ?? e.placeTitle ?? '',
                locationArea: e.locationArea ?? '',
                price: e.price ?? 0,
              };
            })} />
            </div>
            {apiLoading && (
              <p className="mt-6 text-center text-sm text-stone-500">Loading more events…</p>
            )}
          </>
        )}
      </section>
      )}

      {/* Events section */}
      {activeTab === 'events' && (
      <section className="mb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight">
            Events
          </h2>
          <Link to="/host-event">
            <Button variant="primary" className="text-sm">Create Event</Button>
          </Link>
        </div>
        {eventsLoading ? (
          <p className="text-stone-500 py-8">Loading…</p>
        ) : (
          <>
            {/* Create Your Own Card */}
            {user && (
              <Card className="mb-8 border-2 border-primary-200/40 bg-primary-50/30">
                <Link to="/host-event" className="block">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-200/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-stone-900">Create Your Own Event</h3>
                      <p className="text-sm text-stone-600 mt-0.5">Host a workshop, gathering, or experience</p>
                    </div>
                    <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </Card>
            )}

            {/* Events You Host */}
            {user && organizedEvents.hosted.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Events You Host</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {organizedEvents.hosted.map((event) => (
                    <Link
                      key={event.id}
                      to={`/listings/event/${event.id}`}
                      className="group block rounded-2xl overflow-hidden border-2 border-primary-200/50 bg-white shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200"
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                        <img
                          src={getEventImage({ id: event.id, category: 'Event' })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                            You Host
                          </span>
                        </div>
                        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatEventDate(event.startAt)} · {event.startAt ? new Date(event.startAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}
                          {event.placeTitle ? ` · ${event.placeTitle}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Events You Attend */}
            {user && organizedEvents.attending.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Events You Attend</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {organizedEvents.attending.map((event) => (
                    <Link
                      key={event.id}
                      to={`/listings/event/${event.id}`}
                      className="group block rounded-2xl overflow-hidden border-2 border-blue-200/50 bg-white shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200"
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                        <img
                          src={getEventImage({ id: event.id, category: 'Event' })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            You Attend
                          </span>
                        </div>
                        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatEventDate(event.startAt)} · {event.startAt ? new Date(event.startAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}
                          {event.placeTitle ? ` · ${event.placeTitle}` : ''}
                          {event.creatorName ? ` · ${event.creatorName}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Other Events */}
            {organizedEvents.others.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">
                  {user ? 'All Events' : 'Events'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {organizedEvents.others.slice(0, user ? 8 : 12).map((event) => (
                    <Link
                      key={event.id}
                      to={`/listings/event/${event.id}`}
                      className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                        <img
                          src={getEventImage({ id: event.id, category: 'Event' })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatEventDate(event.startAt)} · {event.startAt ? new Date(event.startAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}
                          {event.placeTitle ? ` · ${event.placeTitle}` : ''}
                          {event.creatorName ? ` · ${event.creatorName}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-stone-500 mb-4">No events match your search.</p>
                {user && (
                  <Link to="/host-event">
                    <Button variant="primary">Create Your First Event</Button>
                  </Link>
                )}
              </div>
            )}
            {apiLoading && (
              <p className="mt-6 text-center text-sm text-stone-500">Loading more events…</p>
            )}
          </>
        )}
      </section>
      )}

      {/* Venues (spaces) section */}
      {activeTab === 'spaces' && (
      <section className="mb-14">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-2">
              Venues
            </h2>
            <p className="text-stone-600 text-sm">
              Studios, workshops, and community spaces—each linked to communities and events.
            </p>
          </div>
          <Link to="/list-place">
            <Button variant="primary" className="text-sm">List Your Own</Button>
          </Link>
        </div>
        {placesLoading ? (
          <p className="text-stone-500 py-8">Loading…</p>
        ) : (
          <>
            {/* Create Your Own Card */}
            {user && (
              <Card className="mb-8 border-2 border-primary-200/40 bg-primary-50/30">
                <Link to="/list-place" className="block">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-200/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-stone-900">Create Your Own Venue</h3>
                      <p className="text-sm text-stone-600 mt-0.5">List your studio, workshop, or community space</p>
                    </div>
                    <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </Card>
            )}

            {/* Venues You Host */}
            {user && organizedSpaces.hosted.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Venues You Host</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {organizedSpaces.hosted.map((place) => (
                    <Link
                      key={place.id}
                      to={`/venues/${place.id}`}
                      className="group block rounded-2xl overflow-hidden border-2 border-primary-200/50 bg-white shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                        <img
                          src={place.imageUrl || getSpaceImage({ id: place.id, category: 'Space' })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                            You Host
                          </span>
                        </div>
                        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                          {place.title}
                        </h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {place.address || place.creatorName ? `${place.creatorName ? `by ${place.creatorName}` : ''}${place.address ? ` · ${place.address}` : ''}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Other Venues */}
            {organizedSpaces.others.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">
                  {user ? 'All Venues' : 'Venues'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {organizedSpaces.others.slice(0, user ? 8 : 12).map((place) => (
                    <Link
                      key={place.id}
                      to={`/venues/${place.id}`}
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
                        <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
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
              </div>
            )}

            {filteredSpaces.length === 0 && (
              <div className="text-center py-12">
                <p className="text-stone-500 mb-4">No spaces match your search.</p>
                {user && (
                  <Link to="/list-place">
                    <Button variant="primary">Create Your First Venue</Button>
                  </Link>
                )}
              </div>
            )}
            {apiLoading && (
              <p className="mt-6 text-center text-sm text-stone-500">Loading more venues…</p>
            )}
          </>
        )}
      </section>
      )}

      {/* Featured hosts (creators who listed places) */}
      {activeTab === 'hosts' && (
      <section>
        <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-6">
          People with listings
        </h2>
        {placesLoading ? (
          <p className="text-stone-500 py-8">Loading…</p>
        ) : featuredHosts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredHosts.map((host) => (
              <div
                key={host.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 text-center"
              >
                <img
                  src={getHostAvatarUrl(host.id, 80)}
                  alt=""
                  className="mx-auto h-14 w-14 rounded-full object-cover border border-stone-200"
                />
                <p className="mt-2 font-semibold text-stone-900 text-sm">{host.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">Host</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 py-8">No hosts yet.</p>
        )}
      </section>
      )}

      {/* Facilitators */}
      {activeTab === 'facilitators' && (
      <section>
        <h2 className="font-display text-2xl font-semibold text-stone-900 tracking-tight mb-6">
          Facilitators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockFacilitators.map((fac) => (
              <Link
                key={fac.id}
                to={`/facilitators/${fac.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={getFacilitatorAvatarUrl(fac.id, 400)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">
                    {fac.name}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">{fac.type}</p>
                  <p className="mt-2 text-sm text-stone-600 line-clamp-2">{fac.description || '—'}</p>
                </div>
              </Link>
            ))}
        </div>
      </section>
      )}
    </div>
  );
}
