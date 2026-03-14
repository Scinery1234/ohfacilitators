import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyPlaces } from '@/api/places';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

function statusLabel(v) {
  if (v === 'public') return 'Public';
  if (v === 'unlisted') return 'Unlisted';
  return 'Draft';
}

function roleLabel(role) {
  return role === 'owner' ? 'Place Manager' : 'Collaborator';
}

export default function MyPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyPlaces()
      .then((data) => setPlaces(data.places ?? []))
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load places'))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-xl font-semibold text-stone-900">We couldn’t load your places</h2>
        <p className="mt-2 text-stone-600">{error}</p>
        <p className="mt-2 text-sm text-stone-500">Make sure you’re signed in. If the problem continues, try again later.</p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        My Places
      </h1>
      <p className="mt-2 text-stone-600">
        Places you manage or collaborate on.
      </p>

      {places.length === 0 ? (
        <EmptyState
          title="You don't manage any places yet."
          message="List a place to get started."
          action={
            <Link to="/list-place">
              <Button variant="primary">List a Place</Button>
            </Link>
          }
          className="mt-12"
        />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <Card key={place.id}>
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-semibold text-stone-900">{place.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                    {statusLabel(place.visibility)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                    {roleLabel(place.role)}
                  </span>
                </div>
                {place.address && (
                  <p className="mt-2 text-sm text-stone-500 truncate">{place.address}</p>
                )}
                <p className="mt-2 text-sm text-stone-600">
                  {place.eventCount ?? 0} event{place.eventCount !== 1 ? 's' : ''}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/places/${place.id}`}>
                    <Button variant="secondary" className="text-sm">
                      View place
                    </Button>
                  </Link>
                  <Link to={`/places/${place.id}#availability`}>
                    <Button variant="outline" className="text-sm">
                      Availability
                    </Button>
                  </Link>
                  <Link to={`/places/${place.id}/edit`}>
                    <Button variant="outline" className="text-sm">
                      Edit place
                    </Button>
                  </Link>
                  <Button variant="outline" className="text-sm" disabled title="Coming soon">
                    Invite collaborator
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
