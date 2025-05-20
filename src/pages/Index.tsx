
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center max-w-2xl p-6">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">Swift Rides Delivery Tracking</h1>
        <p className="text-xl text-gray-600 mb-8">
          Real-time driver tracking system for delivery management with live location updates via WebSockets.
        </p>
        <Button asChild size="lg">
          <Link to="/tracking" className="flex items-center">
            <Navigation className="mr-2 h-5 w-5" />
            View Live Driver Tracking
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
