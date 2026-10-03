import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Dispatch, SetStateAction } from 'react';
type WaterBody = { id: number; name: string; center_lat: number; center_lng: number; health_score: number; status: string };
type Report = { id: number; lat: number; lng: number; priority: string };
export default function LeafletFallback({ waterBodies, reports, selected, setSelected }: { waterBodies: WaterBody[]; reports: Report[]; selected: WaterBody | null; setSelected: Dispatch<SetStateAction<WaterBody | null>> }) {
  const center = waterBodies.length ? [waterBodies.reduce((sum, body) => sum + body.center_lat, 0) / waterBodies.length, waterBodies.reduce((sum, body) => sum + body.center_lng, 0) / waterBodies.length] as [number, number] : [17.4, 78.43] as [number, number];
  return <MapContainer center={center} zoom={12} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{waterBodies.map(body => <CircleMarker key={body.id} center={[body.center_lat, body.center_lng]} radius={selected?.id === body.id ? 18 : 12} pathOptions={{ color: body.status === 'Alert' ? '#f27669' : body.status === 'Warning' ? '#e9b949' : '#22b8aa' }} eventHandlers={{ click: () => setSelected(body) }}><Popup>{body.name} · health {Math.round(body.health_score)}</Popup></CircleMarker>)}{reports.map(report => <CircleMarker key={report.id} center={[report.lat, report.lng]} radius={5} pathOptions={{ color: report.priority === 'High' ? '#f27669' : '#e9b949' }} />)}</MapContainer>;
}
