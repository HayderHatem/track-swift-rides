
import React, { useState, useMemo } from 'react';
import { Driver } from '@/types/tracking';
import { Car, MapPin, Navigation2, Clock, Phone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DriversListProps {
  drivers: Driver[];
  onDriverSelect: (driverId: string) => void;
  selectedDriverId: string | null;
}

const DriversList = ({ drivers, onDriverSelect, selectedDriverId }: DriversListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  // Check if driver is stale (no updates in the last 2 minutes)
  const isDriverStale = (driver: Driver) => {
    if (!driver.lastUpdate) return false;
    const now = Date.now();
    return now - driver.lastUpdate > 2 * 60 * 1000; // 2 minutes
  };

  // Filter drivers based on search query
  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    
    const query = searchQuery.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(query) || 
      driver.vehicle.toLowerCase().includes(query) ||
      (driver.phone && driver.phone.includes(query)) ||
      (driver.currentDelivery && driver.currentDelivery.address.toLowerCase().includes(query))
    );
  }, [drivers, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search drivers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {filteredDrivers.length === 0 ? (
        <div className="text-center p-4">
          <p>No drivers found</p>
        </div>
      ) : (
        filteredDrivers.map(driver => (
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
                  isDriverStale(driver) ? 'bg-red-500' :
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
            
            {driver.phone && (
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Phone className="h-4 w-4 mr-1" />
                <span>{driver.phone}</span>
              </div>
            )}
            
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
