/**
 * MyAvailability Component
 * Weekly grid view for members, facilitators, and hosts to manage their availability
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvailabilityProfile,
  createAvailabilityProfile,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PERIODS = [
  { value: 'MORNING', label: 'Morning', startTime: '09:00', endTime: '12:00' },
  { value: 'AFTERNOON', label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
  { value: 'EVENING', label: 'Evening', startTime: '17:00', endTime: '21:00' },
];

export default function MyAvailability() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [customTimeOpen, setCustomTimeOpen] = useState(null); // { dayOfWeek, period }
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('17:00');

  useEffect(() => {
    if (!user) return;
    loadAvailability();
  }, [user]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      let { profile, slots: profileSlots } = await getAvailabilityProfile('USER', user.id);
      if (!profile) {
        const result = await createAvailabilityProfile({ ownerType: 'USER', ownerId: user.id });
        profile = result.profile;
        profileSlots = [];
      }
      setSlots(profileSlots || []);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeek = (dayName) => {
    const index = DAYS.indexOf(dayName);
    return index === -1 ? 0 : index === 6 ? 0 : index + 1; // Convert to 0-6 (Sunday=0)
  };

  const isSlotActive = (dayOfWeek, period) => {
    return slots.some(
      (slot) => slot.dayOfWeek === dayOfWeek && slot.period === period && slot.status === 'AVAILABLE'
    );
  };

  const toggleSlot = async (dayOfWeek, period) => {
    if (!user) return;

    const existingSlot = slots.find((s) => s.dayOfWeek === dayOfWeek && s.period === period);
    const periodConfig = PERIODS.find((p) => p.value === period);

    if (existingSlot) {
      // Delete slot
      try {
        setSaving(true);
        await deleteAvailabilitySlot(existingSlot.id);
        setSlots(slots.filter((s) => s.id !== existingSlot.id));
      } catch (err) {
        console.error('Failed to delete slot:', err);
        alert('Failed to update availability');
      } finally {
        setSaving(false);
      }
    } else {
      // Create slot
      try {
        setSaving(true);
        const { slot } = await createAvailabilitySlot({
          ownerType: 'USER',
          ownerId: user.id,
          dayOfWeek,
          period,
          startTime: periodConfig.startTime,
          endTime: periodConfig.endTime,
          status: 'AVAILABLE',
        });
        setSlots([...slots, slot]);
      } catch (err) {
        console.error('Failed to create slot:', err);
        if (err.response?.status === 409) {
          alert('This time slot conflicts with an existing slot');
        } else {
          alert('Failed to update availability');
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCustomTime = async () => {
    if (!customTimeOpen || !user) return;

    const { dayOfWeek } = customTimeOpen;
    try {
      setSaving(true);
      const { slot } = await createAvailabilitySlot({
        ownerType: 'USER',
        ownerId: user.id,
        dayOfWeek,
        period: 'CUSTOM',
        startTime: customStartTime,
        endTime: customEndTime,
        status: 'AVAILABLE',
      });
      setSlots([...slots, slot]);
      setCustomTimeOpen(null);
    } catch (err) {
      console.error('Failed to create custom slot:', err);
      alert('Failed to add custom time');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading availability...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">My Availability</h2>
        <p className="text-stone-600">Set your weekly availability schedule</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-sm font-semibold text-stone-700 border-b border-stone-200">Day</th>
              {PERIODS.map((period) => (
                <th key={period.value} className="text-center p-3 text-sm font-semibold text-stone-700 border-b border-stone-200">
                  {period.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, idx) => {
              const dayOfWeek = getDayOfWeek(day);
              return (
                <tr key={day} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="p-3 font-medium text-stone-900">{day}</td>
                  {PERIODS.map((period) => {
                    const isActive = isSlotActive(dayOfWeek, period.value);
                    return (
                      <td key={period.value} className="p-3 text-center">
                        <button
                          onClick={() => toggleSlot(dayOfWeek, period.value)}
                          disabled={saving}
                          className={`
                            w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                            ${isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                        >
                          {isActive ? '✓ Available' : 'Not Available'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {customTimeOpen && (
        <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <h3 className="font-semibold text-stone-900 mb-3">Custom Time Range</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
              <input
                type="time"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
              <input
                type="time"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCustomTime} disabled={saving} variant="primary">
                Add
              </Button>
              <Button onClick={() => setCustomTimeOpen(null)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={() => setCustomTimeOpen({ dayOfWeek: 1, period: 'CUSTOM' })} variant="outline">
          + Add Custom Time
        </Button>
      </div>
    </Card>
  );
}
