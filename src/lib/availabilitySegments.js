/**
 * Four fixed segments per day for availability (simplifies UI).
 * Morning 6–10, Midday 10–2, Afternoon 2–6, Evening 6–10.
 */

export const DAY_SEGMENTS = [
  { id: 'morning', label: 'Morning', start: '06:00', end: '10:00', short: '6–10' },
  { id: 'midday', label: 'Midday', start: '10:00', end: '14:00', short: '10–2' },
  { id: 'afternoon', label: 'Afternoon', start: '14:00', end: '18:00', short: '2–6' },
  { id: 'evening', label: 'Evening', start: '18:00', end: '22:00', short: '6–10' },
];

export function getSegmentForSlot(startTime, endTime) {
  const s = (startTime || '').slice(0, 5);
  const e = (endTime || '').slice(0, 5);
  return DAY_SEGMENTS.find((seg) => seg.start === s && seg.end === e) ?? null;
}

export function formatSegmentRange(seg) {
  return seg ? `${seg.short}` : '';
}

const SEGMENT_BY_MINUTES = {};
DAY_SEGMENTS.forEach((seg) => {
  const startMin = parseInt(seg.start.slice(0, 2), 10) * 60 + parseInt(seg.start.slice(3, 5), 10);
  const endMin = parseInt(seg.end.slice(0, 2), 10) * 60 + parseInt(seg.end.slice(3, 5), 10);
  SEGMENT_BY_MINUTES[`${startMin}-${endMin}`] = seg.short;
});

/** Format effective available segments (array of { start, end } in minutes) for display */
export function formatEffectiveSegments(availableSegments) {
  if (!availableSegments || availableSegments.length === 0) return '';
  const sorted = [...availableSegments].sort((a, b) => a.start - b.start);
  return sorted
    .map(({ start, end }) => SEGMENT_BY_MINUTES[`${start}-${end}`] || `${Math.floor(start / 60)}–${Math.floor(end / 60)}`)
    .join(' ');
}
