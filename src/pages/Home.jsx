import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyPlaces } from '@/api/places';
import { getMyEvents } from '@/api/events';
import { getMySchedule } from '@/api/schedule';
import { mockSpaces } from '@/mocks/spaces';
import { mockEvents } from '@/mocks/events';
import { mockCommunities, getGlobalEvents, getGlobalSpaces, getGlobalFacilitators } from '@/mocks/communities';
import { mockFacilitators } from '@/mocks/facilitators';
import {
  getSpaceImage,
  getEventImage,
  imgArt,
  imgYoga,
  imgWorkshop,
  imgGarden,
} from '@/lib/listingImages';
import { getHostAvatarUrl, getFacilitatorAvatarUrl } from '@/lib/avatars';
import heroImage from '@/assets/pexels-polina-zimmerman-3747468.jpg';
import Card from '@/components/ui/Card';

const CATEGORIES = [
  { slug: 'creative', label: 'Creative', image: imgArt, description: 'Studios & workshops' },
  { slug: 'wellness', label: 'Wellness', image: imgYoga, description: 'Yoga, meditation & rest' },
  { slug: 'learning', label: 'Learning', image: imgWorkshop, description: 'Study & skills' },
  { slug: 'social', label: 'Social', image: imgGarden, description: 'Gatherings & community' },
  { slug: 'movement', label: 'Movement', image: imgYoga, description: 'Movement & fitness' },
  { slug: 'outdoors', label: 'Outdoors', image: imgGarden, description: 'Nature & gardens' },
];

