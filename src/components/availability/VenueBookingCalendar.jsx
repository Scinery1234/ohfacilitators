/**
 * VenueBookingCalendar Component
 * Shows venue availability + community signal for booking decisions
 * Primary signal: venue availability, Secondary: community availability
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

export default function VenueBookingCalendar({ venueId, communityId, hostId, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [intelligence, setIntelligence] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!venueId) return;
    loadIntelligence();
  }, [venueId, communityId, hostId, year, month]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      const data = await getSchedulingIntelligence({
        month: month + 1,
        year,
        venueId,
        communityId,
        hostId,
      });
      setIntelligence(data || {});
    } catch (err) {
      console.error('Failed to load venue intelligence:', err);
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

  const getVenueColor = (status) => {
    if (status === 'AVAILABLE') return 'bg-green-100 border-green-300';
    if (status === 'BOOKED') return 'bg-red-100 border-red-300';
    if (status === 'BLOCKED') return 'bg-stone-200 border-stone-400';
    return 'bg-stone-100 border-stone-300';
  };

  const getCommunityTint = (percentage) => {
    if (percentage === 0) return '';
    if (percentage < 30) return 'opacity-30';
    if (percentage < 60) return 'opacity-50';
    if (percentage < 80) return 'opacity-70';
    return 'opacity-90';
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    const data = intelligence[dateStr];
    if (data?.venueStatus === 'BOOKED' || data?.venueStatus === 'BLOCKED') return;
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
            <h2 className="text-2xl font-display font-bold text-stone-900 mb-2">Venue Booking Calendar</h2>
            <p className="text-stone-600">See venue availability and community demand</p>
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
            const venueStatus = data.venueStatus || 'UNAVAILABLE';
            const percentage = data.communityAvailabilityPercentage || 0;
            const facilitators = data.availableFacilitators || [];
            const hostAvailable = data.hostAvailable !== false;
            const isClickable = venueStatus === 'AVAILABLE';

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(date)}
                disabled={!isClickable}
                className={`
                  aspect-square min-h-[120px] p-3 rounded-xl border-2 transition-all duration-200
                  ${getVenueColor(venueStatus)}
                  ${isClickable ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  relative overflow-hidden
                `}
              >
                {/* Date number */}
                <div className="text-left text-sm font-semibold text-stone-900 mb-2">
                  {date.getDate()}
                </div>

                {/* Venue status label */}
                <div className="text-center mb-2">
                  <div className="text-xs font-semibold text-stone-700 mb-1">
                    {venueStatus === 'AVAILABLE' ? 'Available' : venueStatus === 'BOOKED' ? 'Booked' : 'Blocked'}
                  </div>
                </div>

                {/* Community availability overlay */}
                {venueStatus === 'AVAILABLE' && communityId && (
                  <div className={`absolute inset-0 bg-gradient-to-br from-green-200 to-green-400 ${getCommunityTint(percentage)} pointer-events-none`}>
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <div className="text-sm font-bold text-stone-900">{percentage}%</div>
                      <div className="text-xs text-stone-700">
                        {data.communityAvailableCount || 0} members
                      </div>
                    </div>
                  </div>
                )}

                {/* Facilitator avatars */}
                {venueStatus === 'AVAILABLE' && facilitators.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    {facilitators.slice(0, 3).map((fac, i) => (
                      <div
                        key={fac.id}
                        className="w-5 h-5 rounded-full bg-stone-700 border border-white flex items-center justify-center text-xs text-white font-semibold"
                        style={{ marginLeft: i > 0 ? '-4px' : '0' }}
                        title={fac.name}
                      >
                        {fac.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Host unavailable badge */}
                {venueStatus === 'AVAILABLE' && !hostAvailable && (
                  <div className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
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
            <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
            <span className="text-stone-600">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-stone-200 border-2 border-stone-400"></div>
            <span className="text-stone-600">Blocked</span>
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
                <h4 className="font-semibold text-stone-900 mb-2">Venue Status</h4>
                <p className="text-green-600 font-semibold">✓ Available</p>
              </div>

              {communityId && (
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
