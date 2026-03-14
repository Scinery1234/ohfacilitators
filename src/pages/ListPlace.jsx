import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPlace } from '@/api/places';
import { getMyCommunities } from '@/api/communities';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ImageUploadField';

const DRAFT_KEY = 'list-place-draft';

const placeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  communityId: z.string().optional(),
  visibility: z.enum(['draft', 'unlisted', 'public']).default('draft'),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\/.+/.test(v), { message: 'Must be a valid URL' }),
});

export default function ListPlace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  // Get communityId from URL params for autofill
  const communityIdFromUrl = searchParams.get('communityId');

  useEffect(() => {
    getMyCommunities()
      .then((data) => setCommunities(data.communities || []))
      .catch(() => setCommunities([]))
      .finally(() => setLoadingCommunities(false));
  }, []);

  const addressInputRef = useRef(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(placeSchema),
    defaultValues: (() => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const d = JSON.parse(saved);
          return {
            title: d.title || '',
            description: d.description || '',
            address: d.address || '',
            lat: d.lat ?? null,
            lng: d.lng ?? null,
            communityId: d.communityId || communityIdFromUrl || '',
            visibility: d.visibility || 'draft',
            imageUrl: d.imageUrl || '',
          };
        }
      } catch (_) {}
      return {
        visibility: 'draft',
        communityId: communityIdFromUrl || '',
        address: '',
        lat: null,
        lng: null,
        title: '',
        description: '',
        imageUrl: '',
      };
    })(),
  });

  const addressValue = watch('address');
  const watched = watch();

  // Autosave draft to localStorage (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (watched.title?.trim() || watched.description?.trim() || watched.address?.trim()) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            title: watched.title || '',
            description: watched.description || '',
            address: watched.address || '',
            lat: watched.lat ?? null,
            lng: watched.lng ?? null,
            communityId: watched.communityId || '',
            visibility: watched.visibility || 'draft',
            imageUrl: watched.imageUrl || '',
          }));
        } catch (_) {}
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [watched.title, watched.description, watched.address, watched.lat, watched.lng, watched.communityId, watched.visibility, watched.imageUrl]);

  // Simple address lookup using OpenStreetMap Nominatim API
  useEffect(() => {
    if (!addressValue || addressValue.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        // Nominatim: Australia only, prefer addresses (street/building), get structured parts
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressValue)}&countrycodes=au&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Oh Places App',
            },
          }
        );
        const data = await response.json();

        const formatAustralianAddress = (item) => {
          const a = item.address || {};
          const parts = [];
          if (a.house_number) parts.push(a.house_number);
          if (a.road) parts.push(a.road);
          const street = parts.length ? parts.join(' ') : (a.street || a.pedestrian || a.footway);
          const suburb = a.suburb || a.village || a.town || a.locality || a.city || a.municipality;
          const state = a.state;
          const postcode = a.postcode;
          const lat = item.lat ? parseFloat(item.lat) : null;
          const lng = item.lon ? parseFloat(item.lon) : null;
          if (street && (suburb || state || postcode)) {
            const line2 = [suburb, [state, postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
            const addr = `${street}, ${line2}`.trim();
            return { display: addr, address: addr, lat, lng };
          }
          if (street) return { display: street, address: street, lat, lng };
          if (suburb || state || postcode) {
            const line2 = [suburb, [state, postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
            return { display: line2, address: line2, lat, lng };
          }
          const raw = (item.display_name || '').replace(/, Australia$/i, '').trim();
          return { display: raw, address: raw, lat, lng };
        };

        const suggestions = data.map((item) => formatAustralianAddress(item));
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (err) {
        console.error('Address lookup error:', err);
        setAddressSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addressValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const onSubmit = async (data) => {
    try {
      setError('');
      setIsSubmitting(true);
      const payload = { ...data };
      if (!payload.imageUrl?.trim()) delete payload.imageUrl;
      const result = await createPlace(payload);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (_) {}
      if (communityIdFromUrl) {
        navigate('/my-places');
      } else {
        navigate(`/places/${result.place.id}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create place. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <Link to="/my-places" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-4">
          ← Back to My Places
        </Link>
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          List a Place
        </h1>
        <p className="mt-2 text-stone-600">
          Create a new place listing. You can edit it later and add events.
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
            Place Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g. Community Hall, Backyard Studio"
            className={errors.title ? 'border-red-300' : ''}
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1.5">{errors.title.message}</p>
          )}
        </div>

        <div>
          <ImageUploadField
            label="Photo"
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url || '', { shouldValidate: true })}
            hint="Optional. Upload an image or paste a URL."
          />
          {errors.imageUrl && (
            <p className="text-red-600 text-sm mt-1.5">{errors.imageUrl.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            placeholder="Describe your place, its features, and what makes it special..."
          />
        </div>

        <div className="relative">
          <label htmlFor="address" className="block text-sm font-medium text-stone-700 mb-1.5">
            Address
          </label>
          <div className="relative" ref={addressInputRef}>
            <Input
              id="address"
              {...register('address')}
              placeholder="Start typing an Australian address..."
              onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
              onChange={(e) => {
                setValue('address', e.target.value);
                setShowSuggestions(true);
              }}
            />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {addressSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setValue('address', suggestion.address);
                      setValue('lat', suggestion.lat ?? null);
                      setValue('lng', suggestion.lng ?? null);
                      setSelectedAddress(suggestion.address);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-b-0 transition-colors"
                  >
                    <p className="text-sm text-stone-900">{suggestion.display}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">Optional. Australian addresses only. Start typing to search.</p>
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
              <p className="text-sm text-stone-600 mb-2">You don't have any communities yet.</p>
              <Link to="/start-community" className="text-sm text-primary-200 hover:text-primary-300 font-medium">
                Start a community →
              </Link>
            </div>
          )}
          <p className="text-xs text-stone-500 mt-1">Link this place to a community you're part of.</p>
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
            {isSubmitting ? 'Creating...' : 'Create Place'}
          </Button>
          <Link to="/my-places">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
