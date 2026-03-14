import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPlace, updatePlace } from '@/api/places';
import { geocodeAddress } from '@/api/geocode';
import Button from '@/components/ui/Button';
import ImageUploadField from '@/components/ImageUploadField';
import Input from '@/components/ui/Input';

export default function PlaceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', address: '', lat: null, lng: null, visibility: 'draft', imageUrl: '' });
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPlace(id)
      .then((data) => {
        const p = data.place ?? data;
        setPlace(p);
        setForm({
          title: p.title || '',
          description: p.description || '',
          address: p.address || '',
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          visibility: p.visibility || 'draft',
          imageUrl: p.imageUrl || '',
        });
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load place'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.imageUrl?.trim()) payload.imageUrl = null;
      await updatePlace(id, payload);
      navigate(`/places/${id}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update place.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500">Loading…</div>
    );
  }

  if (!place) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-red-600">{error || 'Place not found'}</p>
        <Link to="/my-places" className="inline-block mt-4">
          <Button variant="secondary">Back to My Places</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <Link to={id ? `/places/${id}` : '/my-places'} className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-6">
        ← Back
      </Link>
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        Edit Place
      </h1>
      <p className="mt-2 text-stone-600">Update your place details.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1.5">Place name *</label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        <div>
          <ImageUploadField
            label="Photo"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url || '' }))}
            hint="Optional. Upload an image or paste a URL."
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
          <label htmlFor="address" className="block text-sm font-medium text-stone-700 mb-1.5">Address</label>
          <div className="flex gap-2">
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!form.address?.trim() || geocoding}
              onClick={async () => {
                if (!form.address?.trim()) return;
                setGeocoding(true);
                try {
                  const coords = await geocodeAddress(form.address);
                  if (coords) setForm((f) => ({ ...f, lat: coords.lat, lng: coords.lng }));
                } finally {
                  setGeocoding(false);
                }
              }}
            >
              {geocoding ? '…' : 'Pin on map'}
            </Button>
          </div>
          <p className="text-xs text-stone-500 mt-1">Use "Pin on map" to geocode the address for map display.</p>
        </div>

        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-stone-700 mb-1.5">Visibility</label>
          <select
            id="visibility"
            value={form.visibility}
            onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
          >
            <option value="draft">Draft (only you can see it)</option>
            <option value="unlisted">Unlisted (accessible via link)</option>
            <option value="public">Public (visible to everyone)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Link to={`/places/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
