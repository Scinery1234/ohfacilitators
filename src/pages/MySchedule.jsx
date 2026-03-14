import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMySchedule } from '@/api/schedule';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MySchedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMySchedule()
      .then((data) => setSchedule(data.schedule ?? []))
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load schedule'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-stone-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        My Schedule
      </h1>
      <p className="mt-2 text-stone-600">
        Events you created, collaborate on, or are attending.
      </p>

      {schedule.length === 0 ? (
        <EmptyState
          title="Nothing on your schedule"
          message="Events you host, facilitate, or attend will appear here."
          className="mt-12"
        />
      ) : (
        <div className="mt-8 space-y-4">
          {schedule.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">{formatDate(item.startAt)}</p>
                  {item.placeTitle && (
                    <p className="mt-1 text-sm text-stone-600">@{item.placeTitle}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
                      {item.role}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                      {item.status}
                    </span>
                  </div>
                </div>
                {item.type === 'event' && (
                  <Link
                    to={`/listings/event/${item.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
                  >
                    View event →
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
