// Mock events data for demo mode — all events have a location (city/area)
import { getEventAttendeeIncrement } from './bookings';

export const mockEvents = [
  {
    id: 'event-1',
    title: 'Weekend Art Workshop',
    imageUrl: '/pexels-cottonbro-4009398.jpg',
    communityIds: ['comm-1'], // primary host
    description:
      'Explore acrylic painting under natural light in our bright studio space. Sam will guide you through composition, color theory, and technique regardless of experience. All materials included. Perfect for beginners and intermediate artists seeking creative expression.',
    category: 'Creative',
    capacity: 15,
    price: 45,
    date: '2025-02-15',
    time: '10:00 AM',
    location: 'Cozy Art Studio',
    locationArea: 'Sydney CBD',
    host: { id: 'host-1', name: 'Sam Chen' },
    attendees: 8,
  },
  {
    id: 'event-2',
    title: 'Morning Yoga Flow',
    imageUrl: '/pexels-polina-zimmerman-3747468.jpg',
    description:
      'Start your day with Marcus\'s energizing flow practice combining breath work, sun salutations, and mindful stretching. This 60-minute session welcomes all levels and builds strength, flexibility, and inner peace. Mats, blocks, and blankets provided.',
    category: 'Relaxation/Wellness',
    capacity: 20,
    price: 18,
    date: '2025-02-10',
    time: '7:00 AM',
    location: 'Yoga & Meditation Room',
    locationArea: 'Inner West',
    host: { id: 'host-2', name: 'Marcus Rodriguez' },
    attendees: 12,
    communityIds: ['comm-1', 'comm-2'], // collaboration
  },
  {
    id: 'event-3',
    title: 'DIY Furniture Restoration',
    imageUrl: '/pexels-rui-dias-469842-1472887.jpg',
    description:
      'Transform tired furniture into treasured pieces! Alex teaches sanding, staining, painting, and finishing techniques using eco-friendly products. Bring your own piece or work on a studio sample. Tools and safety gear provided—no experience needed.',
    category: 'Learning/Study',
    capacity: 8,
    price: 55,
    date: '2025-02-20',
    time: '2:00 PM',
    location: 'Modern Workshop Space',
    locationArea: 'Parramatta',
    host: { id: 'host-3', name: 'Alex Thompson' },
    attendees: 5,
    communityIds: ['comm-4'],
  },
  {
    id: 'event-4',
    title: 'Community Garden Party',
    imageUrl: '/pexels-wilcle-nunes-38713774-27165070.jpg',
    description:
      'Gather in our lush garden for an afternoon of connection and celebration. Bring potluck dishes of your choice, enjoy live acoustic music, play lawn games, and meet neighbors. Family-friendly with activities for all ages. Free entry with $10 suggested donation.',
    category: 'Social/Community',
    capacity: 50,
    price: 10,
    date: '2025-02-18',
    time: '4:00 PM',
    location: 'Garden Party Venue',
    locationArea: 'North Shore',
    host: { id: 'host-4', name: 'Jordan Lee' },
    attendees: 35,
    communityIds: ['comm-2', 'comm-3'], // collaboration
  },
  {
    id: 'event-5',
    title: 'Oracle Card Reading Circle',
    imageUrl: '/pexels-polina-zimmerman-3747468.jpg',
    description: 'Join Iris for an intimate evening of intuitive guidance and group oracle readings. Bring questions or simply open yourself to messages. We\'ll share insights in a confidential, supportive circle. Tea and snacks provided.',
    category: 'Relaxation/Wellness',
    capacity: 12,
    price: 25,
    date: '2025-02-22',
    time: '6:00 PM',
    location: 'Yoga & Meditation Room',
    locationArea: 'Inner West',
    host: { id: 'host-1', name: 'Sam Chen' },
    attendees: 6,
    communityIds: ['comm-1', 'comm-2'], // collaboration
  },
  {
    id: 'event-6',
    title: 'Sound Bath Session',
    imageUrl: '/pexels-yankrukov-9072394.jpg',
    description: 'Lie back and surrender to healing vibrations from Luna\'s collection of gongs, Tibetan singing bowls, and crystal instruments. This 75-minute sound immersion promotes deep relaxation, stress relief, and energetic rebalancing. Yoga mats and blankets provided.',
    category: 'Relaxation/Wellness',
    capacity: 15,
    price: 35,
    date: '2025-02-25',
    time: '7:30 PM',
    location: 'Private Music Studio',
    locationArea: 'Sydney CBD',
    host: { id: 'host-2', name: 'Marcus Rodriguez' },
    attendees: 10,
    communityIds: ['comm-2'],
  },
  {
    id: 'event-7',
    title: 'Interfaith Spiritual Gathering',
    imageUrl: '/pexels-wilcle-nunes-38713774-27165070.jpg',
    description: 'Our annual community celebration! Enjoy ceremonies, classical music performances, international cuisine, colorful activities, and children\'s workshops. Dress in festive attire. Community members welcome their families and friends from all backgrounds.',
    category: 'Social/Community',
    capacity: 200,
    price: 0,
    date: '2025-03-01',
    time: '9:00 AM',
    location: 'Garden Party Venue',
    locationArea: 'North Shore',
    host: { id: 'host-4', name: 'Jordan Lee' },
    attendees: 150,
    communityIds: ['comm-3'],
  },
  {
    id: 'event-8',
    title: 'Cultural Language Exchange',
    imageUrl: '/pexels-roman-odintsov-8063880.jpg',
    description: 'Join Maya for conversational language practice in a relaxed, supportive environment. Whether you\'re learning or reviving your skills, we\'ll practice speaking, share cultural stories, and enjoy refreshments. Beginner to advanced welcomed equally.',
    category: 'Learning/Study',
    capacity: 20,
    price: 5,
    date: '2025-02-28',
    time: '5:00 PM',
    location: 'Quiet Study Library',
    locationArea: 'Parramatta',
    host: { id: 'host-6', name: 'Maya Patel' },
    attendees: 12,
    communityIds: ['comm-4'],
  },
  {
    id: 'event-9',
    title: 'Creative Social Paint Night',
    imageUrl: '/pexels-cottonbro-4009398.jpg',
    description: 'Create art without judgment in this joyful evening hosted by Sam! Sip wine or tea, paint to music, and celebrate your creative expression with friends. All skill levels welcome. Canvas, paints, snacks, and beverages included.',
    category: 'Creative',
    capacity: 16,
    price: 40,
    date: '2025-02-24',
    time: '6:00 PM',
    location: 'Cozy Art Studio',
    locationArea: 'Sydney CBD',
    host: { id: 'host-1', name: 'Sam Chen' },
    attendees: 8,
    communityIds: ['comm-1'],
  },
  // Demo host events (host.id === 'demo-host-1')
  {
    id: 'event-demo-1',
    title: 'Demo Welcome Workshop',
    imageUrl: '/pexels-cottonbro-4009398.jpg',
    description: 'A sample event by Demo Host. Come try the platform and meet the demo community.',
    category: 'Social/Community',
    capacity: 20,
    price: 0,
    date: '2025-03-15',
    time: '2:00 PM',
    location: 'Demo Host Studio',
    locationArea: 'Sydney',
    host: { id: 'demo-host-1', name: 'Demo Host' },
    attendees: 5,
    communityIds: ['comm-demo'],
  },
  {
    id: 'event-demo-2',
    title: 'Demo Community Meetup',
    imageUrl: '/pexels-wilcle-nunes-38713774-27165070.jpg',
    description: 'Monthly meetup for the demo community. All members welcome.',
    category: 'Social/Community',
    capacity: 30,
    price: 0,
    date: '2025-03-22',
    time: '6:00 PM',
    location: 'Demo Community Hall',
    locationArea: 'Sydney',
    host: { id: 'demo-host-1', name: 'Demo Host' },
    attendees: 12,
    communityIds: ['comm-demo'],
  },
];

