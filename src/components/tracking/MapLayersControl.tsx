
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Layers, Maximize, Minimize, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface MapLayersControlProps {
  mapType: 'mapbox' | 'waze';
  isFullScreen: boolean;
  onMapTypeChange: (type: 'mapbox' | 'waze') => void;
  onToggleFullScreen: () => void;
  showTraffic: boolean;
  showSatellite: boolean;
  onToggleTraffic: () => void;
  onToggleSatellite: () => void;
}

const MapLayersControl = ({
  mapType,
  isFullScreen,
  onMapTypeChange,
  onToggleFullScreen,
  showTraffic,
  showSatellite,
  onToggleTraffic,
  onToggleSatellite
}: MapLayersControlProps) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <div className="bg-background/95 backdrop-blur-sm rounded-md shadow-md p-1 flex items-center gap-1">
        <Tabs value={mapType} onValueChange={(value) => onMapTypeChange(value as 'mapbox' | 'waze')}>
          <TabsList>
            <TabsTrigger value="mapbox">MapBox</TabsTrigger>
            <TabsTrigger value="waze">Waze</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleFullScreen}
          className="ml-1"
          title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
        >
          {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="bg-background/95 backdrop-blur-sm shadow-md">
            <Layers className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-2">
            <h4 className="font-medium">Map Layers</h4>
            <div className="flex flex-col gap-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTraffic}
                  onChange={onToggleTraffic}
                  className="mr-2"
                />
                Traffic
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSatellite}
                  onChange={onToggleSatellite}
                  className="mr-2"
                />
                Satellite
              </label>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MapLayersControl;
