import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SYDNEY_CENTER = [-33.8688, 151.2093];

function FitBounds({ venues }) {
  const map = useMap();
  const venuesWithCoords = venues.filter((v) => v.lat != null && v.lng != null);

  useEffect(() => {
    if (venuesWithCoords.length === 0) return;
    if (venuesWithCoords.length === 1) {
      map.setView([venuesWithCoords[0].lat, venuesWithCoords[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(venuesWithCoords.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, venuesWithCoords]);

  return null;
}

/**
 * Map of venues (spaces). Shows markers for venues with lat/lng.
 * Public venues show exact address; rough locations are approximate.
 */
export default function VenueMap({ venues }) {
  const venuesWithCoords = venues.filter((v) => v.lat != null && v.lng != null);

  if (venuesWithCoords.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-100 h-[280px] flex items-center justify-center text-stone-500 text-sm">
        No map available — venue locations not yet set
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden h-[280px] sm:h-[320px]">
      <MapContainer
        center={SYDNEY_CENTER}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds venues={venuesWithCoords} />
        {venuesWithCoords.map((venue) => (
          <Marker key={venue.id} position={[venue.lat, venue.lng]}>
            <Popup>
              <Link
                to={`/venues/${venue.id}`}
                className="font-semibold text-stone-900 hover:text-primary-200 transition-colors"
              >
                {venue.title}
              </Link>
              <p className="text-sm text-stone-600 mt-1">
                {venue.addressPublic && venue.address
                  ? venue.address
                  : `${venue.locationArea || venue.location} (approximate area)`}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
