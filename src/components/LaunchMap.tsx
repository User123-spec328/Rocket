import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Globe, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LaunchMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (lat: number, lng: number) => void;
}

const presetLocations = [
  { name: 'Vandenberg AFB', lat: 34.7420, lng: -120.5724, country: 'USA' },
  { name: 'Baikonur Cosmodrome', lat: 45.9648, lng: 63.3050, country: 'Kazakhstan' },
  { name: 'Plesetsk Cosmodrome', lat: 62.9575, lng: 40.5770, country: 'Russia' },
  { name: 'Jiuquan Satellite Launch Center', lat: 40.9582, lng: 100.2911, country: 'China' }
];

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14); // Zoom level 14 is a good middle ground
  }, [lat, lng, map]);
  return null;
};

export const LaunchMap: React.FC<LaunchMapProps> = ({ latitude, longitude, onCoordinateChange }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [popupLabel, setPopupLabel] = useState<string>('Loading...');
  const markerRef = useRef<L.Marker>(null);

  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const key = 'e1bc60fed5c848bb9f344e31f65345d7'; // ✅ Replace with your real OpenCage key
      const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${key}&language=en`);
      const data = await res.json();
      const name = data?.results?.[0]?.formatted || 'Unknown Location';
      setPopupLabel(name);
    } catch {
      setPopupLabel('Unknown Location');
    }
  };

  const handlePresetClick = (location: { lat: number; lng: number; name: string }) => {
    setSelectedLocation(location);
    onCoordinateChange(location.lat, location.lng);
    fetchLocationName(location.lat, location.lng);
  };

  useEffect(() => {
    fetchLocationName(latitude, longitude);
  }, [latitude, longitude]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [popupLabel, latitude, longitude]);

  return (
    <div className="bg-transparent border border-gray-700 rounded-xl p-6">

      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-5 h-5 text-red-500" />
        <h3 className="text-xl font-semibold text-white">Launch Site Selection</h3>
      </div>

      {/* 🗺️ Real Interactive Map */}
      <div className="rounded-lg overflow-hidden mb-6 h-[460px] z-0">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap lat={latitude} lng={longitude} />
          <Marker position={[latitude, longitude]} icon={markerIcon} ref={markerRef}>
            <Popup>{popupLabel}</Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* 📍 Famous Launch Sites */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          Famous Launch Sites
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presetLocations.map((location) => (
            <button
              key={location.name}
              onClick={() => handlePresetClick({ ...location, name: location.name })}
              className={`p-3 rounded-lg border text-left transition-all duration-200
                hover:border-red-500 hover:bg-transparent-800
                ${selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                  ? 'border-red-500 bg-transparent-800'
                  : 'border-gray-600 bg-transparent-800/50'
                }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{location.name}</p>
                  <p className="text-xs text-gray-400">{location.country}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 📌 Current Location */}
      <div className="mt-6 p-4 bg-transparent-800 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Current Launch Site</h4>
        <div className="flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm">
            {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
          </span>
        </div>
      </div>
    </div>
  );
};
