import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { createEvent } from '@/api/events';
import { getMyPlaces } from '@/api/places';
import { getMyCommunities } from '@/api/communities';
import { getEventAvailabilitySlots, createAvailabilityOverride } from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ImageUploadField';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(20, 'Please describe your offering (at least 20 characters)'),
  imageUrl: z.string().optional(),
  placeId: z.string().optional(),
  communityId: z.string().optional(),
  startAt: z.string().min(1, 'Start date/time is required'),
  endAt: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
  visibility: z.enum(['draft', 'unlisted', 'public']).default('draft'),
});

function formatSlotTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = (timeStr.slice(0, 5) || '00:00').split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function FacilitateEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [places, setPlaces] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  // Slots-first: show when facilitator (you) and optional venue are free
  const [slotsDate, setSlotsDate] = useState('');
  const [eventSlots, setEventSlots] = useState([]);
  const [eventSlotsLoading, setEventSlotsLoading] = useState(false);

  // Get placeId and communityId from URL params for autofill
  const placeIdFromUrl = searchParams.get('placeId');
  const communityIdFromUrl = searchParams.get('communityId');

  useEffect(() => {
    Promise.all([
      getMyPlaces()
        .then((data) => setPlaces(data.places || []))
        .catch(() => setPlaces([]))
        .finally(() => setLoadingPlaces(false)),
      getMyCommunities()
        .then((data) => setCommunities(data.communities || []))
        .catch(() => setCommunities([]))
        .finally(() => setLoadingCommunities(false)),
    ]);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      visibility: 'draft',
      placeId: placeIdFromUrl || '',
      communityId: communityIdFromUrl || '',
    },
  });

  const watchedPlaceId = watch('placeId');

  // Fetch slots when date or place changes (facilitator = current user, optional venue)
  useEffect(() => {
    if (!slotsDate || !user?.id) {
      setEventSlots([]);
      return;
    }
    setEventSlotsLoading(true);
    getEventAvailabilitySlots({
      venueId: watchedPlaceId || undefined,
      hostId: user.id,
      date: slotsDate,
      durationMinutes: 60,
      incrementMinutes: 30,
    })
      .then((res) => setEventSlots(res.slots || []))
      .catch(() => setEventSlots([]))
      .finally(() => setEventSlotsLoading(false));
  }, [slotsDate, watchedPlaceId, user?.id]);

  const onSubmit = async (data) => {
    try {
      setError('');
      setIsSubmitting(true);
      const eventData = {
        ...data,
        placeId: data.placeId || null,
        communityId: data.communityId || null,
        capacity: data.capacity ? Number(data.capacity) : null,
      };
      const result = await createEvent(eventData);
      const eventId = result?.event?.id;
      const startAt = data.startAt;
      const endAt = data.endAt;
      const dateStr = startAt ? startAt.slice(0, 10) : null;
      const startTime = startAt ? startAt.slice(11, 16) : null;
      const endTime = endAt ? endAt.slice(11, 16) : null;

      // Create BOOKED overrides so availability reflects this event (unified engine)
      if (eventId && dateStr && startTime && endTime) {
        if (data.placeId) {
          createAvailabilityOverride({
            ownerType: 'VENUE',
            ownerId: data.placeId,
            date: dateStr,
            startTime,
            endTime,
            status: 'BOOKED',
            referenceId: eventId,
          }).catch((overrideErr) => console.warn('Could not create venue availability override:', overrideErr));
        }
        if (user?.id) {
          createAvailabilityOverride({
            ownerType: 'USER',
            ownerId: user.id,
            date: dateStr,
            startTime,
            endTime,
            status: 'BOOKED',
            referenceId: eventId,
          }).catch((overrideErr) => console.warn('Could not create facilitator availability override:', overrideErr));
        }
      }

      if (communityIdFromUrl || placeIdFromUrl) {
        navigate('/my-events');
      } else {
        navigate(`/listings/event/${result.event.id}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create event. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <Link to="/my-events" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-4">
          ← Back to My Events
        </Link>
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          Share Your Gifts
        </h1>
        <p className="mt-2 text-stone-600">
          Facilitate an event or session. Share your skills, knowledge, or services with your community.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1.5">
            Event/Session Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g. Meditation Session, Yoga Class, Sound Healing..."
            className={errors.title ? 'border-red-300' : ''}
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1.5">{errors.title.message}</p>
          )}
        </div>

        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <ImageUploadField
              label="Event Photo"
              value={field.value}
              onChange={field.onChange}
              hint="Upload an image or paste a URL for your event."
            />
          )}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={5}
            className={`w-full rounded-xl border bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent ${
              errors.description ? 'border-red-300' : 'border-stone-200'
            }`}
            placeholder="Describe what you&apos;re offering, your background, what participants will experience..."
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1.5">{errors.description.message}</p>
          )}
          <p className="text-xs text-stone-500 mt-1">Minimum 20 characters. Share your expertise and what makes your offering special.</p>
        </div>

        <div>
          <label htmlFor="placeId" className="block text-sm font-medium text-stone-700 mb-1.5">
            Place (Optional)
          </label>
          {loadingPlaces ? (
            <div className="text-stone-500 text-sm">Loading your places...</div>
          ) : places.length > 0 ? (
            <select
              id="placeId"
              {...register('placeId')}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            >
              <option value="">No place (host independently or online)</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.title}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-stone-600 mb-2">You can facilitate without a place, or create one first.</p>
              <Link to="/list-place" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                Create a place →
              </Link>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="communityId" className="block text-sm font-medium text-stone-700 mb-1.5">
            Community (Optional)
          </label>
          {loadingCommunities ? (
            <div className="text-stone-500 text-sm">Loading communities...</div>
          ) : communities.length > 0 ? (
            <select
              id="communityId"
              {...register('communityId')}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            >
              <option value="">No community</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-stone-600 mb-2">You don&apos;t have any communities yet.</p>
              <Link to="/start-community" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                Start a community →
              </Link>
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Link this event to a community you&apos;re part of.</p>
        </div>

        {/* Slots-first: choose date then pick an available time (your + optional venue) */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">Choose date and time</h3>
          <p className="text-xs text-stone-600">Pick a date to see when you (and the venue, if selected) are free.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="fac-slots-date" className="text-sm font-medium text-stone-700">Date</label>
            <input
              id="fac-slots-date"
              type="date"
              value={slotsDate}
              onChange={(e) => setSlotsDate(e.target.value)}
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </div>
          {slotsDate && (
            <>
              {eventSlotsLoading ? (
                <p className="text-sm text-stone-500">Loading available times…</p>
              ) : eventSlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {eventSlots.map((slot) => {
                    const startDateTime = `${slotsDate}T${slot.startTime}:00`;
                    const endDateTime = `${slotsDate}T${slot.endTime}:00`;
                    return (
                      <button
                        key={`${slot.startTime}-${slot.endTime}`}
                        type="button"
                        onClick={() => {
                          setValue('startAt', startDateTime);
                          setValue('endAt', endDateTime);
                        }}
                        className="rounded-lg border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-primary-200 hover:bg-primary-50 transition-colors"
                      >
                        {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No available slots on this day. Pick another date or set your availability in Profile.</p>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startAt" className="block text-sm font-medium text-stone-700 mb-1.5">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <Input
              id="startAt"
              type="datetime-local"
              {...register('startAt')}
              className={errors.startAt ? 'border-red-300' : ''}
            />
            {errors.startAt && (
              <p className="text-red-600 text-sm mt-1.5">{errors.startAt.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="endAt" className="block text-sm font-medium text-stone-700 mb-1.5">
              End Date & Time (Optional)
            </label>
            <Input
              id="endAt"
              type="datetime-local"
              {...register('endAt')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-stone-700 mb-1.5">
            Capacity (Optional)
          </label>
          <Input
            id="capacity"
            type="number"
            min="1"
            {...register('capacity', { valueAsNumber: true })}
            placeholder="e.g. 10"
          />
          <p className="text-xs text-stone-500 mt-1">Maximum number of participants</p>
        </div>

        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-stone-700 mb-1.5">
            Visibility <span className="text-red-500">*</span>
          </label>
          <select
            id="visibility"
            {...register('visibility')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
          >
            <option value="draft">Draft (only you can see it)</option>
            <option value="unlisted">Unlisted (accessible via link)</option>
            <option value="public">Public (visible to everyone)</option>
          </select>
          <p className="text-xs text-stone-500 mt-1">You can change this later.</p>
        </div>

        <div className="flex flex-wrap gap-4 pt-4">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
          <Link to="/my-events">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
