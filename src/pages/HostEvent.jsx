import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { createEvent } from '@/api/events';
import { getMyPlaces } from '@/api/places';
import { getMyCommunities } from '@/api/communities';
import { getFacilitatorAvailability, getMemberAvailabilityCount } from '@/api/availability';
import { checkVenueAvailability, getEventAvailabilitySlots, createAvailabilityOverride } from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ImageUploadField';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
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

export default function HostEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [places, setPlaces] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  
  // Availability state (unified venue engine: placeId -> available boolean)
  const [placeAvailability, setPlaceAvailability] = useState({});
  const [facilitatorAvailability, setFacilitatorAvailability] = useState([]);
  const [memberAvailabilityCount, setMemberAvailabilityCount] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);

  // Slots-first: date picker + event slots for that date
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

  // Watch for date/time changes to fetch availability
  const watchedStartAt = watch('startAt');
  const watchedEndAt = watch('endAt');
  const watchedCommunityId = watch('communityId');
  const watchedPlaceId = watch('placeId');

  // Fetch event slots when slotsDate or place changes (slots-first flow)
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

  // Parse date/time from datetime-local input
  useEffect(() => {
    if (!watchedStartAt) {
      setSelectedDate(null);
      setSelectedStartTime(null);
      setSelectedEndTime(null);
      return;
    }

    try {
      const startDate = new Date(watchedStartAt);
      const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = watchedStartAt.split('T')[1] || '00:00'; // HH:MM
      const startTime = `${timeStr}:00`; // HH:MM:SS

      let endTime = null;
      if (watchedEndAt) {
        const endTimeStr = watchedEndAt.split('T')[1] || '00:00';
        endTime = `${endTimeStr}:00`;
      } else {
        // Default to 2 hours if no end time
        const [hours, minutes] = timeStr.split(':').map(Number);
        const endHours = (hours + 2) % 24;
        endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      }

      setSelectedDate(dateStr);
      setSelectedStartTime(startTime);
      setSelectedEndTime(endTime);
    } catch (err) {
      console.error('Error parsing date/time:', err);
      setSelectedDate(null);
      setSelectedStartTime(null);
      setSelectedEndTime(null);
    }
  }, [watchedStartAt, watchedEndAt]);

  // Debounce availability fetching to avoid excessive API calls
  const availabilityTimeoutRef = useRef(null);
  const lastFetchedRef = useRef('');

  // Fetch availability when date/time is selected (with debouncing)
  useEffect(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setPlaceAvailability({});
      setFacilitatorAvailability([]);
      setMemberAvailabilityCount(null);
      return;
    }

    // Create a cache key to avoid refetching same data
    const cacheKey = `${selectedDate}-${selectedStartTime}-${selectedEndTime}-${watchedCommunityId}`;
    if (cacheKey === lastFetchedRef.current) {
      return; // Already fetched this combination
    }

    // Clear any pending timeout
    if (availabilityTimeoutRef.current) {
      clearTimeout(availabilityTimeoutRef.current);
    }

    // Debounce: wait 300ms after user stops changing date/time
    availabilityTimeoutRef.current = setTimeout(() => {
      setLoadingAvailability(true);
      lastFetchedRef.current = cacheKey;

      // Limit parallel requests - batch places in chunks of 5
      const placeChunks = [];
      for (let i = 0; i < places.length; i += 5) {
        placeChunks.push(places.slice(i, i + 5));
      }

      // Check venue availability (unified engine) for each place at selected date/time
      const fetchPlaceAvailability = Promise.all(
        placeChunks.map((chunk) =>
          Promise.all(
            chunk.map((place) =>
              checkVenueAvailability(place.id, {
                date: selectedDate,
                startTime: selectedStartTime,
                endTime: selectedEndTime,
              })
                .then((result) => ({ placeId: place.id, available: result.available === true }))
                .catch(() => ({ placeId: place.id, available: false }))
            )
          )
        )
      ).then((chunkResults) => {
        const availabilityMap = {};
        chunkResults.flat().forEach(({ placeId, available }) => {
          availabilityMap[placeId] = available;
        });
        setPlaceAvailability(availabilityMap);
      });

      // Fetch facilitator availability
      const fetchFacilitatorAvailability = getFacilitatorAvailability(null, selectedDate)
        .then((result) => setFacilitatorAvailability(result.availability || []))
        .catch(() => setFacilitatorAvailability([]));

      // Fetch member availability count if community is selected
      const fetchMemberCount = watchedCommunityId
        ? getMemberAvailabilityCount(watchedCommunityId, selectedDate)
            .then((count) => setMemberAvailabilityCount(count))
            .catch(() => setMemberAvailabilityCount(null))
        : Promise.resolve(setMemberAvailabilityCount(null));

      Promise.all([fetchPlaceAvailability, fetchFacilitatorAvailability, fetchMemberCount]).finally(() => {
        setLoadingAvailability(false);
      });
    }, 300);

    return () => {
      if (availabilityTimeoutRef.current) {
        clearTimeout(availabilityTimeoutRef.current);
      }
    };
  }, [selectedDate, selectedStartTime, selectedEndTime, places, watchedCommunityId]);

  // Filter places by availability (unified venue engine)
  const availablePlaces = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      return places;
    }
    return places.filter((place) => placeAvailability[place.id] === true);
  }, [places, placeAvailability, selectedDate, selectedStartTime, selectedEndTime]);

  // Filter facilitators by availability
  const availableFacilitators = useMemo(() => {
    if (!selectedDate) return [];
    return facilitatorAvailability.filter((avail) => avail.date === selectedDate);
  }, [facilitatorAvailability, selectedDate]);

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
      const eventId = result.event?.id;

      // Create BOOKED overrides so venue and host show as busy for this time
      try {
        const start = data.startAt ? new Date(data.startAt) : null;
        let end = data.endAt ? new Date(data.endAt) : null;
        if (start && !end) {
          end = new Date(start);
          end.setHours(end.getHours() + 2);
        }
        if (start && end) {
          const dateStr = start.toISOString().split('T')[0];
          const startTime = start.toTimeString().slice(0, 8); // HH:MM:SS
          const endTime = end.toTimeString().slice(0, 8);

          const overrideCalls = [];
          if (data.placeId) {
            overrideCalls.push(
              createAvailabilityOverride({
                ownerType: 'VENUE',
                ownerId: data.placeId,
                date: dateStr,
                startTime,
                endTime,
                status: 'BOOKED',
                referenceId: eventId || undefined,
              })
            );
          }
          if (user?.id) {
            overrideCalls.push(
              createAvailabilityOverride({
                ownerType: 'USER',
                ownerId: user.id,
                date: dateStr,
                startTime,
                endTime,
                status: 'BOOKED',
                referenceId: eventId || undefined,
              })
            );
          }
          await Promise.all(overrideCalls);
        }
      } catch (overrideErr) {
        console.warn('Could not create availability overrides for event:', overrideErr);
        // Don't block navigation; event was created
      }

      // Redirect to My Events if created from community/place context, otherwise to event detail
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
          Host an Event
        </h1>
        <p className="mt-2 text-stone-600">
          Create a new event. You can link it to a place or host it independently.
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
            Event Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g. Evening Meditation Circle, Workshop on..."
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
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            placeholder="Describe your event, what participants can expect..."
          />
        </div>

        <div>
          <label htmlFor="placeId" className="block text-sm font-medium text-stone-700 mb-1.5">
            Place (Optional)
          </label>
          {loadingPlaces ? (
            <div className="text-stone-500 text-sm">Loading your places...</div>
          ) : places.length > 0 ? (
            <>
              <select
                id="placeId"
                {...register('placeId')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
              >
                <option value="">No place (host independently)</option>
                {availablePlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.title} ✓ Available
                  </option>
                ))}
                {places.length > availablePlaces.length && (
                  <optgroup label="Not available for selected time">
                    {places
                      .filter((p) => !availablePlaces.some((ap) => ap.id === p.id))
                      .map((place) => (
                        <option key={place.id} value={place.id} disabled>
                          {place.title} (Not available)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {selectedDate && selectedStartTime && (
                <p className="text-xs text-stone-500 mt-1">
                  {availablePlaces.length > 0
                    ? `${availablePlaces.length} of ${places.length} places available for selected time`
                    : 'No places available for selected time. Select a different time or host independently.'}
                </p>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-stone-600 mb-2">You don&apos;t have any places yet.</p>
              <Link to="/list-place" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                Create a place first →
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

        {/* Slots-first: choose date then pick a time slot */}
        <Card className="bg-stone-50/80 border-stone-200">
          <h3 className="text-sm font-semibold text-stone-900 mb-2">Choose date and time</h3>
          <p className="text-xs text-stone-600 mb-3">
            Pick a date to see available times (venue + you). Click a time to set start and end.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label htmlFor="slotsDate" className="block text-xs font-medium text-stone-700 mb-1">
                Date
              </label>
              <input
                id="slotsDate"
                type="date"
                value={slotsDate}
                onChange={(e) => setSlotsDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>
          </div>
          {slotsDate && (
            <>
              {eventSlotsLoading ? (
                <p className="text-sm text-stone-500">Loading available times…</p>
              ) : eventSlots.length === 0 ? (
                <p className="text-sm text-stone-500">No slots available on this date. Try another date or pick a time below.</p>
              ) : (
                <div className="mb-2">
                  <p className="text-xs font-medium text-stone-700 mb-2">Available times (1 hr)</p>
                  <div className="flex flex-wrap gap-2" role="list">
                    {eventSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const start = slot.startTime.slice(0, 5);
                          const end = slot.endTime.slice(0, 5);
                          setValue('startAt', `${slotsDate}T${start}`, { shouldValidate: true });
                          setValue('endAt', `${slotsDate}T${end}`, { shouldValidate: true });
                        }}
                        className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-400 transition-colors"
                        role="listitem"
                      >
                        {formatSlotTime(slot.startTime)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

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
            {selectedDate && (
              <p className="text-xs text-stone-500 mt-1">
                We&apos;ll show available places and facilitators for this time.
              </p>
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
            <p className="text-xs text-stone-500 mt-1">If not specified, defaults to 2 hours after start.</p>
          </div>
        </div>

        {/* Availability Information */}
        {selectedDate && selectedStartTime && (
          <Card className="bg-blue-50/50 border-blue-200/50">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Availability for {selectedDate}</h3>
            
            {loadingAvailability ? (
              <div className="text-sm text-stone-500">Checking availability...</div>
            ) : (
              <div className="space-y-3">
                {/* Place Availability */}
                {places.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      Available Places: <span className="text-primary-200">{availablePlaces.length}</span> of {places.length}
                    </p>
                    {availablePlaces.length === 0 && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        No places have availability set for this time. You can still select a place or host independently.
                      </p>
                    )}
                  </div>
                )}

                {/* Facilitator Availability */}
                {availableFacilitators.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-stone-700 mb-1">
                      Available Facilitators: <span className="text-primary-200">{availableFacilitators.length}</span>
                    </p>
                    <div className="text-xs text-stone-600 space-y-0.5">
                      {availableFacilitators.slice(0, 3).map((avail, idx) => (
                        <div key={idx}>
                          {avail.startTime && avail.endTime
                            ? `${avail.startTime.slice(0, 5)} - ${avail.endTime.slice(0, 5)}`
                            : 'Available all day'}
                        </div>
                      ))}
                      {availableFacilitators.length > 3 && (
                        <p className="text-stone-500">+{availableFacilitators.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Member Availability Count */}
                {watchedCommunityId && memberAvailabilityCount !== null && (
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      Community Members Available: <span className="text-primary-200">{memberAvailabilityCount}</span>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Members who marked this date as available
                    </p>
                  </div>
                )}

                {availablePlaces.length === 0 && availableFacilitators.length === 0 && memberAvailabilityCount === null && (
                  <p className="text-sm text-stone-500">
                    No availability data found. You can still create the event.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-stone-700 mb-1.5">
            Capacity (Optional)
          </label>
          <Input
            id="capacity"
            type="number"
            min="1"
            {...register('capacity', { valueAsNumber: true })}
            placeholder="e.g. 20"
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
