import { useEffect, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';

const API = 'http://localhost:8000';
type Warning = { id?: number; water_body_id: number; level: string; category: string; reason_text: string; report_count: number };

export function WarningFeed({ onViewMap }: { onViewMap?: (waterBodyId: number) => void }) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  useEffect(() => {
    const load = () => fetch(`${API}/api/early-warnings`).then(response => response.ok ? response.json() : []).then(setWarnings).catch(() => setWarnings([]));
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);
  return <section aria-label="Early warning feed" className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
    <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Early-warning feed</h2><span className="text-xs text-white/50">Live</span></div>
    {warnings.length === 0 ? <p className="py-4 text-sm text-white/50">No active emerging risks detected.</p> : <div className="space-y-2">{warnings.map(warning => <article key={`${warning.water_body_id}-${warning.category}`} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldAlert size={16} className={levelColor(warning.level)} /><span className={`text-xs font-bold uppercase ${levelColor(warning.level)}`}>{warning.level}</span><span className="text-xs text-white/50">{warning.category}</span></div>{onViewMap && <button onClick={() => onViewMap(warning.water_body_id)} className="text-xs text-glow-aqua hover:underline"><ExternalLink size={12} className="inline mr-1" />View on map</button>}</div><p className="mt-2 text-sm text-white/75">{warning.reason_text}</p></article>)}</div>}
  </section>;
}
function levelColor(level: string) { return level === 'Alert' ? 'text-alert-coral' : level === 'Warning' ? 'text-watch-amber' : 'text-glow-aqua'; }
