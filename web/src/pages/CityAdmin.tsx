import { useEffect, useState } from 'react';

const API = 'http://localhost:8000';
type City = { id: string; name: string; center: { lat: number; lng: number }; routing: { default_unit: string } };

export function CityAdmin() {
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({ id: '', name: '', center_lat: '', center_lng: '', default_unit: '' });
  const load = () => fetch(`${API}/admin/cities`).then(response => response.json()).then(data => setCities(data.cities));
  useEffect(() => { void load(); }, []);
  const add = async () => {
    const response = await fetch(`${API}/admin/cities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, center_lat: Number(form.center_lat), center_lng: Number(form.center_lng) }) });
    if (response.ok) { setForm({ id: '', name: '', center_lat: '', center_lng: '', default_unit: '' }); await load(); }
  };
  return <main className="min-h-screen bg-ink-navy p-6 text-white"><div className="mx-auto max-w-3xl"><p className="text-xs uppercase tracking-[.2em] text-glow-aqua">Administration</p><h1 className="mt-1 text-3xl font-bold">Cities and routing</h1><p className="mt-2 text-sm text-white/55">Add a city by editing configuration data, without changing application code.</p><section className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 md:grid-cols-2">{[['id', 'City id'], ['name', 'City name'], ['center_lat', 'Center latitude'], ['center_lng', 'Center longitude'], ['default_unit', 'Default response unit']].map(([key, label]) => <label key={key} className="text-sm text-white/70">{label}<input value={form[key as keyof typeof form]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2 text-white" /></label>)}<button onClick={() => void add()} className="rounded-lg bg-glow-aqua px-4 py-2 font-semibold text-ink-navy md:col-span-2">Add city</button></section><section className="mt-5 space-y-2">{cities.map(city => <div key={city.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between"><strong>{city.name}</strong><span className="text-glow-aqua">{city.id}</span></div><p className="mt-1 text-sm text-white/55">{city.center.lat}, {city.center.lng} · routes to {city.routing.default_unit}</p></div>)}</section></div></main>;
}
