import { useState, useEffect, useRef } from 'react';
import {
  getFacilitatorAvailability,
  createFacilitatorAvailability,
  deleteFacilitatorAvailability,
} from '@/api/availability';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

export default function FacilitatorAvailabilityManager() {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    loadAvailability();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (success) {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccess(''), 3000);
    }
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [success]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getFacilitatorAvailability();
      setAvailability(result.availability || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAvailability.date) {
      setError('Please select a date');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await createFacilitatorAvailability({
        date: newAvailability.date,
        startTime: newAvailability.startTime ? `${newAvailability.startTime}:00` : null,
        endTime: newAvailability.endTime ? `${newAvailability.endTime}:00` : null,
      });
      setSuccess('Availability added successfully');
      setNewAvailability({ date: '', startTime: '', endTime: '' });
      setIsAdding(false);
      loadAvailability();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add availability');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this availability slot?')) return;

    try {
      setError('');
      setSuccess('');
      await deleteFacilitatorAvailability(id);
      setSuccess('Availability deleted');
      loadAvailability();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete availability');
    }
  };

  // Group availability by date
  const groupedAvailability = availability.reduce((acc, avail) => {
    const date = avail.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(avail);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedAvailability).sort();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">My Availability</h2>
        <Button
          variant={isAdding ? 'outline' : 'primary'}
          size="sm"
          onClick={() => {
            setIsAdding(!isAdding);
            setError('');
            setSuccess('');
          }}
        >
          {isAdding ? 'Cancel' : 'Add Availability'}
        </Button>
      </div>

      <p className="text-sm text-stone-600 mb-4">
        Mark when you're available to facilitate events. This helps event creators find facilitators.
      </p>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="facil-date" className="block text-sm font-medium text-stone-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="facil-date"
                type="date"
                value={newAvailability.date}
                onChange={(e) => setNewAvailability({ ...newAvailability, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="facil-start" className="block text-sm font-medium text-stone-700 mb-1.5">
                Start Time (Optional)
              </label>
              <Input
                id="facil-start"
                type="time"
                value={newAvailability.startTime}
                onChange={(e) => setNewAvailability({ ...newAvailability, startTime: e.target.value })}
              />
              <p className="text-xs text-stone-500 mt-1">Leave blank for all day</p>
            </div>
            <div>
              <label htmlFor="facil-end" className="block text-sm font-medium text-stone-700 mb-1.5">
                End Time (Optional)
              </label>
              <Input
                id="facil-end"
                type="time"
                value={newAvailability.endTime}
                onChange={(e) => setNewAvailability({ ...newAvailability, endTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" variant="primary" size="sm">
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewAvailability({ date: '', startTime: '', endTime: '' });
                setError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-stone-500 text-sm py-4">Loading availability...</div>
      ) : sortedDates.length === 0 ? (
        <div className="text-stone-500 text-sm py-4 italic">
          No availability set. Add availability to help event creators find you.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="border border-stone-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-stone-900 mb-2">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="space-y-2">
                {groupedAvailability[date].map((avail) => (
                  <div
                    key={avail.id}
                    className="flex items-center justify-between p-2 bg-stone-50 rounded-lg"
                  >
                    <span className="text-sm text-stone-700">
                      {avail.startTime && avail.endTime
                        ? `${avail.startTime.slice(0, 5)} - ${avail.endTime.slice(0, 5)}`
                        : 'Available all day'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(avail.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
