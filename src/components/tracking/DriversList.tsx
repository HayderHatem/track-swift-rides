
import React from 'react';
import { Driver } from '@/types/tracking';
import { Car, MapPin, Navigation2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DriversListProps {
  drivers: Driver[];
  onDriverSelect: (driverId: string) => void;
  selectedDriverId: string | null;
}

const DriversList = ({ drivers, onDriverSelect, selectedDriverId }: DriversListProps) => {
  // Format the estimated arrival time
  const formatArrivalTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate minutes remaining
  const getMinutesRemaining = (isoString: string) => {
    const arrivalTime = new Date(isoString).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.round((arrivalTime - now) / (1000 * 60));
    
    return diffMinutes > 0 ? `${diffMinutes} min` : 'Arriving';
  };

  return (
    <div className="space-y-4">
      {drivers.length === 0 ? (
        <div className="text-center p-4">
          <p>No drivers available</p>
        </div>
      ) : (
        drivers.map(driver => (
          <div 
            key={driver.id}
            className={`p-4 border rounded-lg transition-colors ${
              selectedDriverId === driver.id 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  driver.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <h3 className="font-medium">{driver.name}</h3>
              </div>
              <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Car className="h-4 w-4 mr-1" />
              <span>{driver.vehicle}</span>
            </div>
            
            {driver.currentDelivery && (
              <>
                <div className="text-sm mb-1">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{driver.currentDelivery.address}</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>ETA: {formatArrivalTime(driver.currentDelivery.estimatedArrival)}</span>
                  </div>
                  <div className="font-medium">
                    {getMinutesRemaining(driver.currentDelivery.estimatedArrival)}
                  </div>
                </div>
              </>
            )}
            
            <div className="mt-3 text-right">
              <Button 
                size="sm"
                onClick={() => onDriverSelect(driver.id)} 
                variant={selectedDriverId === driver.id ? "default" : "outline"}
              >
                <Navigation2 className="h-4 w-4 mr-2" />
                {selectedDriverId === driver.id ? 'Tracking' : 'Track'}
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DriversList;
