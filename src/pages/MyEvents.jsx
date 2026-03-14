import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyEvents } from '@/api/events';
import { getMyCommunities } from '@/api/communities';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

function statusLabel(v) {
  if (v === 'public') return 'Published';
  if (v === 'unlisted') return 'Unlisted';
  return 'Draft';
}

function roleBadge(role) {
  if (role === 'owner') return 'Host';
  if (role === 'collaborator') return 'Facilitator';
  return 'Attending';
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyCommunities()
      .then((data) => setCommunities(data.communities ?? []))
      .catch(() => setCommunities([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = selectedCommunityId ? { communityId: selectedCommunityId } : {};
    getMyEvents(params)
      .then((data) => setEvents(data.events ?? []))
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [selectedCommunityId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-stone-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        My Events
      </h1>
      <p className="mt-2 text-stone-600">
        Events you host, facilitate, or are attending.
      </p>

      {communities.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="my-events-community" className="text-sm font-medium text-stone-700">Community</label>
          <select
            id="my-events-community"
            value={selectedCommunityId}
            onChange={(e) => setSelectedCommunityId(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <option value="">All communities</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          message="Events you create or collaborate on will appear here."
          className="mt-12"
        />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-semibold text-stone-900">{event.title}</h2>
                <p className="mt-1 text-sm text-stone-500">{formatDate(event.startAt)}</p>
                {event.placeTitle && (
                  <p className="mt-1 text-sm text-stone-600 truncate">@{event.placeTitle}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                    {roleBadge(event.role)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                    {statusLabel(event.visibility)}
                  </span>
                </div>
                <div className="mt-4">
                  <Link
                    to={`/listings/event/${event.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View event →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
