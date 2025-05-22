
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
  phone?: string;  // Added phone field
  currentDelivery: Delivery | null;
}

export interface FlutterDriverUpdate {
  type: "driver_location_update";
  lat: number;
  lng: number;
  name: string;
  phone: string;
  id?: string;
}

export interface WebSocketMessage {
  type: string;
  driver?: Driver;
  drivers?: Driver[];
  [key: string]: any; // Allow for any additional fields in the message
}
