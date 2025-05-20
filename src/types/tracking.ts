
export interface Location {
  lat: number;
  lng: number;
}

export interface Delivery {
  id: string;
  address: string;
  estimatedArrival: string;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  status: 'active' | 'inactive' | 'break';
  location: Location;
  currentDelivery: Delivery | null;
}

export interface WebSocketMessage {
  type: string;
  driver?: Driver;
  drivers?: Driver[];
}
