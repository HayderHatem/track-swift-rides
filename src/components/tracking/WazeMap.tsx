import React from 'react';
import { Driver } from '@/types/tracking';

interface WazeMapProps {
  selectedDriverId: string | null;
  drivers: Driver[];
  className?: string;
}

const WazeMap = ({ selectedDriverId, drivers, className }: WazeMapProps) => {
  // Get the selected driver's coordinates
  const selectedDriver = selectedDriverId 
    ? drivers.find(d => d.id === selectedDriverId)
    : null;

  // Build Waze embed URL
  const getWazeEmbedUrl = () => {
    // If there's a selected driver, center on them
    if (selectedDriver) {
      const { lat, lng } = selectedDriver.location;
      return `https://embed.waze.com/iframe?zoom=16&lat=${lat}&lon=${lng}&pin=1`;
    }
    
    // Otherwise center on the first driver or use Baghdad as default
    const firstDriver = drivers[0];
    if (firstDriver) {
      const { lat, lng } = firstDriver.location;
      return `https://embed.waze.com/iframe?zoom=12&lat=${lat}&lon=${lng}`;
    }
    
    // Default to Baghdad, Iraq
    return 'https://embed.waze.com/iframe?zoom=12&lat=33.3152&lon=44.3661';
  };

  return (
    <div className={`h-full w-full ${className || ''}`}>
      <iframe
        src={getWazeEmbedUrl()}
        width="100%"
        height="100%"
        className="border-0 rounded-b-lg"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default WazeMap;
