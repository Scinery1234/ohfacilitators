/**
 * FacilitatorBookingCalendar Component
 * Shows facilitator availability + community alignment
 * Primary signal: facilitator availability, Secondary: community/venue signals
 */

import { useState, useEffect } from 'react';
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

export default function FacilitatorBookingCalendar({
  facilitatorId,
  communityId,
  venueId,
  hostId,
  onSelectDate,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [intelligence, setIntelligence] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showCommunitySignal, setShowCommunitySignal] = useState(true);
  const [showVenueSignal, setShowVenueSignal] = useState(true);
  const [showHostSignal, setShowHostSignal] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!facilitatorId) return;
    loadIntelligence();
  }, [facilitatorId, communityId, venueId, hostId, year, month]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      const data = await getSchedulingIntelligence({
        month: month + 1,
        year,
        facilitatorId,
        communityId,
        venueId,
        hostId,
      });
      setIntelligence(data || {});
    } catch (err) {
      console.error('Failed to load facilitator intelligence:', err);
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
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getFacilitatorColor = (status) => {
    if (status === 'AVAILABLE') return 'bg-green-100 border-green-300';
    if (status === 'TENTATIVE') return 'bg-amber-100 border-amber-300';
    if (status === 'UNAVAILABLE' || status === 'BLOCKED') return 'bg-stone-200 border-stone-400';
    return 'bg-stone-100 border-stone-300';
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    const data = intelligence[dateStr];
    if (data?.facilitatorStatus === 'UNAVAILABLE' || data?.facilitatorStatus === 'BLOCKED') return;
    setSelectedDate(dateStr);
    setShowPanel(true);
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
            <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">Facilitator Booking Calendar</h2>
            <p className="text-stone-600">See facilitator availability and alignment</p>
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

        {/* Toggle Controls */}
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCommunitySignal}
              onChange={(e) => setShowCommunitySignal(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-stone-700">Show Community Signal</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showVenueSignal}
              onChange={(e) => setShowVenueSignal(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-stone-700">Show Venue Signal</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHostSignal}
              onChange={(e) => setShowHostSignal(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-stone-700">Show Host Signal</span>
          </label>
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
            const facilitatorStatus = data.facilitatorStatus || 'UNAVAILABLE';
            const percentage = data.communityAvailabilityPercentage || 0;
            const venueAvailable = data.venueAvailable;
            const hostAvailable = data.hostAvailable !== false;
            const isTentative = facilitatorStatus === 'TENTATIVE';
            const isClickable = facilitatorStatus === 'AVAILABLE' || facilitatorStatus === 'TENTATIVE';

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(date)}
                disabled={!isClickable}
                className={`
                  aspect-square min-h-[120px] p-3 rounded-xl border-2 transition-all duration-200
                  ${getFacilitatorColor(facilitatorStatus)}
                  ${isClickable ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  relative overflow-hidden
                  ${isTentative ? 'opacity-80' : ''}
                `}
                style={isTentative ? {
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251, 191, 36, 0.1) 10px, rgba(251, 191, 36, 0.1) 20px)'
                } : {}}
              >
                {/* Date number */}
                <div className="text-left text-sm font-semibold text-stone-900 mb-2">
                  {date.getDate()}
                </div>

                {/* Facilitator status */}
                <div className="text-center mb-2">
                  <div className="text-xs font-semibold text-stone-700 mb-1">
                    {facilitatorStatus === 'AVAILABLE'
                      ? 'Available'
                      : facilitatorStatus === 'TENTATIVE'
                      ? 'Tentative'
                      : 'Unavailable'}
                  </div>
                </div>

                {/* Community availability badge */}
                {showCommunitySignal && communityId && percentage > 0 && (
                  <div className="absolute top-1 right-1 bg-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-stone-900 border border-stone-300">
                    {percentage}%
                  </div>
                )}

                {/* Venue indicator */}
                {showVenueSignal && venueId && venueAvailable && (
                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-600 rounded-full border border-white"></div>
                )}

                {/* Host conflict indicator */}
                {showHostSignal && !hostAvailable && (
                  <div className="absolute bottom-1 left-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                    Host
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-sm pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
            <span className="text-stone-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-300"></div>
            <span className="text-stone-600">Tentative</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-stone-200 border-2 border-stone-400"></div>
            <span className="text-stone-600">Unavailable</span>
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
                <h4 className="font-semibold text-stone-900 mb-2">Facilitator Status</h4>
                <p className={
                  selectedData.facilitatorStatus === 'AVAILABLE'
                    ? 'text-green-600 font-semibold'
                    : selectedData.facilitatorStatus === 'TENTATIVE'
                    ? 'text-amber-600 font-semibold'
                    : 'text-red-600 font-semibold'
                }>
                  {selectedData.facilitatorStatus === 'AVAILABLE'
                    ? '✓ Available'
                    : selectedData.facilitatorStatus === 'TENTATIVE'
                    ? '⚠ Tentative'
                    : '✗ Unavailable'}
                </p>
              </div>

              {showCommunitySignal && communityId && (
                <div>
                  <h4 className="font-semibold text-stone-900 mb-2">Community Availability</h4>
                  <div className="text-2xl font-bold text-stone-900 mb-1">
                    {selectedData.communityAvailabilityPercentage}%
                  </div>
                  <p className="text-sm text-stone-600">
                    {selectedData.communityAvailableCount} of {selectedData.communityTotal} members available
                  </p>
                </div>
              )}

              {showVenueSignal && venueId && (
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

              {showHostSignal && selectedData.hostAvailable !== null && (
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

              {onSelectDate && (
                <Button
                  onClick={() => {
                    onSelectDate(selectedDate, selectedData);
                    setShowPanel(false);
                  }}
                  variant="primary"
                  className="w-full"
                >
                  Select This Date
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
