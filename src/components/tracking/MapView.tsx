
import React, { useEffect, useRef, useState } from 'react';
import { Driver } from '@/types/tracking';
import { Map as MapIcon, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  drivers: Driver[];
  selectedDriverId: string | null;
}

// User input field for their own Mapbox token for demonstration purposes
const MapboxTokenInput = ({ onTokenSubmit }: { onTokenSubmit: (token: string) => void }) => {
  const [token, setToken] = useState('');
  
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
  const markerAnimations = useRef<{ [key: string]: number }>({});
  const driverPaths = useRef<{ [key: string]: mapboxgl.GeoJSONSource }>({});
  const driverPathCoordinates = useRef<{ [key: string]: [number, number][] }>({});
  
  const [mapboxToken, setMapboxToken] = useState<string | null>(
    localStorage.getItem('mapbox_token')
  );
  const [mapLoaded, setMapLoaded] = useState(false);

  // Baghdad, Iraq coordinates as default
  const defaultCenter = [44.3661, 33.3152]; // [lng, lat]

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current) return;
    
    import('mapbox-gl').then((mapboxgl) => {
      import('mapbox-gl/dist/mapbox-gl.css');
      
      mapboxgl.default.accessToken = mapboxToken;
      
      if (map.current) return;
      
      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: drivers.length > 0 
          ? [drivers[0].location.lng, drivers[0].location.lat]
          : defaultCenter,
        zoom: 12
      });

      map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {
        setMapLoaded(true);
        
        // Initialize path sources and layers for each driver
        drivers.forEach(driver => {
          if (!map.current) return;
          
          // Initialize the coordinates array if it doesn't exist
          if (!driverPathCoordinates.current[driver.id]) {
            driverPathCoordinates.current[driver.id] = [
              [driver.location.lng, driver.location.lat]
            ];
          }
          
          // Add a GeoJSON source for the driver's path
          map.current.addSource(`path-source-${driver.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: driverPathCoordinates.current[driver.id]
              }
            }
          });
          
          // Save the source reference
          driverPaths.current[driver.id] = map.current.getSource(`path-source-${driver.id}`) as mapboxgl.GeoJSONSource;
          
          // Add a path layer for the driver
          const color = driver.id === '1' ? '#FF5733' : 
                        driver.id === '2' ? '#33FF57' : 
                        driver.id === '3' ? '#3357FF' : '#FFBD33';
          
          map.current.addLayer({
            id: `path-layer-${driver.id}`,
            type: 'line',
            source: `path-source-${driver.id}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
              'visibility': driver.id === selectedDriverId || selectedDriverId === null ? 'visible' : 'none'
            },
            paint: {
              'line-color': color,
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
        });
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
      // Cancel all animations
      Object.values(markerAnimations.current).forEach(id => {
        cancelAnimationFrame(id);
      });
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // Update path visibility when selected driver changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    drivers.forEach(driver => {
      const layerId = `path-layer-${driver.id}`;
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(
          layerId,
          'visibility',
          driver.id === selectedDriverId || selectedDriverId === null ? 'visible' : 'none'
        );
      }
    });
  }, [selectedDriverId, mapLoaded, drivers]);

  // Function to smoothly animate a marker from one position to another
  const animateMarkerMovement = (
    markerId: string, 
    startLng: number, 
    startLat: number, 
    endLng: number, 
    endLat: number, 
    duration: number = 3000
  ) => {
    if (!markers.current[markerId]) return;
    
    // Cancel any existing animation for this marker
    if (markerAnimations.current[markerId]) {
      cancelAnimationFrame(markerAnimations.current[markerId]);
    }
    
    const marker = markers.current[markerId];
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother movement
      const easeProgress = easeInOut(progress);
      
      const currentLng = startLng + (endLng - startLng) * easeProgress;
      const currentLat = startLat + (endLat - startLat) * easeProgress;
      
      marker.setLngLat([currentLng, currentLat]);
      
      // Update path when the driver moves
      if (map.current && mapLoaded && driverPaths.current[markerId]) {
        // Add new point to path coordinates
        if (!driverPathCoordinates.current[markerId]) {
          driverPathCoordinates.current[markerId] = [];
        }
        
        // Only add point every 10% of the animation to avoid too many points
        if (progress % 0.1 < 0.01 || progress === 1) {
          driverPathCoordinates.current[markerId].push([currentLng, currentLat]);
          
          // Update the GeoJSON source with the new coordinates
          driverPaths.current[markerId].setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: driverPathCoordinates.current[markerId]
            }
          });
        }
      }
      
      if (progress < 1) {
        markerAnimations.current[markerId] = requestAnimationFrame(animate);
      }
    };
    
    markerAnimations.current[markerId] = requestAnimationFrame(animate);
  };
  
  // Easing function for smooth animation
  const easeInOut = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

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
        import('mapbox-gl').then((mapboxgl) => {
          markers.current[id] = new mapboxgl.default.Marker(el)
            .setLngLat([location.lng, location.lat])
            .addTo(map.current as mapboxgl.Map);
            
          // Add popup
          new mapboxgl.default.Popup({ offset: 25, closeButton: false })
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
            .addTo(map.current as mapboxgl.Map);
            
          // Add initial point to path
          if (!driverPathCoordinates.current[id]) {
            driverPathCoordinates.current[id] = [[location.lng, location.lat]];
          }
          
          // Create path source and layer if the map is loaded but the path doesn't exist yet
          if (mapLoaded && map.current && !driverPaths.current[id]) {
            const color = id === '1' ? '#FF5733' : 
                          id === '2' ? '#33FF57' : 
                          id === '3' ? '#3357FF' : '#FFBD33';
                          
            // Add a GeoJSON source for the driver's path
            map.current.addSource(`path-source-${id}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: driverPathCoordinates.current[id]
                }
              }
            });
            
            // Save the source reference
            driverPaths.current[id] = map.current.getSource(`path-source-${id}`) as mapboxgl.GeoJSONSource;
            
            // Add a path layer for the driver
            map.current.addLayer({
              id: `path-layer-${id}`,
              type: 'line',
              source: `path-source-${id}`,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': id === selectedDriverId || selectedDriverId === null ? 'visible' : 'none'
              },
              paint: {
                'line-color': color,
                'line-width': 4,
                'line-opacity': 0.8
              }
            });
          }
        });
      } else {
        // Animate marker to new position
        const currentPos = markers.current[id].getLngLat();
        animateMarkerMovement(
          id, 
          currentPos.lng, 
          currentPos.lat, 
          location.lng, 
          location.lat
        );
      }
    });

    // Remove markers for drivers that no longer exist
    Object.keys(markers.current).forEach(id => {
      if (!drivers.find(d => d.id === id)) {
        markers.current[id].remove();
        delete markers.current[id];
        
        // Remove the path layer and source
        if (map.current && map.current.getLayer(`path-layer-${id}`)) {
          map.current.removeLayer(`path-layer-${id}`);
        }
        
        if (map.current && map.current.getSource(`path-source-${id}`)) {
          map.current.removeSource(`path-source-${id}`);
        }
        
        delete driverPaths.current[id];
        delete driverPathCoordinates.current[id];
        
        // Cancel any ongoing animation
        if (markerAnimations.current[id]) {
          cancelAnimationFrame(markerAnimations.current[id]);
          delete markerAnimations.current[id];
        }
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
