import { Link, useParams } from 'react-router-dom';
import { getMockHost, getHostSpaces, getHostEvents, getHostCommunities } from '@/mocks/hosts';
import { getHostProfile } from '@/mocks/hostProfiles';
import { communityTypes } from '@/mocks/communities';
import { getSpaceImage, getEventImage } from '@/lib/listingImages';
import { getHostAvatarUrl } from '@/lib/avatars';

const TYPE_BADGE = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-stone-100 text-stone-700',
  approval: 'bg-amber-100 text-amber-800',
};

export default function HostDetail() {
  const { id } = useParams();
  const host = getMockHost(id);

  if (!host) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-semibold text-stone-900">Host not found</h1>
        <Link to="/communities" className="mt-4 inline-block text-primary-200 font-medium hover:underline">
          ← Back to communities
        </Link>
      </div>
    );
  }

  const spaces = getHostSpaces(host.id);
  const events = getHostEvents(host.id);
  const communities = getHostCommunities(host.id);
  const profile = getHostProfile(host.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link
        to="/communities"
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors mb-8"
      >
        ← Back to communities
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 sm:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <img
            src={getHostAvatarUrl(host.id, 160)}
            alt=""
            className="h-24 w-24 shrink-0 rounded-full object-cover border-2 border-stone-200"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight">
              {host.name}
            </h1>
            {profile?.tagline && (
              <p className="mt-1 text-primary-200 font-medium">{profile.tagline}</p>
            )}
            {profile?.location && (
              <p className="mt-1 text-sm text-stone-500">
                {profile.location}
                {profile.joinedYear && ` · Host since ${profile.joinedYear}`}
              </p>
            )}
            <p className="mt-2 text-sm text-stone-500">
              {spaces.length} venue{spaces.length !== 1 ? 's' : ''} · {events.length} event{events.length !== 1 ? 's' : ''} · {communities.length} communit{communities.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>
        {profile?.bio && (
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h2 className="font-display text-lg font-semibold text-stone-900 tracking-tight mb-2">About</h2>
            <p className="text-stone-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>

      {communities.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold text-stone-900 tracking-tight mb-4">
            Communities
          </h2>
          <div className="flex flex-wrap gap-3">
            {communities.map((c) => (
              <Link
                key={c.id}
                to={`/communities/${c.slug}`}
                className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-300 hover:shadow-sm transition-all group"
              >
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${TYPE_BADGE[c.type]}`}>
                  {communityTypes[c.type]}
                </span>
                <span className="font-medium text-stone-900 group-hover:text-primary-200">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {spaces.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-semibold text-stone-900 tracking-tight mb-4">
            Spaces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {spaces.map((space) => (
              <Link
                key={space.id}
                to={`/venues/${space.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={getSpaceImage(space)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{space.title}</h3>
                  <p className="mt-1 text-sm text-stone-500">{space.location}</p>
                  <p className="mt-2 font-semibold text-stone-900">From ${space.price} / session</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-stone-900 tracking-tight mb-4">
            Events
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/listings/event/${event.id}`}
                className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={getEventImage(event)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900 group-hover:text-primary-200 transition-colors line-clamp-2">{event.title}</h3>
                  <p className="mt-1 text-sm text-stone-500">{event.date} · {event.locationArea || event.location}</p>
                  <p className="mt-2 font-semibold text-stone-900">${event.price} / person</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {communities.length === 0 && spaces.length === 0 && events.length === 0 && (
        <p className="text-stone-500">No listings yet.</p>
      )}
    </div>
  );
}
