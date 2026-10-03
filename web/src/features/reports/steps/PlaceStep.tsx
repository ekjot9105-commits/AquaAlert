import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../../../ui/Button';
import type { ReportDraft } from '../ReportWizard';
import { fetchWaterBodies } from '../../../services/api';
import { MapPin, Navigation } from 'lucide-react';

// Fix Leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  draft: ReportDraft;
  updateDraft: (u: Partial<ReportDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LocationMarker = ({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return <Marker position={position} draggable={true} eventHandlers={{ dragend: (e) => setPosition([e.target.getLatLng().lat, e.target.getLatLng().lng]) }} />;
};

export const PlaceStep = ({ draft, updateDraft, onNext, onBack }: Props) => {
  const [position, setPosition] = useState<[number, number]>(draft.lat && draft.lng ? [draft.lat, draft.lng] : [40.0, -73.0]);
  const [waterBodies, setWaterBodies] = useState<any[]>([]);
  const [nearest, setNearest] = useState<any>(null);

  useEffect(() => {
    fetchWaterBodies().then(data => {
      setWaterBodies(data);
    }).catch(console.error);

    if (!draft.lat && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        // Only update if near demo data area, otherwise just use mock center for demo
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      }, () => {
        console.log("Geolocation denied, using default");
      });
    }
  }, []);

  useEffect(() => {
    if (waterBodies.length > 0) {
      // Find nearest
      let min = Infinity;
      let closest: any = null;
      waterBodies.forEach(wb => {
        const dist = Math.pow(wb.center_lat - position[0], 2) + Math.pow(wb.center_lng - position[1], 2);
        if (dist < min) {
          min = dist;
          closest = wb;
        }
      });
      setNearest(closest);
      updateDraft({ lat: position[0], lng: position[1], waterBodyId: closest?.id });
    }
  }, [position, waterBodies]);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-display font-bold mb-2">Confirm Location</h2>
      <p className="text-white/70 text-sm mb-4">Drag the pin to the exact spot.</p>

      <div className="rounded-2xl overflow-hidden border-2 border-glow-aqua/30 flex-1 relative mb-6">
        <MapContainer center={position} zoom={13} className="w-full h-full" zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
        
        <button 
          onClick={() => setPosition([40.0, -73.0])}
          className="absolute bottom-4 right-4 z-[400] bg-deep-teal p-3 rounded-full text-glow-aqua shadow-lg border border-glow-aqua/30"
        >
          <Navigation size={20} />
        </button>
      </div>

      {nearest && (
        <div className="bg-deep-teal/50 rounded-xl p-4 mb-6 border border-white/10 flex items-start gap-3">
          <MapPin className="text-health-lime shrink-0 mt-1" size={20} />
          <div>
            <p className="font-semibold">{nearest.name}</p>
            <p className="text-xs text-white/70 mt-1">Routed to: Local Response Unit</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-auto">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext}>Confirm Location</Button>
      </div>
    </div>
  );
};
