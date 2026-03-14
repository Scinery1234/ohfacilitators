import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyCommunities } from '@/api/communities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ImageUploadField';
import VenueAvailabilityCalendar from '@/components/availability/VenueAvailabilityCalendar';
import WeeklyHoursForm from '@/components/availability/WeeklyHoursForm';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [locationArea, setLocationArea] = useState(user?.locationArea || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setAvatarUrl(user?.avatarUrl || '');
    setBio(user?.bio || '');
    setLocationArea(user?.locationArea || '');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getMyCommunities()
      .then((data) => setCommunities(data.communities || []))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const trustStatus = user.trustTier === 'verified' ? 'Verified' : 'Unverified';

  const handleStartEdit = () => {
    setFullName(user.fullName || '');
    setAvatarUrl(user.avatarUrl || '');
    setBio(user.bio || '');
    setLocationArea(user.locationArea || '');
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {};
      if (fullName.trim()) payload.fullName = fullName.trim();
      if (avatarUrl !== (user.avatarUrl || '')) payload.avatarUrl = avatarUrl || '';
      if (bio !== (user.bio || '')) payload.bio = bio;
      if (locationArea !== (user.locationArea || '')) payload.locationArea = locationArea;
      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }
      await updateUserProfile(payload);
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(user.fullName || '');
    setAvatarUrl(user.avatarUrl || '');
    setBio(user.bio || '');
    setLocationArea(user.locationArea || '');
    setError('');
    setEditing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        Profile
      </h1>
      <p className="mt-2 text-stone-600">Your account settings.</p>

      <div className="mt-8 max-w-2xl space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Account</h2>
          {editing ? (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Name
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="max-w-md"
                />
              </div>
              <ImageUploadField
                label="Profile Photo"
                value={avatarUrl}
                onChange={setAvatarUrl}
                hint="Upload an image or paste a URL for your profile photo."
              />
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others a bit about yourself"
                  rows={3}
                  className="w-full max-w-md rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="locationArea" className="block text-sm font-medium text-stone-700 mb-1.5">
                  Location / Area
                </label>
                <Input
                  id="locationArea"
                  value={locationArea}
                  onChange={(e) => setLocationArea(e.target.value)}
                  placeholder="e.g. Sydney, NSW"
                  className="max-w-md"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="primary" onClick={handleSave} disabled={saving || !fullName.trim()}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-stone-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-lg font-medium">
                    {(user.fullName || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <dl className="space-y-2 text-sm flex-1">
                  <div>
                    <dt className="text-stone-500">Name</dt>
                    <dd className="text-stone-900">{user.fullName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Email</dt>
                    <dd className="text-stone-900">{user.email || '—'}</dd>
                  </div>
                  {(user.bio || user.locationArea) && (
                    <>
                      {user.bio && (
                        <div>
                          <dt className="text-stone-500">Bio</dt>
                          <dd className="text-stone-900 mt-1">{user.bio}</dd>
                        </div>
                      )}
                      {user.locationArea && (
                        <div>
                          <dt className="text-stone-500">Location</dt>
                          <dd className="text-stone-900">{user.locationArea}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="text-sm" onClick={handleStartEdit}>
                  Edit Profile
                </Button>
                <Link to="/my-places">
                  <Button variant="secondary" className="text-sm">My Places</Button>
                </Link>
                <Link to="/my-events">
                  <Button variant="secondary" className="text-sm">My Events</Button>
                </Link>
                <Link to="/my-schedule">
                  <Button variant="secondary" className="text-sm">My Schedule</Button>
                </Link>
                <Link to="/list-place">
                  <Button variant="outline" className="text-sm">List a Place</Button>
                </Link>
              </div>
            </>
          )}
        </Card>

        {!editing && communities.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">My Communities</h2>
            <div className="flex flex-wrap gap-2">
              {communities.map((c) => (
                <Link
                  key={c.id}
                  to={`/communities/${c.slug || c.id}`}
                  className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </Card>
        )}

        {!editing && (
          <Card>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Trust & Visibility</h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-stone-600">Status: <strong>{trustStatus}</strong></p>
                <p className="mt-2 text-sm text-stone-500 max-w-md">
                  Verification unlocks public visibility only. It does not unlock creation or
                  management views — those are based on your ownership or collaboration on places
                  and events.
                </p>
              </div>
              {user.trustTier !== 'verified' && (
                <Button variant="secondary" disabled title="Coming soon">
                  Request Verification
                </Button>
              )}
            </div>
          </Card>
        )}

        {!editing && (
          <Card id="availability" className="scroll-mt-6">
            <h2 className="text-xl font-display font-semibold text-stone-900 mb-2">Your availability</h2>
            <p className="text-stone-600 text-sm mb-4">
              When you&apos;re available to host or facilitate. This is used when someone checks if you&apos;re free for an event or a slot.
            </p>
            <WeeklyHoursForm ownerType="USER" ownerId={user.id} />
            <div className="mt-6">
              <VenueAvailabilityCalendar ownerType="USER" ownerId={user.id} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
