import { useState, useEffect, useRef } from 'react';
import {
  getMemberAvailability,
  createMemberAvailability,
  deleteMemberAvailability,
  getMemberAvailabilityCount,
} from '@/api/availability';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';

export default function MemberAvailabilityMarker({ communityId }) {
  const { user } = useAuth();
  const [myAvailability, setMyAvailability] = useState([]);
  const [availabilityCounts, setAvailabilityCounts] = useState({}); // date -> count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    if (!communityId || !user) return;
    loadAvailability();
  }, [communityId, user]);

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
      const result = await getMemberAvailability(user.id, communityId);
      const availability = result.availability || [];
      setMyAvailability(availability);
      
      // Load counts for dates we're tracking (batch requests)
      const dates = [...new Set(availability.map((a) => a.date))];
      if (dates.length === 0) {
        setAvailabilityCounts({});
        return;
      }

      // Fetch counts in parallel but limit concurrent requests
      const counts = {};
      const batchSize = 5;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (date) => {
            try {
              const count = await getMemberAvailabilityCount(communityId, date);
              counts[date] = count;
            } catch {
              counts[date] = 0;
            }
          })
        );
      }
      setAvailabilityCounts(counts);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (date) => {
    if (!date || !communityId) return;
    
    const existing = myAvailability.find((a) => a.date === date);
    
    try {
      setError('');
      setSuccess('');
      
      if (existing) {
        await deleteMemberAvailability(existing.id);
        setSuccess('Availability removed');
        // Update count after deletion
        try {
          const count = await getMemberAvailabilityCount(communityId, date);
          setAvailabilityCounts((prev) => ({ ...prev, [date]: count }));
        } catch {}
      } else {
        await createMemberAvailability({ date, communityId });
        setSuccess('Availability marked');
        // Fetch count for newly added date
        try {
          const count = await getMemberAvailabilityCount(communityId, date);
          setAvailabilityCounts((prev) => ({ ...prev, [date]: count }));
        } catch {}
      }
      
      // Refresh availability
      await loadAvailability();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update availability');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleAddDate = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    await handleToggleAvailability(selectedDate);
    setSelectedDate('');
  };

  const isAvailable = (date) => {
    return myAvailability.some((a) => a.date === date);
  };

  // Group by date and sort
  const sortedDates = [...new Set(myAvailability.map((a) => a.date))].sort();

  if (!user) return null;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-stone-900 mb-4">Mark Your Availability</h2>
      <p className="text-sm text-stone-600 mb-4">
        Mark dates when you're available. This helps event creators see community interest for specific dates.
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

      <form onSubmit={handleAddDate} className="mb-6 flex flex-wrap gap-3">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 min-w-[200px]"
          placeholder="Select a date"
        />
        <Button type="submit" variant="primary" size="sm">
          {selectedDate && isAvailable(selectedDate) ? 'Remove' : 'Mark Available'}
        </Button>
      </form>

      {loading ? (
        <div className="text-stone-500 text-sm py-4">Loading availability...</div>
      ) : sortedDates.length === 0 ? (
        <div className="text-stone-500 text-sm py-4 italic">
          No dates marked yet. Mark dates when you're available to help event creators plan.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDates.map((date) => {
            const count = availabilityCounts[date] || 0;
            return (
              <div
                key={date}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-900">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-stone-500 bg-white px-2 py-0.5 rounded-full">
                      {count} {count === 1 ? 'member' : 'members'} available
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => handleToggleAvailability(date)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
