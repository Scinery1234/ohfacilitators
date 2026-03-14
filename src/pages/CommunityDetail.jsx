import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLoaderData } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCommunityDetail,
  getCommunityLinkRequests,
  createCommunityLinkRequest,
  approveCommunityLinkRequest,
  deleteCommunity,
  getCommunityMembers,
  getCommunityJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  removeCommunityMember,
  inviteToCommunity,
  requestToJoinCommunity,
} from '@/api/communities';
import { getMyPlaces } from '@/api/places';
import { getMyEvents } from '@/api/events';
import { getSpaceImage, getEventImage, imgYoga, getCommunityImage } from '@/lib/listingImages';
import EventsCalendar from '@/components/EventsCalendar';
import PlacesMap from '@/components/PlacesMap';
import Button from '@/components/ui/Button';
import MemberAvailabilityMarker from '@/components/MemberAvailabilityMarker';
import CommunityAvailabilityHeatmap from '@/components/availability/CommunityAvailabilityHeatmap';
import { getMockCommunityDetail } from '@/mocks/communities';

function formatEventDate(startAt) {
  if (!startAt) return '';
  return new Date(startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CommunityDetail() {
  const { slug } = useParams();
  const loaderData = useLoaderData();
  const [activeTab, setActiveTab] = useState('events');
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [community, setCommunity] = useState(() => loaderData?.community ?? null);
  const [places, setPlaces] = useState(() => loaderData?.places ?? []);
  const [events, setEvents] = useState(() => loaderData?.events ?? []);
  const [loading, setLoading] = useState(!loaderData);
  const [error, setError] = useState(null);
  const [linkRequests, setLinkRequests] = useState([]);
  const [myPlaces, setMyPlaces] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [linkRequesting, setLinkRequesting] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  // Memoize canManage to avoid unnecessary re-renders
  const canManage = useMemo(() => {
    return community?.role === 'owner' || community?.role === 'collaborator' || user?.isAdmin;
  }, [community?.role, user?.isAdmin]);

  // Sync from loader when navigating to different community
  useEffect(() => {
    if (loaderData?.community && loaderData.community.slug === slug) {
      setCommunity(loaderData.community);
      setPlaces(loaderData.places ?? []);
      setEvents(loaderData.events ?? []);
      setLoading(false);
    }
  }, [loaderData, slug]);

  // Fetch when no loader data (e.g. direct nav) - single API call for community+places+events
  useEffect(() => {
    if (!slug || loaderData) return;
    setLoading(true);
    setError(null);
    getCommunityDetail(slug)
      .then((data) => {
        const c = data.community ?? data;
        setCommunity(c);
        setPlaces(data.places ?? []);
        setEvents(data.events ?? []);
      })
      .catch((e) => {
        const mock = getMockCommunityDetail(slug);
        if (mock) {
          setCommunity(mock.community);
          setPlaces(mock.places ?? []);
          setEvents(mock.events ?? []);
          setError(null);
        } else {
          setError(e?.response?.data?.message || 'Failed to load community');
        }
      })
      .finally(() => setLoading(false));
  }, [slug, loaderData]);

  useEffect(() => {
    if (!community?.id || !canManage) return;
    
    // Batch all management-related API calls together
    Promise.all([
      getCommunityLinkRequests(community.id),
      getCommunityMembers(community.id),
      getCommunityJoinRequests(community.id),
    ]).then(([linkRes, memRes, joinRes]) => {
      setLinkRequests(linkRes.requests ?? []);
      setMembers(memRes.members ?? []);
      setJoinRequests(joinRes.requests ?? []);
    }).catch(() => {});
  }, [community?.id, canManage]);

  useEffect(() => {
    if (!canManage) return;
    
    // Fetch user's places and events in parallel
    Promise.all([
      getMyPlaces().then((r) => r.places ?? []).catch(() => []),
      getMyEvents().then((r) => r.events ?? []).catch(() => []),
    ]).then(([p, e]) => {
      setMyPlaces(p);
      setMyEvents(e);
    });
  }, [canManage]);

  const refreshPlacesAndEvents = () => {
    if (!community?.slug) return;
    getCommunityDetail(community.slug)
      .then((data) => {
        setPlaces(data.places ?? []);
        setEvents(data.events ?? []);
      })
      .catch(() => {});
  };

  const handleRequestLink = async () => {
    if (!community?.id || (!selectedPlaceId && !selectedEventId)) return;
    setLinkError('');
    setLinkRequesting(true);
    try {
      if (selectedPlaceId) {
        await createCommunityLinkRequest({ communityId: community.id, objectType: 'place', objectId: selectedPlaceId });
        setSelectedPlaceId('');
      } else {
        await createCommunityLinkRequest({ communityId: community.id, objectType: 'event', objectId: selectedEventId });
        setSelectedEventId('');
      }
      const r = await getCommunityLinkRequests(community.id);
      setLinkRequests(r.requests ?? []);
    } catch (e) {
      setLinkError(e?.response?.data?.message || 'Failed to submit request');
    } finally {
      setLinkRequesting(false);
    }
  };

  const handleApproveReject = async (requestId, status) => {
    try {
      await approveCommunityLinkRequest(requestId, status);
      setLinkRequests((prev) => prev.filter((r) => r.id !== requestId));
      refreshPlacesAndEvents();
    } catch (_) {}
  };

  const handleApproveJoin = async (requestId) => {
    try {
      await approveJoinRequest(community.id, requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      const memRes = await getCommunityMembers(community.id);
      setMembers(memRes.members ?? []);
    } catch (_) {}
  };

  const handleRejectJoin = async (requestId) => {
    try {
      await rejectJoinRequest(community.id, requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (_) {}
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the community?')) return;
    try {
      await removeCommunityMember(community.id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (_) {}
  };

  const handleJoin = async () => {
    if (!community?.id || joining) return;
    setJoinError('');
    setJoining(true);
    try {
      await requestToJoinCommunity(community.id);
      const data = await getCommunityDetail(slug);
      setCommunity(data.community ?? data);
    } catch (err) {
      setJoinError(err?.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleInvite = async (e) => {
    e?.preventDefault?.();
    if (!inviteEmail.trim() || inviting) return;
    setInviteError('');
    setInviting(true);
    try {
      await inviteToCommunity(community.id, inviteEmail.trim());
      setInviteEmail('');
    } catch (err) {
      setInviteError(err?.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const placeIdsInCommunity = new Set(places.map((p) => p.id));
  const eventIdsInCommunity = new Set(events.map((e) => e.id));
  const myPlacesNotLinked = myPlaces.filter((p) => !placeIdsInCommunity.has(p.id));
  const myEventsNotLinked = myEvents.filter((e) => !eventIdsInCommunity.has(e.id));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
        <Link
          to="/communities"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors mb-8"
        >
          ← Back to communities
        </Link>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-stone-200 rounded-2xl" />
          <div className="h-8 bg-stone-200 rounded w-2/3 max-w-md" />
          <div className="h-4 bg-stone-100 rounded w-full max-w-2xl" />
          <div className="h-4 bg-stone-100 rounded w-3/4 max-w-xl" />
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">Loading community…</p>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Community not found</h1>
        <Link to="/communities" className="mt-4 inline-block text-primary-200 font-medium hover:underline">
          ← Back to communities
        </Link>
      </div>
    );
  }

  const eventsWithDate = events.map((e) => {
    const startAt = e.startAt;
    const d = startAt ? new Date(startAt) : null;
    const validD = d && !Number.isNaN(d.getTime()) ? d : null;
    return {
      ...e,
      date: e.date || (validD ? validD.toISOString().slice(0, 10) : ''),
      time: e.time || (validD ? validD.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''),
      location: e.location ?? e.placeTitle ?? '',
      locationArea: e.locationArea ?? '',
      price: e.price ?? 0,
    };
  });
  const uniqueHosts = [...new Map(places.map((p) => [p.createdBy, { id: p.createdBy, name: p.creatorName || 'Host' }])).values()];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full min-w-0">
      <Link
        to="/communities"
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors mb-8"
      >
        ← Back to communities
      </Link>

      <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm mb-10">
        <div className="aspect-[21/9] overflow-hidden bg-stone-200">
          <img src={getCommunityImage(community)} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
            {community.name}
          </h1>
          <p className="mt-2 text-stone-600 max-w-2xl">
            {community.description || '—'}
          </p>
          {(community.locationArea || community.type) && (
            <p className="mt-2 text-sm text-stone-500">
              {community.locationArea}
              {community.locationArea && community.type && ' · '}
              {community.type === 'open' && 'Open to all'}
              {community.type === 'approval' && 'Approval required'}
              {community.type === 'closed' && 'Invite only'}
            </p>
          )}
          {community.creatorName && (
            <p className="mt-4 text-sm text-stone-500">Created by {community.creatorName}</p>
          )}
          {community.tags && community.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {community.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {community.codeOfConduct && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Code of conduct</h3>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{community.codeOfConduct}</p>
            </div>
          )}
          {user && !community.role && community.visibility !== 'draft' && (
            <div className="mt-6">
              <Button variant="primary" onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining…' : community.joinApproval === 'manual' ? 'Request to join' : 'Join community'}
              </Button>
              {joinError && <p className="text-red-600 text-sm mt-2">{joinError}</p>}
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <div className="space-y-6 mb-10">
          <CommunityAvailabilityHeatmap
            communityId={community.id}
            onCreateEvent={(data) => {
              navigate(`/host-event?communityId=${community.id}&date=${data.date}&startTime=${data.startTime}&endTime=${data.endTime}`);
            }}
          />
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Manage community</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              <Link to={`/communities/${slug}/edit`}>
                <Button variant="secondary" className="text-sm">Edit community</Button>
              </Link>
            <Button
              variant="outline"
              className="text-sm text-red-700 border-red-200 hover:bg-red-50"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm(`Delete "${community.name}"? This cannot be undone.`)) return;
                setDeleting(true);
                try {
                  await deleteCommunity(slug);
                  navigate('/communities');
                } catch (e) {
                  alert(e?.response?.data?.message || 'Failed to delete');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete community'}
            </Button>
            <Link to={`/list-place?communityId=${community.id}`}>
              <Button variant="primary" className="text-sm">Create venue</Button>
            </Link>
            <Link to={`/host-event?communityId=${community.id}`}>
              <Button variant="primary" className="text-sm">Create event</Button>
            </Link>
          </div>
          <div className="border-t border-stone-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-stone-700 mb-2">Link existing venue or event (requires admin approval)</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">My venues</label>
                <select
                  value={selectedPlaceId}
                  onChange={(e) => { setSelectedPlaceId(e.target.value); setSelectedEventId(''); }}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm min-w-[200px]"
                >
                  <option value="">Select a venue</option>
                  {myPlacesNotLinked.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                  {myPlacesNotLinked.length === 0 && <option value="" disabled>No unlinked venues</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">My events</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => { setSelectedEventId(e.target.value); setSelectedPlaceId(''); }}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm min-w-[200px]"
                >
                  <option value="">Select an event</option>
                  {myEventsNotLinked.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                  {myEventsNotLinked.length === 0 && <option value="" disabled>No unlinked events</option>}
                </select>
              </div>
              <Button
                variant="secondary"
                className="text-sm"
                disabled={linkRequesting || (!selectedPlaceId && !selectedEventId)}
                onClick={handleRequestLink}
              >
                {linkRequesting ? 'Submitting…' : 'Request to link'}
              </Button>
            </div>
            {linkError && <p className="text-red-600 text-sm mt-2">{linkError}</p>}
          </div>
          {linkRequests.length > 0 && (
            <div className="border-t border-stone-200 pt-4 mt-4">
              <h3 className="text-sm font-medium text-stone-700 mb-2">Pending link requests</h3>
              <ul className="space-y-2">
                {linkRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm">
                    <span>
                      {r.objectType === 'place' ? 'Venue' : 'Event'} <strong>{r.objectId.slice(0, 8)}…</strong>
                      {r.requestedByName && ` · requested by ${r.requestedByName}`}
                    </span>
                    <span className="flex gap-2">
                      <Button variant="primary" className="text-xs" onClick={() => handleApproveReject(r.id, 'approved')}>Approve</Button>
                      <Button variant="outline" className="text-xs" onClick={() => handleApproveReject(r.id, 'rejected')}>Reject</Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8 border-b border-stone-200 pb-4 overflow-x-auto -mx-1 px-1">
        {[
          { id: 'events', label: 'Events' },
          { id: 'spaces', label: 'Venues' },
          { id: 'hosts', label: 'Hosts' },
          ...(canManage ? [{ id: 'members', label: 'Members' }] : []),
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
              activeTab === id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'events' && (
        <div>
          <h2 className="text-xl font-display font-semibold text-stone-900 mb-4">Events</h2>
          
          {/* Member Availability Marker - Show if user is a member */}
          {user && community.role && (
            <div className="mb-8">
              <MemberAvailabilityMarker communityId={community.id} />
              <p className="mt-2 text-sm text-stone-500">
                Set your recurring hours and date overrides in <Link to="/profile#availability" className="text-primary-200 hover:text-primary-300 font-medium">Profile → Your availability</Link> so the community can see when you&apos;re free.
              </p>
            </div>
          )}
          
          {events.length > 0 ? (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-8">
                <EventsCalendar events={eventsWithDate} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/listings/event/${event.id}`}
                    className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-stone-100">
                      <img src={getEventImage({ id: event.id, category: 'Event' })} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{event.title}</h3>
                      <p className="mt-1 text-sm text-stone-500">
                        {formatEventDate(event.startAt)} · {event.placeTitle || '—'} · {event.creatorName || '—'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-stone-500">No events yet.</p>
          )}
        </div>
      )}

      {activeTab === 'spaces' && (
        <div>
          <h2 className="text-xl font-display font-semibold text-stone-900 mb-4">Venues</h2>
          {places.length > 0 ? (
            <>
              {places.some((p) => p.lat != null && p.lng != null) && (
                <div className="mb-8">
                  <PlacesMap places={places} title="Map" height={320} />
                </div>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {places.map((place) => (
                <Link
                  key={place.id}
                  to={`/places/${place.id}`}
                  className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img src={place.imageUrl || getSpaceImage({ id: place.id, category: 'Space' })} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{place.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">{place.creatorName ? `by ${place.creatorName}` : ''}</p>
                    {place.address && <p className="mt-1 text-sm text-stone-600">{place.address}</p>}
                  </div>
                </Link>
              ))}
            </div>
            </>
          ) : (
            <p className="text-stone-500">No venues yet.</p>
          )}
        </div>
      )}

      {activeTab === 'hosts' && (
        <div>
          <h2 className="text-xl font-display font-semibold text-stone-900 mb-4">Hosts</h2>
          {uniqueHosts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {uniqueHosts.map((host) => (
                <div
                  key={host.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 text-center"
                >
                  <p className="mt-2 font-semibold text-stone-900 text-sm">{host.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Host</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500">No hosts yet.</p>
          )}
        </div>
      )}

      {activeTab === 'members' && canManage && (
        <div>
          <h2 className="text-xl font-display font-semibold text-stone-900 mb-4">Member management</h2>
          <div className="space-y-8">
            {(community.joinApproval === 'invite_only' || community.joinApproval === 'manual') && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6">
                <h3 className="font-semibold text-stone-900 mb-2">Invite by email</h3>
                <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="rounded-xl border border-stone-200 px-4 py-2 text-sm min-w-[200px]"
                  />
                  <Button variant="primary" type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? 'Sending…' : 'Send invite'}
                  </Button>
                </form>
                {inviteError && <p className="text-red-600 text-sm mt-2">{inviteError}</p>}
              </div>
            )}
            {joinRequests.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="font-semibold text-stone-900 mb-3">Pending join requests</h3>
                <ul className="space-y-2">
                  {joinRequests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.avatarUrl ? (
                          <img src={r.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-medium">
                            {(r.fullName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-stone-900">{r.fullName || 'Unknown'}</p>
                          <p className="text-sm text-stone-500">{r.email}</p>
                          <p className="text-xs text-stone-400">{new Date(r.requestedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" className="text-sm" onClick={() => handleApproveJoin(r.id)}>Approve</Button>
                        <Button variant="outline" className="text-sm" onClick={() => handleRejectJoin(r.id)}>Reject</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold text-stone-900 mb-3">Member directory</h3>
              {members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-medium">
                            {(m.fullName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-stone-900">{m.fullName || 'Unknown'}</p>
                          <p className="text-sm text-stone-500">{m.email}</p>
                          <p className="text-xs text-stone-400">
                            {m.role} · Joined {new Date(m.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {m.role !== 'owner' && (
                        <Button variant="outline" className="text-sm text-red-700 border-red-200" onClick={() => handleRemoveMember(m.userId)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">No members yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
