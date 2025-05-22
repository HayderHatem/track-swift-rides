import React, { useEffect, useRef, useState } from 'react';
import { Driver } from '@/types/tracking';
import { Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapLayersControl from './MapLayersControl';
import DriverDetailToolbar from './DriverDetailToolbar';

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showSatellite, setShowSatellite] = useState(false);
  const [activeDriverDetails, setActiveDriverDetails] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Baghdad, Iraq coordinates as default
  const defaultCenter = [44.3661, 33.3152]; // [lng, lat]

  const toggleFullScreen = () => {
    const mapElement = document.getElementById('map-container');
    
    if (!mapElement) return;

    if (!document.fullscreenElement) {
      if (mapElement.requestFullscreen) {
        mapElement.requestFullscreen()
          .then(() => setIsFullScreen(true))
          .catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message}`));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullScreen(false))
          .catch(err => console.error(`Error attempting to exit full-screen mode: ${err.message}`));
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Initialize map with a slight delay to ensure container is properly sized
  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current) return;
    
    if (map.current) return; // Avoid re-initializing if map already exists
    
    // Add a small delay to ensure the container dimensions are properly set
    setTimeout(() => {
      try {
        console.log('Initializing map...');
        console.log('Container dimensions:', mapContainer.current?.offsetWidth, mapContainer.current?.offsetHeight);
        
        mapboxgl.accessToken = mapboxToken;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: showSatellite ? 'mapbox://styles/mapbox/satellite-streets-v11' : 'mapbox://styles/mapbox/streets-v11',
          center: drivers.length > 0 
            ? [drivers[0].location.lng, drivers[0].location.lat]
            : defaultCenter,
          zoom: 12
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        
        map.current.on('load', () => {
          console.log('Map loaded successfully');
          setMapLoaded(true);
          setMapInitialized(true);
          
          // Add traffic layer if enabled
          if (showTraffic) {
            map.current?.addSource('traffic', {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1'
            });
            
            map.current?.addLayer({
              'id': 'traffic-data',
              'type': 'line',
              'source': 'traffic',
              'source-layer': 'traffic',
              'layout': {
                'line-join': 'round',
                'line-cap': 'round'
              },
              'paint': {
                'line-width': 2,
                'line-color': [
                  'match',
                  ['get', 'congestion'],
                  'low', '#4CAF50',      // Green for low traffic
                  'moderate', '#FFEB3B', // Yellow for moderate
                  'heavy', '#FF9800',    // Orange for heavy
                  'severe', '#F44336',   // Red for severe
                  '#4CAF50'              // Default color
                ]
              }
            });
          }
          
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

        // Add click event for markers
        map.current.on('click', (e) => {
          // Check if a marker was clicked
          const features = map.current?.queryRenderedFeatures(e.point, {
            layers: drivers.map(d => `path-layer-${d.id}`)
          });
          
          if (features && features.length > 0) {
            const clickedDriverId = features[0].layer.id.replace('path-layer-', '');
            setActiveDriverDetails(clickedDriverId);
          } else {
            // Clicked on the map but not on a driver path
            setActiveDriverDetails(null);
          }
        });

        // Debug the map load process
        map.current.on('error', (e) => {
          console.error('Mapbox GL error:', e);
        });
        
        console.log('Map instance created');
      } catch (error) {
        console.error('Error initializing mapbox-gl:', error);
      }
    }, 500); // 500ms delay to ensure container is ready
  };

  useEffect(() => {
    // Force the container to have dimensions 
    if (mapContainer.current) {
      console.log('Setting explicit dimensions on map container');
      mapContainer.current.style.width = '100%';
      mapContainer.current.style.height = '540px';
    }
    
    if (mapboxToken && !mapInitialized) {
      console.log('Initializing map with token');
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
  }, [mapboxToken, mapInitialized]);

  // Re-initialize map when switching to mapbox tab
  useEffect(() => {
    if (mapboxToken && !mapInitialized) {
      initializeMap();
    }
  }, []);

  // Update traffic layer visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    if (map.current.getSource('traffic')) {
      if (showTraffic) {
        map.current.setLayoutProperty('traffic-data', 'visibility', 'visible');
      } else {
        map.current.setLayoutProperty('traffic-data', 'visibility', 'none');
      }
    }
  }, [showTraffic, mapLoaded]);

  // Update the map style when satellite mode changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const style = showSatellite 
      ? 'mapbox://styles/mapbox/satellite-streets-v11'
      : 'mapbox://styles/mapbox/streets-v11';
    
    map.current.setStyle(style);
    
    // Need to re-add data sources and layers after style change
    map.current.once('styledata', () => {
      // Re-add traffic layer if needed
      if (showTraffic) {
        if (!map.current?.getSource('traffic')) {
          map.current?.addSource('traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1'
          });
          
          map.current?.addLayer({
            'id': 'traffic-data',
            'type': 'line',
            'source': 'traffic',
            'source-layer': 'traffic',
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-width': 2,
              'line-color': [
                'match',
                ['get', 'congestion'],
                'low', '#4CAF50',
                'moderate', '#FFEB3B',
                'heavy', '#FF9800',
                'severe', '#F44336',
                '#4CAF50'
              ]
            }
          });
        }
      }
      
      // Re-add driver paths
      drivers.forEach(driver => {
        if (!map.current) return;
        
        if (!driverPathCoordinates.current[driver.id]) {
          driverPathCoordinates.current[driver.id] = [
            [driver.location.lng, driver.location.lat]
          ];
        }
        
        // Re-add the source if it doesn't exist
        if (!map.current.getSource(`path-source-${driver.id}`)) {
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
          
          driverPaths.current[driver.id] = map.current.getSource(`path-source-${driver.id}`) as mapboxgl.GeoJSONSource;
          
          // Add the layer again
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
        }
      });
    });
  }, [showSatellite, mapLoaded]);

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
    
    // Show driver details for selected driver
    if (selectedDriverId) {
      setActiveDriverDetails(selectedDriverId);
    }
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

  // Check if a driver has not received updates recently
  const isDriverStale = (driver: Driver) => {
    if (!driver.lastUpdate) return false;
    const now = Date.now();
    return now - driver.lastUpdate > 2 * 60 * 1000; // 2 minutes
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
          <div class="w-10 h-10 rounded-full ${isDriverStale(driver) ? 'bg-red-500' : status === 'active' ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">
            ${driver.name.charAt(0)}
          </div>
        `;
        
        // Create marker click handler
        el.addEventListener('click', () => {
          setActiveDriverDetails(id);
        });
        
        // Create the marker
        import('mapbox-gl').then((mapboxgl) => {
          markers.current[id] = new mapboxgl.default.Marker(el)
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
        // Update marker color based on status and staleness
        const markerEl = markers.current[id].getElement().querySelector('div');
        if (markerEl) {
          // Remove all bg color classes
          markerEl.classList.remove('bg-green-500', 'bg-gray-400', 'bg-red-500');
          
          // Add appropriate color class
          if (isDriverStale(driver)) {
            markerEl.classList.add('bg-red-500');
          } else if (status === 'active') {
            markerEl.classList.add('bg-green-500');
          } else {
            markerEl.classList.add('bg-gray-400');
          }
        }
        
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

  const handleTokenSubmit = (token: string) => {
    localStorage.setItem('mapbox_token', token);
    setMapboxToken(token);
    setMapInitialized(false); // Reset initialization flag to trigger re-init
  };

  // Find the active driver for details toolbar
  const activeDriver = activeDriverDetails 
    ? drivers.find(d => d.id === activeDriverDetails)
    : null;

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
    <div 
      id="map-container"
      className={`h-full w-full relative rounded-b-lg ${isFullScreen ? 'fixed inset-0 z-50 bg-background rounded-none' : ''}`}
    >
      <div ref={mapContainer} className="h-full w-full rounded-b-lg" style={{minHeight: "540px"}} />
      
      <MapLayersControl 
        mapType="mapbox"
        isFullScreen={isFullScreen}
        onMapTypeChange={() => {}} // Handled in parent component
        onToggleFullScreen={toggleFullScreen}
        showTraffic={showTraffic}
        showSatellite={showSatellite}
        onToggleTraffic={() => setShowTraffic(!showTraffic)}
        onToggleSatellite={() => setShowSatellite(!showSatellite)}
      />
      
      {activeDriver && (
        <div className="absolute bottom-0 left-0 right-0">
          <DriverDetailToolbar 
            driver={activeDriver} 
            onClose={() => setActiveDriverDetails(null)} 
          />
        </div>
      )}
    </div>
  );
};

export default MapView;
