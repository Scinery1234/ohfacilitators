import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { requireAuth } from '../server-lib/requireAuth.js';

/**
 * POST /api/upload
 * Body: JSON { file: base64String, filename: string }
 * Returns: { url: string }
 * Requires auth. Uploads to Vercel Blob. Set BLOB_READ_WRITE_TOKEN in Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.IMAGEBLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(503).json({
      message: 'Image upload not configured. Add BLOB_READ_WRITE_TOKEN (or IMAGEBLOB_READ_WRITE_TOKEN) in Vercel.',
    });
  }

  try {
    const { file, filename } = (req.body || {}) as { file?: string; filename?: string };
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ message: 'file (base64) is required' });
    }

    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = (filename && /\.(jpe?g|png|gif|webp)$/i.test(filename))
      ? filename.replace(/.*\./, '')
      : 'jpg';
    const name = `uploads/${user.id}/${Date.now()}.${ext}`;

    const blob = await put(name, buffer, {
      access: 'public',
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      ...(token && { token }),
    });

    return res.json({ url: blob.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ message: 'Failed to upload image' });
  }
}
