// Host bios and profile info — extends host data with bio, location, etc.
export const hostProfiles = {
  'host-1': {
    bio: 'Artist and community organiser based in Sydney. I love bringing people together through creative workshops—whether it\'s painting, drawing, or casual art evenings. My studio has been a home for the Queer South Asian community and I\'m always excited to welcome new faces.',
    location: 'Sydney CBD',
    tagline: 'Artist & workshop facilitator',
    joinedYear: 2023,
  },
  'host-2': {
    bio: 'Yoga teacher and sound healer with 10+ years of experience. I believe in the power of stillness and connection—through yoga flows, meditation circles, and sound baths. My space is designed for restoration and community healing.',
    location: 'Inner West, Sydney',
    tagline: 'Yoga teacher & sound healer',
    joinedYear: 2022,
  },
  'host-3': {
    bio: 'Maker and DIY enthusiast. I run workshops on furniture restoration, woodwork, and crafts. Whether you\'re a beginner or experienced, my workshop is a place to learn, create, and share skills with the Sydney Sri Lankan Tamil community.',
    location: 'Parramatta',
    tagline: 'Maker & workshop host',
    joinedYear: 2023,
  },
  'host-4': {
    bio: 'I host community gatherings and cultural events in my garden—from temple festivals to neighbourhood parties. My space is for connection, celebration, and bringing people together. Part of the Kamalalaya Hindu and Sydney Spiritual communities.',
    location: 'North Shore, Sydney',
    tagline: 'Community & cultural events host',
    joinedYear: 2022,
  },
  'host-5': {
    bio: 'Music educator and recording artist. My studio is a creative hub for musicians—practice rooms, recording sessions, and sound bath experiences. I love supporting artists and spiritual practitioners in the Sydney Spiritual Community.',
    location: 'Sydney CBD',
    tagline: 'Music educator & studio host',
    joinedYear: 2023,
  },
  'host-6': {
    bio: 'Librarian and language advocate. I host quiet study sessions and Tamil language meetups at my library space. A peaceful place for learning, reading, and cultural exchange within the Sydney Sri Lankan Tamil and Kamalalaya Hindu communities.',
    location: 'Parramatta',
    tagline: 'Librarian & language meetup host',
    joinedYear: 2023,
  },
};

export function getHostProfile(hostId) {
  return hostProfiles[hostId] ?? null;
}
