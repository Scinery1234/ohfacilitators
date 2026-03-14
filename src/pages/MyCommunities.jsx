import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyCommunities } from '@/api/communities';
import { mockCommunities } from '@/mocks/communities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

function statusLabel(v) {
  if (v === 'public') return 'Public';
  if (v === 'unlisted') return 'Unlisted';
  return 'Draft';
}

function roleLabel(role) {
  return role === 'owner' ? 'Founder' : 'Collaborator';
}

/** Map mock community to API shape for My Communities list */
function mockToMyCommunity(c, index, isDemoHost) {
  const isDemoCommunity = c.id === 'comm-demo';
  const role = isDemoCommunity && isDemoHost ? 'owner' : isDemoCommunity ? 'collaborator' : (index === 1 ? 'collaborator' : 'member');
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    visibility: 'public',
    role,
  };
}

export default function MyCommunities() {
  const { isDemoUser, user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Demo users: use mock data (Demo Community + 2 others) so we don't send invalid token to API
    if (isDemoUser) {
      const isDemoHost = user?.role === 'host';
      setCommunities(mockCommunities.slice(0, 3).map((c, i) => mockToMyCommunity(c, i, isDemoHost)));
      setLoading(false);
      return;
    }

    getMyCommunities()
      .then((data) => setCommunities(data.communities ?? []))
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load communities'))
      .finally(() => setLoading(false));
  }, [isDemoUser, user?.role]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
            My Communities
          </h1>
          <p className="mt-2 text-stone-600">
            Communities you manage or belong to.
          </p>
        </div>
        <Link to="/start-community">
          <Button variant="primary">Start a Community</Button>
        </Link>
      </div>

      {communities.length === 0 ? (
        <EmptyState
          title="No communities yet"
          message="Start a community to bring people together around shared interests."
          action={
            <Link to="/start-community">
              <Button variant="primary">Start a Community</Button>
            </Link>
          }
          className="mt-12"
        />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <Card key={community.id}>
              <div className="flex flex-col h-full">
                <h2 className="text-lg font-semibold text-stone-900">{community.name}</h2>
                {community.description && (
                  <p className="mt-2 text-sm text-stone-600 line-clamp-2">{community.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                    {statusLabel(community.visibility)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                    {roleLabel(community.role)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/communities/${community.slug}`}>
                    <Button variant="secondary" className="text-sm">
                      View community
                    </Button>
                  </Link>
                  <Link to={`/list-place?communityId=${community.id}`}>
                    <Button variant="outline" className="text-sm">
                      Add place
                    </Button>
                  </Link>
                  <Link to={`/host-event?communityId=${community.id}`}>
                    <Button variant="outline" className="text-sm">
                      Host event
                    </Button>
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
