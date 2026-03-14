// Centralised image mapping for spaces and events (Vite resolves imports at build time)
import imgArt from '@/assets/pexels-cottonbro-4009398.jpg';
import imgYoga from '@/assets/pexels-polina-zimmerman-3747468.jpg';
import imgWorkshop from '@/assets/pexels-rui-dias-469842-1472887.jpg';
import imgGarden from '@/assets/pexels-wilcle-nunes-38713774-27165070.jpg';
import imgMusic from '@/assets/pexels-yankrukov-9072394.jpg';
import imgLibrary from '@/assets/pexels-roman-odintsov-8063880.jpg';

export const SPACE_IMAGES = {
  'space-1': imgArt,
  'space-2': imgYoga,
  'space-3': imgWorkshop,
  'space-4': imgGarden,
  'space-5': imgMusic,
  'space-6': imgLibrary,
};

const EVENT_IMAGE_BY_LOCATION = {
  'Cozy Art Studio': imgArt,
  'Yoga & Meditation Room': imgYoga,
  'Modern Workshop Space': imgWorkshop,
  'Garden Party Venue': imgGarden,
  'Private Music Studio': imgMusic,
  'Quiet Study Library': imgLibrary,
};

export function getSpaceImage(space) {
  return SPACE_IMAGES[space?.id] || imgArt;
}

/** Only these paths exist in public/; any other imageUrl may 404 */
const KNOWN_IMAGE_PATHS = new Set([
  '/pexels-cottonbro-4009398.jpg', '/pexels-polina-zimmerman-3747468.jpg',
  '/pexels-roman-odintsov-8063880.jpg', '/pexels-rui-dias-469842-1472887.jpg',
  '/pexels-wilcle-nunes-38713774-27165070.jpg', '/pexels-yankrukov-9072394.jpg',
]);

export function getEventImage(event) {
  if (event?.imageUrl && KNOWN_IMAGE_PATHS.has(event.imageUrl)) return event.imageUrl;
  return event?.location ? EVENT_IMAGE_BY_LOCATION[event.location] || imgYoga : imgYoga;
}

const COMMUNITY_IMAGE_BY_AREA = {
  'Sydney CBD': imgArt,
  'Inner West': imgYoga,
  'North Shore': imgGarden,
  'Parramatta': imgLibrary,
};

export function getCommunityImage(community) {
  if (!community) return imgArt;
  if (community.imageUrl && KNOWN_IMAGE_PATHS.has(community.imageUrl)) return community.imageUrl;
  if (community.locationArea && COMMUNITY_IMAGE_BY_AREA[community.locationArea]) {
    return COMMUNITY_IMAGE_BY_AREA[community.locationArea];
  }
  if (community.type === 'open') return imgGarden;
  if (community.type === 'approval') return imgLibrary;
  return imgArt;
}

export { imgArt, imgYoga, imgWorkshop, imgGarden, imgMusic, imgLibrary };
