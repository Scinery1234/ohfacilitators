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

function FitBounds({ places }) {
  const map = useMap();
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);

  useEffect(() => {
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat, withCoords[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(withCoords.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, withCoords]);

  return null;
}

/**
 * Map of places with pins. Links to /places/:id.
 * @param {Object} props
 * @param {Array} props.places - Places with lat, lng, id, title, address
 * @param {string} [props.title] - Optional section title
 * @param {number} [props.height] - Map height in px (default 320)
 */
export default function PlacesMap({ places = [], title, height = 320 }) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);

  if (withCoords.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-500 text-sm" style={{ height }}>
        No map — add addresses and pin places to see them on the map
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold text-stone-900 mb-3">{title}</h3>
      )}
      <div className="rounded-2xl border border-stone-200 overflow-hidden" style={{ height }}>
        <MapContainer
          center={SYDNEY_CENTER}
          zoom={11}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds places={withCoords} />
          {withCoords.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                <Link
                  to={`/places/${place.id}`}
                  className="font-semibold text-stone-900 hover:text-primary-200 transition-colors"
                >
                  {place.title}
                </Link>
                {place.address && (
                  <p className="text-sm text-stone-500 mt-1">{place.address}</p>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
