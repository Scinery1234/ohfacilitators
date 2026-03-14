import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPlace, deletePlace } from '@/api/places';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import VenueAvailabilityCalendar from '@/components/availability/VenueAvailabilityCalendar';
import WeeklyHoursForm from '@/components/availability/WeeklyHoursForm';

function statusLabel(v) {
  if (v === 'public') return 'Public';
  if (v === 'unlisted') return 'Unlisted';
  return 'Draft';
}

export default function PlaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const availabilitySectionRef = useRef(null);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);

  useEffect(() => {
    if (!id) return;
    getPlace(id)
      .then((data) => setPlace(data.place ?? data))
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load place'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (place && location.hash === '#availability' && availabilitySectionRef.current) {
      availabilitySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [place, location.hash]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-64" />
          <div className="h-48 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-xl font-semibold text-stone-900">We couldn’t load this place</h2>
        <p className="mt-2 text-stone-600">{error || 'Place not found. It may have been removed or you may not have access.'}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>Try again</Button>
          <Link to="/my-places">
            <Button variant="secondary">Back to My Places</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = place.role && (place.role === 'owner' || place.role === 'collaborator') || user?.isAdmin;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {place.imageUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-stone-200 aspect-[21/9] max-h-64">
          <img src={place.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="mb-8">
        <Link
          to="/my-places"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← Back to My Places
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          {place.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
            {statusLabel(place.visibility)}
          </span>
          {canEdit && (
            <>
              <a href="#availability" className="inline-block">
                <Button variant="outline" className="text-sm">Manage availability</Button>
              </a>
              <Link to={`/places/${id}/edit`}>
                <Button variant="secondary" className="text-sm">Edit place</Button>
              </Link>
              <Button
                variant="outline"
                className="text-sm text-red-700 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (!window.confirm(`Delete "${place.title}"? This cannot be undone.`)) return;
                  try {
                    await deletePlace(id);
                    navigate('/my-places');
                  } catch (e) {
                    alert(e?.response?.data?.message || 'Failed to delete');
                  }
                }}
              >
                Delete place
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Overview</h2>
            {place.description ? (
              <p className="text-stone-600">{place.description}</p>
            ) : (
              <p className="text-stone-500 italic">No description</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Place Details</h2>
            <dl className="space-y-2">
              {place.address && (
                <>
                  <dt className="text-sm font-medium text-stone-500">Address</dt>
                  <dd className="text-stone-700">{place.address}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Events at this Place</h2>
              {canEdit && (
                <Link to={`/host-event?placeId=${id}${place.communityId ? `&communityId=${place.communityId}` : ''}`}>
                  <Button variant="primary" className="text-sm">Host Event</Button>
                </Link>
              )}
            </div>
            {place.events?.length ? (
              <ul className="space-y-2">
                {place.events.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/listings/event/${e.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {e.title}
                    </Link>
                    <span className="text-stone-500 text-sm ml-2">
                      {e.startAt ? new Date(e.startAt).toLocaleDateString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <p className="text-stone-500 italic mb-3">No events yet</p>
                {canEdit && (
                  <Link to={`/host-event?placeId=${id}${place.communityId ? `&communityId=${place.communityId}` : ''}`}>
                    <Button variant="outline" className="text-sm">Create first event</Button>
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Collaborators</h2>
            {place.collaborators?.length ? (
              <ul className="space-y-2 text-sm text-stone-600">
                {place.collaborators.map((c) => (
                  <li key={c.userId} className="flex items-center justify-between">
                    <span>
                      {c.fullName || c.email || `User ${c.userId.slice(0, 8)}…`}
                      {c.userId === place.createdBy && (
                        <span className="ml-2 text-xs text-stone-500">(Creator)</span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-stone-500 capitalize">{c.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-stone-500 italic text-sm">No collaborators yet</p>
            )}
            {canEdit && (
              <Button variant="outline" className="mt-4 text-sm" disabled title="Coming soon">
                Invite collaborator
              </Button>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Visibility & Settings</h2>
            <p className="text-sm text-stone-600 mb-4">Current visibility: {statusLabel(place.visibility)}</p>
            {canEdit && (
              <Link to={`/places/${id}/edit`}>
                <Button variant="secondary">Edit place</Button>
              </Link>
            )}
          </Card>
        </div>
      </div>

      {/* Availability schedule (Calendly-style: recurring hours + date overrides) */}
      {canEdit && (
        <div ref={availabilitySectionRef} id="availability" className="mt-8 space-y-6 scroll-mt-6">
          <section aria-labelledby="availability-heading">
            <h2 id="availability-heading" className="text-xl font-display font-semibold text-stone-900 mb-4">
              Availability schedule
            </h2>
            <p className="text-stone-600 text-sm mb-4">
              Set when your venue is available by default, then block or open specific dates below.
            </p>
            <div className="space-y-6">
              <WeeklyHoursForm venueId={id} onSaved={() => setAvailabilityRefresh((n) => n + 1)} />
              <VenueAvailabilityCalendar venueId={id} refreshTrigger={availabilityRefresh} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
