/**
 * EventHostCalendar Component
 * Large availability-aware calendar showing community availability density
 * Each date cell displays availability percentage, member count, facilitator avatars
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSchedulingIntelligence } from '@/api/scheduling-intelligence';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventHostCalendar({ communityId, hostId, onCreateEvent }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [intelligence, setIntelligence] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!communityId) return;
    loadIntelligence();
  }, [communityId, year, month]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      const data = await getSchedulingIntelligence({
        month: month + 1,
        year,
        communityId,
        hostId,
      });
      setIntelligence(data || {});
    } catch (err) {
      console.error('Failed to load scheduling intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getAvailabilityColor = (percentage) => {
    if (percentage === 0) return 'from-stone-100 to-stone-200';
    if (percentage < 30) return 'from-red-200 to-red-400';
    if (percentage < 60) return 'from-amber-200 to-amber-400';
    if (percentage < 80) return 'from-green-200 to-green-300';
    return 'from-green-300 to-green-500';
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowPanel(true);
  };

  const handleCreateEvent = () => {
    if (!selectedDate || !onCreateEvent) return;
    onCreateEvent({
      date: selectedDate,
      ...intelligence[selectedDate],
    });
    setShowPanel(false);
  };

  const days = getDaysInMonth();
  const selectedData = selectedDate ? intelligence[selectedDate] : null;

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading calendar...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">Event Host Calendar</h2>
            <p className="text-stone-600">See when your community is most available</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              variant="outline"
            >
              ← Prev
            </Button>
            <Button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              variant="outline"
            >
              Next →
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-stone-900">
            {MONTH_NAMES[month]} {year}
          </h3>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {DAY_NAMES.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-stone-700 p-2">
              {day}
            </div>
          ))}
          {days.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="aspect-square"></div>;
            }

            const dateStr = date.toISOString().split('T')[0];
            const data = intelligence[dateStr] || {};
            const percentage = data.communityAvailabilityPercentage || 0;
            const availableCount = data.communityAvailableCount || 0;
            const total = data.communityTotal || 0;
            const facilitators = data.availableFacilitators || [];
            const hostAvailable = data.hostAvailable !== false;

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(date)}
                className={`
                  aspect-square min-h-[120px] p-3 rounded-xl border-2 transition-all duration-200
                  bg-gradient-to-br ${getAvailabilityColor(percentage)}
                  hover:scale-105 hover:shadow-lg
                  ${!hostAvailable ? 'border-red-400' : 'border-transparent'}
                  cursor-pointer relative overflow-hidden
                `}
              >
                {/* Date number */}
                <div className="text-left text-sm font-semibold text-stone-900 mb-2">
                  {date.getDate()}
                </div>

                {/* Host unavailable indicator */}
                {!hostAvailable && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-white"></div>
                )}

                {/* Center: Percentage */}
                <div className="text-center mb-1">
                  <div className="text-2xl font-bold text-stone-900">{percentage}%</div>
                  <div className="text-xs text-stone-700 mt-0.5">
                    {availableCount} of {total}
                  </div>
                </div>

                {/* Bottom: Facilitator avatars */}
                {facilitators.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {facilitators.slice(0, 3).map((fac, i) => (
                      <div
                        key={fac.id}
                        className="w-6 h-6 rounded-full bg-stone-700 border-2 border-white flex items-center justify-center text-xs text-white font-semibold"
                        style={{ marginLeft: i > 0 ? '-4px' : '0' }}
                        title={fac.name}
                      >
                        {fac.name.charAt(0)}
                      </div>
                    ))}
                    {facilitators.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-stone-600 border-2 border-white flex items-center justify-center text-xs text-white font-semibold">
                        +{facilitators.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Venue indicator */}
                {data.venueAvailable && (
                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-600 rounded-full border border-white"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-sm pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-red-200 to-red-400"></div>
            <span className="text-stone-600">Low (0-30%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-200 to-amber-400"></div>
            <span className="text-stone-600">Medium (30-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-200 to-green-300"></div>
            <span className="text-stone-600">High (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-300 to-green-500"></div>
            <span className="text-stone-600">Very High (80%+)</span>
          </div>
        </div>
      </Card>

      {/* Side Panel */}
      {showPanel && selectedData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-stone-900">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-stone-900 mb-2">Community Availability</h4>
                <div className="text-3xl font-bold text-stone-900 mb-1">
                  {selectedData.communityAvailabilityPercentage}%
                </div>
                <p className="text-sm text-stone-600">
                  {selectedData.communityAvailableCount} of {selectedData.communityTotal} members available
                </p>
              </div>

              {selectedData.availableFacilitators && selectedData.availableFacilitators.length > 0 && (
                <div>
                  <h4 className="font-semibold text-stone-900 mb-2">Available Facilitators</h4>
                  <div className="space-y-2">
                    {selectedData.availableFacilitators.map((fac) => (
                      <div key={fac.id} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-white text-sm font-semibold">
                          {fac.name.charAt(0)}
                        </div>
                        <span className="text-stone-700">{fac.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedData.venueAvailable !== null && (
                <div>
                  <h4 className="font-semibold text-stone-900 mb-2">Venue Status</h4>
                  <p className="text-stone-700">
                    {selectedData.venueAvailable ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : (
                      <span className="text-red-600">✗ {selectedData.venueStatus || 'Unavailable'}</span>
                    )}
                  </p>
                </div>
              )}

              {selectedData.hostAvailable !== null && (
                <div>
                  <h4 className="font-semibold text-stone-900 mb-2">Host Status</h4>
                  <p className="text-stone-700">
                    {selectedData.hostAvailable ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : (
                      <span className="text-red-600">✗ Unavailable</span>
                    )}
                  </p>
                </div>
              )}

              {onCreateEvent && (
                <Button onClick={handleCreateEvent} variant="primary" className="w-full">
                  Create Event from This Date
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
