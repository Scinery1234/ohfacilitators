import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCommunity, updateCommunity } from '@/api/communities';
import Button from '@/components/ui/Button';
import ImageUploadField from '@/components/ImageUploadField';
import Input from '@/components/ui/Input';

export default function CommunityEdit() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    locationArea: '',
    type: 'open',
    imageUrl: '',
    codeOfConduct: '',
    tags: [],
    joinApproval: 'auto',
  });

  useEffect(() => {
    if (!slug) return;
    getCommunity(slug)
      .then((data) => {
        const c = data.community ?? data;
        setCommunity(c);
        setForm({
          name: c.name || '',
          description: c.description || '',
          visibility: c.visibility || 'public',
          locationArea: c.locationArea || '',
          type: c.type || 'open',
          imageUrl: c.imageUrl || '',
          codeOfConduct: c.codeOfConduct || '',
          tags: Array.isArray(c.tags) ? c.tags : [],
          joinApproval: c.joinApproval || 'auto',
        });
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load community'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slug) return;
    setError('');
    setSaving(true);
    try {
      await updateCommunity(slug, form);
      navigate(`/communities/${slug}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500">Loading…</div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-red-600">{error || 'Community not found'}</p>
        <Link to="/communities" className="inline-block mt-4">
          <Button variant="secondary">Back to communities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <Link to={`/communities/${slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-6">
        ← Back to community
      </Link>
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        Edit community
      </h1>
      <p className="mt-2 text-stone-600">Update community details.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1.5">Community name *</label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">Description</label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>

        <div>
          <label htmlFor="locationArea" className="block text-sm font-medium text-stone-700 mb-1.5">Location / area</label>
          <Input
            id="locationArea"
            value={form.locationArea}
            onChange={(e) => setForm((f) => ({ ...f, locationArea: e.target.value }))}
            placeholder="e.g. Sydney CBD"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-stone-700 mb-1.5">Type</label>
          <select
            id="type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            <option value="open">Open</option>
            <option value="approval">Approval required</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label htmlFor="joinApproval" className="block text-sm font-medium text-stone-700 mb-1.5">Join approval</label>
          <select
            id="joinApproval"
            value={form.joinApproval}
            onChange={(e) => setForm((f) => ({ ...f, joinApproval: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            <option value="auto">Auto-approve (anyone can join)</option>
            <option value="manual">Manual (request to join, manager approves)</option>
            <option value="invite_only">Invite only</option>
          </select>
          <p className="text-xs text-stone-500 mt-1">Controls how new members join this community.</p>
        </div>

        <div>
          <label htmlFor="codeOfConduct" className="block text-sm font-medium text-stone-700 mb-1.5">Code of conduct</label>
          <textarea
            id="codeOfConduct"
            rows={5}
            value={form.codeOfConduct}
            onChange={(e) => setForm((f) => ({ ...f, codeOfConduct: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
            placeholder="Community guidelines, expected behavior..."
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-stone-700 mb-1.5">Tags</label>
          <input
            id="tags"
            type="text"
            value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
            onChange={(e) => setForm((f) => ({
              ...f,
              tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
            }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
            placeholder="yoga, meditation, wellness (comma-separated)"
          />
        </div>

        <div>
          <ImageUploadField
            label="Cover image"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url || '' }))}
            hint="Optional. Upload an image or paste a URL."
          />
        </div>

        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-stone-700 mb-1.5">Visibility</label>
          <select
            id="visibility"
            value={form.visibility}
            onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Link to={`/communities/${slug}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
