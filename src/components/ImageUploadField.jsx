import { useState, useRef } from 'react';
import { uploadImage } from '@/api/upload';

/**
 * Image upload field with file picker and optional URL fallback.
 * value/onChange compatible with react-hook-form via setValue.
 */
export default function ImageUploadField({ value, onChange, label = 'Photo', hint = 'Upload an image or paste a URL.' }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image must be under 3MB.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Try a URL instead.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
          />
          <span className="text-xs text-stone-500 self-center">or</span>
          <input
            type="url"
            value={value || ''}
            onChange={(e) => {
              setUploadError('');
              onChange(e.target.value || '');
            }}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 min-w-[200px] rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        {uploading && <p className="text-sm text-stone-500">Uploading…</p>}
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        {value && (
          <div className="rounded-lg overflow-hidden border border-stone-200 max-w-xs aspect-video bg-stone-100">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </div>
    </div>
  );
}
