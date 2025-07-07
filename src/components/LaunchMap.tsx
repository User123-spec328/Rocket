import React, { useState } from 'react';
import { MapPin, Globe, Crosshair } from 'lucide-react';

interface LaunchMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (lat: number, lng: number) => void;
}

export const LaunchMap: React.FC<LaunchMapProps> = ({ latitude, longitude, onCoordinateChange }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const presetLocations = [
    { name: 'Kennedy Space Center', lat: 28.5721, lng: -80.6480, country: 'USA' },
    { name: 'Baikonur Cosmodrome', lat: 45.9648, lng: 63.3050, country: 'Kazakhstan' },
    { name: 'Kourou Space Center', lat: 5.2362, lng: -52.7682, country: 'French Guiana' },
    { name: 'Vandenberg AFB', lat: 34.7420, lng: -120.5724, country: 'USA' },
    { name: 'Plesetsk Cosmodrome', lat: 62.9575, lng: 40.5770, country: 'Russia' },
    { name: 'Jiuquan Satellite Launch Center', lat: 40.9582, lng: 100.2911, country: 'China' }
  ];

  const handlePresetClick = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
    onCoordinateChange(location.lat, location.lng);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-5 h-5 text-red-500" />
        <h3 className="text-xl font-semibold text-white">Launch Site Selection</h3>
      </div>

      {/* World Map Visualization */}
      <div className="relative bg-gray-800 rounded-lg p-4 mb-6 h-64 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <Globe className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Interactive map would be displayed here</p>
            <p className="text-xs mt-1">Current: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°</p>
          </div>
        </div>
        
        {/* Simulated marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-red-400 opacity-75"></div>
          <div className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></div>
        </div>
      </div>

      {/* Preset Locations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          Famous Launch Sites
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presetLocations.map((location) => (
            <button
              key={location.name}
              onClick={() => handlePresetClick({ lat: location.lat, lng: location.lng })}
              className={`
                p-3 rounded-lg border text-left transition-all duration-200
                hover:border-red-500 hover:bg-gray-800
                ${selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                  ? 'border-red-500 bg-gray-800'
                  : 'border-gray-600 bg-gray-800/50'
                }
              `}
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

      {/* Current Selection */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
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