
import React, { useEffect, useState } from 'react';
import MapView from '@/components/tracking/MapView';
import DriversList from '@/components/tracking/DriversList';
import { Driver } from '@/types/tracking';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DriverTracking = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  
  const { lastMessage } = useWebSocket({
    url: 'wss://demo.piesocket.com/v3/channel_123?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self',
    onMessage: (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'driver_location_update') {
          updateDriverLocation(data.driver);
        } else if (data.type === 'drivers_list') {
          setDrivers(data.drivers);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  });

  // Simulate initial drivers data
  useEffect(() => {
    // Baghdad, Iraq coordinates
    const baghdadLat = 33.3152;
    const baghdadLng = 44.3661;
    
    const mockDrivers: Driver[] = [
      {
        id: '1',
        name: 'John Doe',
        vehicle: 'Delivery Van',
        status: 'active',
        location: { lat: baghdadLat, lng: baghdadLng },
        currentDelivery: {
          id: 'del-123',
          address: 'Karrada, Baghdad, Iraq',
          estimatedArrival: new Date(Date.now() + 15 * 60000).toISOString() // 15 minutes from now
        }
      },
      {
        id: '2',
        name: 'Jane Smith',
        vehicle: 'Scooter',
        status: 'active',
        location: { lat: baghdadLat + 0.01, lng: baghdadLng + 0.01 },
        currentDelivery: {
          id: 'del-456',
          address: 'Mansour, Baghdad, Iraq',
          estimatedArrival: new Date(Date.now() + 8 * 60000).toISOString() // 8 minutes from now
        }
      },
      {
        id: '3',
        name: 'Dave Wilson',
        vehicle: 'Truck',
        status: 'inactive',
        location: { lat: baghdadLat - 0.01, lng: baghdadLng + 0.02 },
        currentDelivery: null
      }
    ];
    
    setDrivers(mockDrivers);

    // Smooth driver movement using interpolation
    const moveInterval = setInterval(() => {
      setDrivers(prevDrivers => 
        prevDrivers.map(driver => {
          if (driver.status !== 'active') return driver;
          
          // Random small movement
          const latChange = (Math.random() - 0.5) * 0.001;
          const lngChange = (Math.random() - 0.5) * 0.001;
          
          // Store current location as previous location for smooth movement
          const prevLocation = { ...driver.location };
          
          return {
            ...driver,
            prevLocation,
            location: {
              lat: driver.location.lat + latChange,
              lng: driver.location.lng + lngChange
            }
          };
        })
      );
    }, 3000);

    return () => clearInterval(moveInterval);
  }, []);

  const updateDriverLocation = (updatedDriver: Driver) => {
    setDrivers(prev => 
      prev.map(driver => 
        driver.id === updatedDriver.id ? { ...driver, ...updatedDriver } : driver
      )
    );
  };

  const handleDriverSelect = (driverId: string) => {
    setSelectedDriver(driverId);
  };

  const selectedDriverData = selectedDriver 
    ? drivers.find(d => d.id === selectedDriver) 
    : null;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Live Driver Tracking</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>Live Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[540px]">
              <MapView 
                drivers={drivers} 
                selectedDriverId={selectedDriver}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="h-[600px] overflow-hidden">
            <CardHeader>
              <CardTitle>Drivers</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[540px]">
              <DriversList 
                drivers={drivers}
                onDriverSelect={handleDriverSelect}
                selectedDriverId={selectedDriver}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverTracking;