export const getMockEvent = (id) => {
  return mockEvents.find((event) => event.id === id);
};

function parseMockTime(t) {
  if (!t) return '12:00:00';
  const am = /^(\d{1,2}):(\d{2})\s*AM$/i.exec(t);
  if (am) {
    const h = Number(am[1]) === 12 ? 0 : Number(am[1]);
    return `${String(h).padStart(2, '0')}:${am[2]}:00`;
  }
  const pm = /^(\d{1,2}):(\d{2})\s*PM$/i.exec(t);
  if (pm) {
    const h = Number(pm[1]) === 12 ? 12 : Number(pm[1]) + 12;
    return `${String(h).padStart(2, '0')}:${pm[2]}:00`;
  }
  return '12:00:00';
}

/** Full event detail for loader (instant load without API) */
export function getMockEventDetail(id) {
  const mockEvent = getMockEvent(id);
  if (!mockEvent) return null;
  const timeStr = mockEvent.date ? `${mockEvent.date}T${parseMockTime(mockEvent.time)}` : null;
  const startAt = timeStr ? (() => {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  })() : null;
  const attendees = (mockEvent.attendees ?? 0) + getEventAttendeeIncrement(mockEvent.id);
  return {
    event: {
      id: mockEvent.id,
      title: mockEvent.title,
      description: mockEvent.description,
      startAt,
      endAt: null,
      capacity: mockEvent.capacity,
      visibility: 'public',
      placeId: null,
      placeTitle: mockEvent.location,
      placeAddress: mockEvent.locationArea,
      createdBy: mockEvent.host?.id || null,
      creatorName: mockEvent.host?.name || null,
      communityId: mockEvent.communityIds?.[0] || null,
      attendees,
    },
  };
}

export const LOCATION_OPTIONS = ['All', 'Sydney CBD', 'Inner West', 'North Shore', 'Parramatta'];
