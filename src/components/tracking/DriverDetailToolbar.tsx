
import React from 'react';
import { Driver } from '@/types/tracking';
import { X, MapPin, Phone, Car, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DriverDetailToolbarProps {
  driver: Driver;
  onClose: () => void;
}

const DriverDetailToolbar = ({ driver, onClose }: DriverDetailToolbarProps) => {
  // Format the estimated arrival time
  const formatArrivalTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate minutes remaining
  const getMinutesRemaining = (isoString: string) => {
    if (!isoString) return 'N/A';
    const arrivalTime = new Date(isoString).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.round((arrivalTime - now) / (1000 * 60));
    
    return diffMinutes > 0 ? `${diffMinutes} min` : 'Arriving';
  };

  // Check if driver is stale (no updates in the last 2 minutes)
  const isStale = () => {
    if (!driver.lastUpdate) return false;
    const now = Date.now();
    return now - driver.lastUpdate > 2 * 60 * 1000; // 2 minutes
  };

  return (
    <div className="bg-background/90 backdrop-blur-sm p-4 rounded-t-lg shadow-lg border-t border-x">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isStale() ? 'bg-red-500' : 
            driver.status === 'active' ? 'bg-green-500' : 
            'bg-gray-400'
          }`}></div>
          <h3 className="font-semibold text-lg">{driver.name}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center">
          <Car className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{driver.vehicle}</span>
        </div>
        
        {driver.phone && (
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
            <a href={`tel:${driver.phone}`} className="hover:underline">{driver.phone}</a>
          </div>
        )}
      </div>
      
      {driver.currentDelivery && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">Delivery Address</div>
              <div className="text-sm">{driver.currentDelivery.address}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <div>
                <span className="text-sm">ETA: {formatArrivalTime(driver.currentDelivery.estimatedArrival)}</span>
              </div>
            </div>
            <div className="font-semibold text-primary">
              {getMinutesRemaining(driver.currentDelivery.estimatedArrival)}
            </div>
          </div>
          
          <div className="mt-3">
            <Button size="sm" variant="outline" className="w-full">
              <Navigation className="h-4 w-4 mr-2" />
              Navigate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDetailToolbar;
