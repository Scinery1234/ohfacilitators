/**
 * CommunityAvailabilityHeatmap Component
 * Heatmap showing aggregated member availability for community managers
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommunityAvailabilityHeatmap } from '@/api/availability-unified';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PERIODS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
];

export default function CommunityAvailabilityHeatmap({ communityId, onCreateEvent }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [heatmap, setHeatmap] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    loadHeatmap();
  }, [communityId]);

  const loadHeatmap = async () => {
    try {
      setLoading(true);
      const data = await getCommunityAvailabilityHeatmap(communityId, { includeVenues: true });
      setHeatmap(data.heatmap || []);
      setTotalMembers(data.totalMembers || 0);
      // Store availableUsers in selectedSlot when clicked
      if (data.heatmap) {
        data.heatmap.forEach((slot) => {
          if (slot.availableUsers) {
            // Store for later use
          }
        });
      }
    } catch (err) {
      console.error('Failed to load heatmap:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIntensity = (percentage) => {
    // Return intensity level 0-5 based on percentage
    if (percentage === 0) return 0;
    if (percentage < 20) return 1;
    if (percentage < 40) return 2;
    if (percentage < 60) return 3;
    if (percentage < 80) return 4;
    return 5;
  };

  const getCellColor = (percentage) => {
    const intensity = getIntensity(percentage);
    const colors = [
      'bg-stone-100', // 0%
      'bg-green-50', // 1-19%
      'bg-green-100', // 20-39%
      'bg-green-200', // 40-59%
      'bg-green-300', // 60-79%
      'bg-green-400', // 80-100%
    ];
    return colors[intensity];
  };

  const getTextColor = (percentage) => {
    return percentage > 50 ? 'text-white' : 'text-stone-900';
  };

  const handleCellClick = (slot) => {
    setSelectedSlot(slot);
    setShowDetails(true);
  };

  const handleCreateEvent = () => {
    if (!selectedSlot || !onCreateEvent) return;

    // Calculate a sample date for next occurrence of this day
    const today = new Date();
    const currentDay = today.getDay();
    const targetDay = selectedSlot.dayOfWeek === 0 ? 0 : selectedSlot.dayOfWeek; // Convert to 0-6 (Sunday=0)
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);

    // Determine time based on period
    let startTime = '09:00';
    let endTime = '12:00';
    if (selectedSlot.period === 'AFTERNOON') {
      startTime = '12:00';
      endTime = '17:00';
    } else if (selectedSlot.period === 'EVENING') {
      startTime = '17:00';
      endTime = '21:00';
    }

    onCreateEvent({
      date: nextDate.toISOString().split('T')[0],
      startTime,
      endTime,
      dayOfWeek: selectedSlot.dayOfWeek,
      period: selectedSlot.period,
      availableCount: selectedSlot.availableCount,
    });

    setShowDetails(false);
    setSelectedSlot(null);
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading availability heatmap...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">Community Availability</h2>
          <p className="text-stone-600">
            See when members are most available. Darker green = more members available.
          </p>
          <p className="text-sm text-stone-500 mt-1">{totalMembers} total members</p>
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          <span className="text-stone-600">Less available</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`w-6 h-6 rounded ${
                  level === 0
                    ? 'bg-stone-100'
                    : level === 1
                    ? 'bg-green-50'
                    : level === 2
                    ? 'bg-green-100'
                    : level === 3
                    ? 'bg-green-200'
                    : level === 4
                    ? 'bg-green-300'
                    : 'bg-green-400'
                } border border-stone-300`}
              ></div>
            ))}
          </div>
          <span className="text-stone-600">More available</span>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 text-sm font-semibold text-stone-700 border-b border-stone-200">Day</th>
                {PERIODS.map((period) => (
                  <th
                    key={period.value}
                    className="text-center p-3 text-sm font-semibold text-stone-700 border-b border-stone-200"
                  >
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, idx) => {
                const dayOfWeek = idx === 6 ? 0 : idx + 1; // Convert to 0-6 (Sunday=0)
                return (
                  <tr key={day} className="border-b border-stone-100">
                    <td className="p-3 font-medium text-stone-900">{day}</td>
                    {PERIODS.map((period) => {
                      const slot = heatmap.find(
                        (s) => s.dayOfWeek === dayOfWeek && s.period === period.value
                      );
                      const percentage = slot?.percentage || 0;
                      const availableCount = slot?.availableCount || 0;

                      return (
                        <td key={period.value} className="p-3">
                          <button
                            onClick={() => slot && handleCellClick(slot)}
                            className={`
                              w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200
                              ${getCellColor(percentage)} ${getTextColor(percentage)}
                              hover:scale-105 hover:shadow-md
                              ${slot ? 'cursor-pointer' : 'cursor-default opacity-50'}
                            `}
                          >
                            <div>{percentage}%</div>
                            <div className="text-xs mt-1 opacity-75">
                              {availableCount}/{totalMembers || 0}
                            </div>
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
      </Card>

      {/* Details Modal */}
      {showDetails && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-4">
              {selectedSlot.dayName} - {PERIODS.find((p) => p.value === selectedSlot.period)?.label}
            </h3>

            <div className="mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-stone-600">Available Members:</span>
                <span className="font-semibold text-stone-900">
                  {selectedSlot.availableCount} / {totalMembers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-600">Percentage:</span>
                <span className="font-semibold text-stone-900">{selectedSlot.percentage}%</span>
              </div>

              {selectedSlot.availableUsers && selectedSlot.availableUsers.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-stone-900 mb-2">Available Members:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {selectedSlot.availableUsers.map((user) => (
                      <div key={user.id} className="text-sm text-stone-700 py-1">
                        {user.fullName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {onCreateEvent && (
                <Button onClick={handleCreateEvent} variant="primary" className="flex-1">
                  Create Event from This Time
                </Button>
              )}
              <Button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedSlot(null);
                }}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
