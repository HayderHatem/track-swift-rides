import React, { useEffect, useState } from 'react';
import MapView from '@/components/tracking/MapView';
import DriversList from '@/components/tracking/DriversList';
import { Driver, FlutterDriverUpdate } from '@/types/tracking';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { RefreshCcw } from 'lucide-react';

const DriverTracking = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('wss://demo.piesocket.com/v3/channel_123?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self');
  const [inputWsUrl, setInputWsUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  const { lastMessage, connectionStatus, reconnect } = useWebSocket({
    url: wsUrl,
    onMessage: (message) => {
      try {
        console.log('Processing WebSocket message:', message.data);
        const data = JSON.parse(message.data);
        
        // Handle Flutter driver location update
        if (data.type === 'driver_location_update') {
          processFlutterUpdate(data);
        } 
        // Handle standard driver_location_update
        else if (data.type === 'driver_location_update' && data.driver) {
          updateDriverLocation(data.driver);
        } 
        // Handle drivers list update
        else if (data.type === 'drivers_list' && data.drivers) {
          setDrivers(data.drivers);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },
    onOpen: () => setIsConnecting(false)
  });

  // Process Flutter update format
  const processFlutterUpdate = (data: FlutterDriverUpdate) => {
    const { lat, lng, name, phone, id } = data;

    // If id exists, update the driver
    if (id && drivers.some(d => d.id === id)) {
      const updatedDriver: Driver = {
        ...drivers.find(d => d.id === id)!,
        location: { lat, lng },
        name: name || drivers.find(d => d.id === id)!.name,
        phone: phone || drivers.find(d => d.id === id)!.phone,
        status: 'active'
      };
      updateDriverLocation(updatedDriver);
    } 
    // Otherwise create a new driver
    else {
      const newDriver: Driver = {
        id: id || `flutter-${Date.now()}`,
        name: name || 'Unknown Driver',
        phone: phone || 'Unknown',
        vehicle: 'Unknown Vehicle',
        status: 'active',
        location: { lat, lng },
        currentDelivery: null
      };
      
      setDrivers(prev => [...prev, newDriver]);
      toast.success(`New driver connected: ${name || 'Unknown Driver'}`);
    }
  };

  // Connect to a new WebSocket URL
  const handleConnect = () => {
    if (!inputWsUrl) {
      toast.error("Please enter a WebSocket URL");
      return;
    }
    setIsConnecting(true);
    setWsUrl(inputWsUrl);
    toast.info(`Connecting to ${inputWsUrl}...`);
  };

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
        phone: '+964 750 123 4567',
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
        phone: '+964 770 987 6543',
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
        phone: '+964 780 456 7890',
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
    setDrivers(prev => {
      const existingDriverIndex = prev.findIndex(driver => driver.id === updatedDriver.id);
      
      if (existingDriverIndex !== -1) {
        // Update existing driver
        const updatedDrivers = [...prev];
        updatedDrivers[existingDriverIndex] = {
          ...updatedDrivers[existingDriverIndex],
          ...updatedDriver,
          prevLocation: updatedDrivers[existingDriverIndex].location,
        };
        return updatedDrivers;
      } else {
        // Add as new driver
        toast.success(`New driver connected: ${updatedDriver.name}`);
        return [...prev, updatedDriver];
      }
    });
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
      
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>WebSocket Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="WebSocket URL (e.g., wss://your-server.com/ws)" 
                value={inputWsUrl} 
                onChange={(e) => setInputWsUrl(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleConnect} disabled={isConnecting}>
                Connect
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={reconnect} 
                disabled={isConnecting}
                title="Reconnect"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'open' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              {connectionStatus === 'open' && (
                <span className="ml-2 text-muted-foreground">Connected to: {wsUrl}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
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
              <CardTitle>Drivers ({drivers.length})</CardTitle>
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
