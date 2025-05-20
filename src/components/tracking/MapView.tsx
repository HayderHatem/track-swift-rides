
import React, { useEffect, useRef } from 'react';
import { Driver } from '@/types/tracking';
import { Map as MapIcon, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapViewProps {
  drivers: Driver[];
  selectedDriverId: string | null;
}

// User input field for their own Mapbox token for demonstration purposes
const MapboxTokenInput = ({ onTokenSubmit }: { onTokenSubmit: (token: string) => void }) => {
  const [token, setToken] = React.useState('');
  
  return (
    <div className="p-4 bg-muted rounded-md">
      <h3 className="font-medium mb-2">Enter your Mapbox token to enable the map</h3>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={token} 
          onChange={(e) => setToken(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="pk.eyJ1IjoieW91..."
        />
        <Button onClick={() => onTokenSubmit(token)}>
          <MapIcon className="mr-2 h-4 w-4" />
          Load Map
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Get your free Mapbox token at <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
      </p>
    </div>
  );
};

const MapView = ({ drivers, selectedDriverId }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapboxToken, setMapboxToken] = React.useState<string | null>(
    localStorage.getItem('mapbox_token')
  );
  const [mapLoaded, setMapLoaded] = React.useState(false);

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current) return;
    
    import('mapbox-gl').then((mapboxgl) => {
      import('mapbox-gl/dist/mapbox-gl.css');
      
      mapboxgl.default.accessToken = mapboxToken;
      
      if (map.current) return;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: drivers.length > 0 
          ? [drivers[0].location.lng, drivers[0].location.lat]
          : [-74.006, 40.7128],
        zoom: 12
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        setMapLoaded(true);
      });
    }).catch(error => {
      console.error('Error loading mapbox-gl:', error);
    });
  };

  const handleTokenSubmit = (token: string) => {
    localStorage.setItem('mapbox_token', token);
    setMapboxToken(token);
  };

  useEffect(() => {
    if (mapboxToken) {
      initializeMap();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update markers for all drivers
    drivers.forEach(driver => {
      const { id, location, status } = driver;
      
      // Create or update markers
      if (!markers.current[id]) {
        // Create new marker element
        const el = document.createElement('div');
        el.className = 'driver-marker';
        el.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-${status === 'active' ? 'green' : 'gray'}-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">
            ${driver.name.charAt(0)}
          </div>
        `;
        
        // Create the marker
        markers.current[id] = new mapboxgl.Marker(el)
          .setLngLat([location.lng, location.lat])
          .addTo(map.current);
          
        // Add popup
        new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div>
              <strong>${driver.name}</strong>
              <div>${driver.vehicle}</div>
              ${driver.currentDelivery ? 
                `<div class="text-sm">Delivering to: ${driver.currentDelivery.address}</div>` : 
                '<div class="text-sm">Not on delivery</div>'}
            </div>
          `)
          .setLngLat([location.lng, location.lat])
          .addTo(map.current);
      } else {
        // Update existing marker
        markers.current[id].setLngLat([location.lng, location.lat]);
      }
    });

    // Remove markers for drivers that no longer exist
    Object.keys(markers.current).forEach(id => {
      if (!drivers.find(d => d.id === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });
    
    // Center map on selected driver if one is selected
    if (selectedDriverId) {
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);
      if (selectedDriver) {
        map.current.flyTo({
          center: [selectedDriver.location.lng, selectedDriver.location.lat],
          zoom: 15,
          essential: true
        });
      }
    }
  }, [drivers, selectedDriverId, mapLoaded]);

  if (!mapboxToken) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full">
          <MapboxTokenInput onTokenSubmit={handleTokenSubmit} />
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="h-full w-full rounded-b-lg" />
  );
};

export default MapView;
