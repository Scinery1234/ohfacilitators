import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCommunity } from '@/api/communities';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ImageUploadField';

const communitySchema = z.object({
  name: z.string().min(3, 'Community name must be at least 3 characters'),
  description: z.string().min(20, 'Please describe your community (at least 20 characters)'),
  locationArea: z.string().optional(),
  type: z.enum(['open', 'closed', 'approval']).default('open'),
  focusAreas: z.string().optional(),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\/.+/.test(v), { message: 'Must be a valid URL' }),
  visibility: z.enum(['draft', 'unlisted', 'public']).default('public'),
});

export default function StartCommunity() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      visibility: 'public',
      type: 'open',
      locationArea: '',
      focusAreas: '',
      imageUrl: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      setIsSubmitting(true);
      const joinApproval = data.type === 'open' ? 'auto' : data.type === 'approval' ? 'manual' : 'invite_only';
      const tags = data.focusAreas
        ? data.focusAreas.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const payload = {
        name: data.name,
        description: data.description,
        visibility: data.visibility,
        locationArea: data.locationArea || undefined,
        type: data.type,
        imageUrl: data.imageUrl || undefined,
        joinApproval,
        tags: tags.length ? tags : undefined,
      };
      const result = await createCommunity(payload);
      navigate(`/communities/${result.community.slug}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create community. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <Link to="/my-communities" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-4">
          ← Back to My Communities
        </Link>
        <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
          Start a Community
        </h1>
        <p className="mt-2 text-stone-600">
          Create a new community where people can connect, share events, and build together.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        {error && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            error.includes('coming soon') 
              ? 'bg-amber-50 border border-amber-100 text-amber-800' 
              : 'bg-red-50 border border-red-100 text-red-800'
          }`}>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1.5">
            Community Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="e.g. Baulkham Hills Meditation Circle, Local Artists Collective..."
            className={errors.name ? 'border-red-300' : ''}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1.5">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={6}
            className={`w-full rounded-xl border bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent ${errors.description ? 'border-red-300' : 'border-stone-200'}`}
            placeholder="Describe your community, its purpose, values, and what brings people together..."
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1.5">{errors.description.message}</p>
          )}
          <p className="text-xs text-stone-500 mt-1">Minimum 20 characters. Help people understand what your community is about.</p>
        </div>

        <div>
          <label htmlFor="locationArea" className="block text-sm font-medium text-stone-700 mb-1.5">
            Location / area
          </label>
          <Input
            id="locationArea"
            {...register('locationArea')}
            placeholder="e.g. Sydney CBD, Inner West, Baulkham Hills"
          />
          <p className="text-xs text-stone-500 mt-1">Optional. Where your community is based or most active.</p>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-stone-700 mb-1.5">
            Community type
          </label>
          <select
            id="type"
            {...register('type')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
          >
            <option value="open">Open (anyone can discover and join)</option>
            <option value="approval">Approval required (request to join)</option>
            <option value="closed">Closed (invite only)</option>
          </select>
        </div>

        <div>
          <label htmlFor="focusAreas" className="block text-sm font-medium text-stone-700 mb-1.5">
            Focus areas
          </label>
          <textarea
            id="focusAreas"
            {...register('focusAreas')}
            rows={2}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
            placeholder="e.g. Meditation, Arts, Cultural events, Language exchange"
          />
          <p className="text-xs text-stone-500 mt-1">Optional. Topics or activities your community focuses on.</p>
        </div>

        <div>
          <ImageUploadField
            label="Cover image"
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url || '', { shouldValidate: true })}
            hint="Optional. Upload an image or paste a URL."
          />
          {errors.imageUrl && <p className="text-red-600 text-sm mt-1.5">{errors.imageUrl.message}</p>}
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
            <option value="public">Public (visible to everyone)</option>
            <option value="unlisted">Unlisted (accessible via link)</option>
            <option value="draft">Draft (only you can see it)</option>
          </select>
          <p className="text-xs text-stone-500 mt-1">You can change this later.</p>
        </div>

        <div className="flex flex-wrap gap-4 pt-4">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Community'}
          </Button>
          <Link to="/my-communities">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