export default function Home() {
  const { user } = useAuth();
  const [myPlaces, setMyPlaces] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [mySchedule, setMySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        getMyPlaces().then((d) => d.places || []).catch(() => []),
        getMyEvents().then((d) => d.events || []).catch(() => []),
        getMySchedule().then((d) => d.schedule || []).catch(() => []),
      ]).then(([p, e, s]) => {
        setMyPlaces(p);
        setMyEvents(e);
        setMySchedule(s);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const globalEvents = getGlobalEvents(mockEvents, mockCommunities).slice(0, 3);
  const globalSpaces = getGlobalSpaces(mockSpaces, mockCommunities).slice(0, 4);
  const globalFacilitators = getGlobalFacilitators(mockFacilitators, mockCommunities).slice(0, 4);
  const featuredSpaces = mockSpaces.slice(0, 4);
  const featuredEvents = mockEvents.slice(0, 3);
  const hosts = [...new Map(mockSpaces.map((s) => [s.host.id, s.host])).values()].slice(0, 6);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      {/* Logged-in user's content */}
      {user && (
        <section className="bg-stone-50 border-b border-stone-200 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-display font-semibold text-stone-900 tracking-tight mb-6">
              Your Content
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">My Places</h3>
                  <Link to="/my-places" className="text-sm text-primary-200 hover:text-primary-300">
                    View all
                  </Link>
                </div>
                {loading ? (
                  <div className="text-stone-500 text-sm">Loading...</div>
                ) : myPlaces.length > 0 ? (
                  <div className="space-y-2">
                    {myPlaces.slice(0, 3).map((place) => (
                      <Link key={place.id} to={`/places/${place.id}`} className="block text-sm text-stone-700 hover:text-primary-200">
                        {place.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-stone-500 text-sm mb-2">No places yet</p>
                    <Link to="/list-place" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                      List a place →
                    </Link>
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">My Events</h3>
                  <Link to="/my-events" className="text-sm text-primary-200 hover:text-primary-300">
                    View all
                  </Link>
                </div>
                {loading ? (
                  <div className="text-stone-500 text-sm">Loading...</div>
                ) : myEvents.length > 0 ? (
                  <div className="space-y-2">
                    {myEvents.slice(0, 3).map((event) => (
                      <Link key={event.id} to={`/listings/event/${event.id}`} className="block text-sm text-stone-700 hover:text-primary-200">
                        {event.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="text-stone-500 text-sm mb-2">No events yet</p>
                    <Link to="/host-event" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                      Host an event →
                    </Link>
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">My Schedule</h3>
                  <Link to="/my-schedule" className="text-sm text-primary-200 hover:text-primary-300">
                    View all
                  </Link>
                </div>
                {loading ? (
                  <div className="text-stone-500 text-sm">Loading...</div>
                ) : mySchedule.length > 0 ? (
                  <div className="space-y-2">
                    {mySchedule.slice(0, 3).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="text-sm text-stone-700">
                        {item.title}
                        <span className="text-xs text-stone-500 ml-2">({item.role})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500 text-sm">Nothing scheduled</p>
                )}
              </Card>
            </div>
          </div>
        </section>
      )}
      {/* ——— Hero: one clear message + hero image ——— */}
      <section className="relative min-h-[85vh] flex flex-col justify-end overflow-hidden bg-stone-900">
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/95 via-stone-900/40 to-transparent" />
        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 pt-32 sm:pt-40">
          <div className="max-w-2xl">
            <h1 className="font-logo text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight">
              Find your place. Or share yours.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-stone-200 leading-relaxed">
              Book spaces and experiences—studios, workshops, wellness sessions, and community events. Or host your own and welcome people in.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/communities?tab=communities"
                className="inline-flex items-center justify-center rounded-xl bg-white text-stone-900 font-semibold px-8 py-4 text-base hover:bg-stone-100 transition-colors"
              >
                Explore communities
              </Link>
              {user ? (
                <Link
                  to="/list-place"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/80 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-colors"
                >
                  List a Place
                </Link>
              ) : (
                <Link
                  to="/list-place"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/80 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-colors"
                >
                  Create a listing
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ——— What brings you here? Visual path selector ——— */}
      <section className="bg-white border-b border-stone-200 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight text-center">
            What brings you here?
          </h2>
          <p className="mt-2 text-stone-600 text-center max-w-xl mx-auto">
            Choose the path that fits you—we&apos;ll take you right where you need to go.
          </p>

          {/* Find path — visual cards */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-stone-900">I&apos;m looking for something</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                to="/communities?tab=communities"
                className="group block rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-50 hover:border-stone-300 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-200">
                  <img src={imgGarden} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Communities</span>
                  <p className="text-xs text-stone-500 mt-0.5">Connect & join</p>
                </div>
              </Link>
              <Link
                to="/explore?type=events"
                className="group block rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-50 hover:border-stone-300 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-200">
                  <img src={imgYoga} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Events</span>
                  <p className="text-xs text-stone-500 mt-0.5">Workshops & experiences</p>
                </div>
              </Link>
              <Link
                to="/explore?type=spaces"
                className="group block rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-50 hover:border-stone-300 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-200">
                  <img src={imgArt} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Venues</span>
                  <p className="text-xs text-stone-500 mt-0.5">Studios & spaces</p>
                </div>
              </Link>
              <Link
                to="/explore"
                className="group block rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-50 hover:border-stone-300 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-200">
                  <img src={imgWorkshop} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Facilitators</span>
                  <p className="text-xs text-stone-500 mt-0.5">Coaches & healers</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Share path — visual cards */}
          <div className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-200 text-primary-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-stone-900">I have something to share</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Link
                to="/list-place"
                className="group block rounded-2xl overflow-hidden border-2 border-primary-200/40 bg-primary-100/30 hover:border-primary-200/60 hover:shadow-lg transition-all"
              >
                <div className="aspect-[3/2] overflow-hidden bg-stone-200">
                  <img src={imgArt} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">I have a space</span>
                  <p className="text-xs text-stone-500 mt-0.5">List your venue</p>
                </div>
              </Link>
              <Link
                to="/host-event"
                className="group block rounded-2xl overflow-hidden border-2 border-primary-200/40 bg-primary-100/30 hover:border-primary-200/60 hover:shadow-lg transition-all"
              >
                <div className="aspect-[3/2] overflow-hidden bg-stone-200">
                  <img src={imgYoga} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Host an event</span>
                  <p className="text-xs text-stone-500 mt-0.5">Workshops & gatherings</p>
                </div>
              </Link>
              <Link
                to="/facilitate-event"
                className="group block rounded-2xl overflow-hidden border-2 border-primary-200/40 bg-primary-100/30 hover:border-primary-200/60 hover:shadow-lg transition-all"
              >
                <div className="aspect-[3/2] overflow-hidden bg-stone-200">
                  <img src={imgWorkshop} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4 text-center">
                  <span className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors">Share as facilitator</span>
                  <p className="text-xs text-stone-500 mt-0.5">Offer your services</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Featured Venues ——— */}
      <section className="py-14 sm:py-16 bg-primary-100/30 border-b border-primary-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            Featured venues
          </h2>
          <p className="mt-2 text-stone-600 max-w-2xl">
            Studios, workshops, and community spaces where events happen. Each venue connects you to communities, hosts, and upcoming experiences.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockSpaces.slice(0, 4).map((space) => (
              <div
                key={space.id}
                className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-primary-200/50 transition-all duration-200"
              >
                <Link to={`/venues/${space.id}`} className="block">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={getSpaceImage(space)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-primary-200 uppercase tracking-wider">{space.category}</span>
                    <h3 className="mt-1 font-display font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                      {space.title}
                    </h3>
                    <p className="mt-2 text-stone-900 font-semibold">From ${space.price}<span className="text-stone-500 font-normal text-sm"> / session</span></p>
                  </div>
                </Link>
                <p className="px-4 pb-4 -mt-2 text-sm text-stone-500">
                  with <Link to={`/hosts/${space.host.id}`} className="hover:text-primary-200 transition-colors">{space.host.name}</Link>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/explore?type=spaces"
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 text-white font-semibold px-6 py-3 text-sm hover:bg-stone-800 transition-colors"
            >
              Browse all venues
            </Link>
            <Link
              to="/communities?tab=communities"
              className="inline-flex items-center justify-center rounded-xl border-2 border-stone-300 text-stone-700 font-semibold px-6 py-3 text-sm hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              Explore by community
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Discover: events, spaces, facilitators (open to public) ——— */}
      <section className="bg-stone-50 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            Discover — open to everyone
          </h2>
          <p className="mt-2 text-stone-600">Events, spaces, and facilitators you can book without joining a community.</p>

          {globalEvents.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {globalEvents.map((event) => (
                  <Link key={event.id} to={`/listings/event/${event.id}`} className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={getEventImage(event)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{event.title}</h4>
                      <p className="mt-1 text-sm text-stone-500">{event.date} · {event.host.name}</p>
                      <p className="mt-2 font-semibold text-stone-900">${event.price} / person</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {globalSpaces.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Spaces</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {globalSpaces.map((space) => (
                  <div key={space.id} className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all">
                    <Link to={`/venues/${space.id}`} className="block">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={getSpaceImage(space)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{space.title}</h4>
                        <p className="mt-2 font-semibold text-stone-900">From ${space.price} / session</p>
                      </div>
                    </Link>
                    <p className="px-4 pb-4 -mt-2 text-sm text-stone-500">
                      with <Link to={`/hosts/${space.host.id}`} className="hover:text-primary-200 transition-colors">{space.host.name}</Link>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {globalFacilitators.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Facilitators</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {globalFacilitators.map((fac) => (
                  <Link key={fac.id} to={`/facilitators/${fac.id}`} className="rounded-2xl border border-stone-200 bg-white p-4 text-center hover:border-stone-300 hover:shadow-sm transition-all block">
                    <img
                      src={getFacilitatorAvatarUrl(fac.id, 80)}
                      alt=""
                      className="mx-auto h-14 w-14 rounded-full object-cover border border-stone-200"
                    />
                    <p className="mt-2 font-semibold text-stone-900 text-sm">{fac.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{fac.type}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link to="/explore" className="text-sm font-semibold text-primary-200 hover:text-primary-300 transition-colors">
              Browse all discoverable content →
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Browse by category ——— */}
      <section className="bg-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            Browse by category
          </h2>
          <p className="mt-2 text-stone-600">Find spaces and experiences that match what you’re looking for.</p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to="/communities?tab=communities"
                className="group group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-md hover:border-stone-300 transition-all duration-200"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={cat.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3 text-center">
                  <span className="font-medium text-stone-900 group-hover:text-primary-200 transition-colors">{cat.label}</span>
                  <p className="text-xs text-stone-500 mt-0.5">{cat.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ——— More venues ——— */}
      <section className="py-14 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            More venues to explore
          </h2>
          <p className="mt-2 text-stone-600">Studios, rooms, and community spaces—each with their own communities, hosts, and events.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredSpaces.map((space) => (
              <div
                key={space.id}
                className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
              >
                <Link to={`/venues/${space.id}`} className="block">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={getSpaceImage(space)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-primary-200 uppercase tracking-wider">{space.category}</span>
                    <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                      {space.title}
                    </h3>
                    <p className="mt-2 text-stone-900 font-semibold">From ${space.price}<span className="text-stone-500 font-normal text-sm"> / session</span></p>
                  </div>
                </Link>
                <p className="px-4 pb-4 -mt-2 text-sm text-stone-500">
                  with <Link to={`/hosts/${space.host.id}`} className="hover:text-primary-200 transition-colors">{space.host.name}</Link>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/explore"
              className="inline-flex items-center justify-center rounded-xl border-2 border-stone-300 text-stone-700 font-semibold px-6 py-3 text-sm hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              View all spaces
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Upcoming experiences ——— */}
      <section className="py-14 sm:py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            Upcoming experiences
          </h2>
          <p className="mt-2 text-stone-600">Workshops, classes, and events hosted by your community.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <Link
                key={event.id}
                to={`/listings/event/${event.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-200"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={getEventImage(event)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <span className="text-xs font-medium text-primary-200 uppercase tracking-wider">{event.category}</span>
                  <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {event.date} · {event.time} · {event.host.name}
                  </p>
                  <p className="mt-2 text-stone-900 font-semibold">${event.price}<span className="text-stone-500 font-normal text-sm"> / person</span></p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/explore"
              className="inline-flex items-center justify-center rounded-xl border-2 border-stone-300 text-stone-700 font-semibold px-6 py-3 text-sm hover:border-stone-400 hover:bg-stone-50 transition-colors"
            >
              View all experiences
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Meet your hosts ——— (featured prominently above facilitators) */}
      <section className="py-14 sm:py-16 bg-stone-50 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
            Meet your hosts
          </h2>
          <p className="mt-2 text-stone-600 max-w-2xl">
            Real people who run spaces and host events. Connect with your community.
          </p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {hosts.map((host) => (
              <Link
                key={host.id}
                to={`/hosts/${host.id}`}
                className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:border-stone-300 hover:shadow-lg transition-all block"
              >
                <img
                  src={getHostAvatarUrl(host.id, 120)}
                  alt=""
                  className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-stone-200"
                />
                <p className="mt-4 font-semibold text-stone-900">{host.name}</p>
                <p className="text-sm text-stone-500 mt-0.5">Host</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/list-place"
              className="text-sm font-semibold text-primary-200 hover:text-primary-300 transition-colors"
            >
              Create a listing →
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Facilitators ——— (smaller section after hosts) */}
      <section className="py-12 sm:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">
            Facilitators
          </h2>
          <p className="mt-2 text-stone-600 text-sm">
            Coaches, therapists, oracle readers, sound healers, and more. Book sessions with practitioners in your community.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {mockFacilitators.map((fac) => (
              <Link
                key={fac.id}
                to={`/facilitators/${fac.id}`}
                className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 text-center hover:border-stone-300 hover:shadow-sm transition-all block"
              >
                <img
                  src={getFacilitatorAvatarUrl(fac.id, 80)}
                  alt=""
                  className="mx-auto h-14 w-14 rounded-full object-cover border border-stone-200"
                />
                <p className="mt-2 font-semibold text-stone-900 text-sm">{fac.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">{fac.type}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/explore"
              className="text-sm font-semibold text-primary-200 hover:text-primary-300 transition-colors"
            >
              Browse all facilitators →
            </Link>
          </div>
        </div>
      </section>

      {/* ——— How it works ——— */}
      <section className="py-14 sm:py-16 bg-stone-50 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight text-center">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
            <div>
              <h3 className="font-display font-semibold text-stone-900 text-lg">For guests</h3>
              <ol className="mt-4 space-y-4">
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white text-sm font-semibold">1</span>
                  <div>
                    <span className="font-medium text-stone-900">Find</span>
                    <p className="text-sm text-stone-600">Browse spaces and experiences by category and location.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white text-sm font-semibold">2</span>
                  <div>
                    <span className="font-medium text-stone-900">Book</span>
                    <p className="text-sm text-stone-600">Create an account and reserve your spot or space.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white text-sm font-semibold">3</span>
                  <div>
                    <span className="font-medium text-stone-900">Enjoy</span>
                    <p className="text-sm text-stone-600">Show up and make the most of your place.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div>
              <h3 className="font-display font-semibold text-stone-900 text-lg">To create</h3>
              <ol className="mt-4 space-y-4">
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-100 text-sm font-semibold">1</span>
                  <div>
                    <span className="font-medium text-stone-900">Sign up</span>
                    <p className="text-sm text-stone-600">Create a free account.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-100 text-sm font-semibold">2</span>
                  <div>
                    <span className="font-medium text-stone-900">Create</span>
                    <p className="text-sm text-stone-600">List a place, host an event, or start a community — no approval needed.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-100 text-sm font-semibold">3</span>
                  <div>
                    <span className="font-medium text-stone-900">Share</span>
                    <p className="text-sm text-stone-600">Welcome guests and grow your community. Joining someone else&apos;s community may require their approval.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Final CTA ——— */}
      <section className="py-16 sm:py-20 bg-stone-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Ready to find your place?
          </h2>
          <p className="mt-3 text-stone-300">
            Explore spaces and experiences, or sign up to host your own.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/explore"
              className="inline-flex items-center justify-center rounded-xl bg-white text-stone-900 font-semibold px-8 py-4 hover:bg-stone-100 transition-colors"
            >
              Explore now
            </Link>
            <Link
              to="/list-place"
              className="inline-flex items-center justify-center rounded-xl border-2 border-stone-500 text-white font-semibold px-8 py-4 hover:bg-stone-800 transition-colors"
            >
              Create a listing
            </Link>
          </div>
          <p className="mt-6 text-sm text-stone-400">
            New here? <Link to="/register" className="text-white font-medium underline underline-offset-2 hover:text-stone-200">Create an account</Link> to book or create — no approval needed.
          </p>
        </div>
      </section>
    </div>
  );
}
