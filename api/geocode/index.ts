import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Geocode an Australian address using OpenStreetMap Nominatim.
 * GET /api/geocode?address=...
 * Returns { lat, lng } or 404 if not found.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
  if (!address || address.length < 3) {
    return res.status(400).json({ message: 'address query param required (min 3 chars)' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=au&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OhFacilitators/1.0' },
    });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(404).json({ message: 'Invalid coordinates' });
    }

    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    return res.json({ lat, lng });
  } catch (err) {
    console.error('Geocode error:', err);
    return res.status(500).json({ message: 'Geocoding failed' });
  }
}
