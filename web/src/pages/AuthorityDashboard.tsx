import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle, Check, Clock3, FileCheck2, MapPin, MessageSquare,
  RefreshCw, Search, ShieldAlert, UserRound, X
} from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { PriorityBadge } from '../ui/PriorityBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { WarningFeed } from '../components/WarningFeed';

const API = 'http://localhost:8000';
type Report = {
  id: number; created_at: string; description: string; issue_type: string;
  evidence_url: string; evidence_type: string; ai_result_json: string;
  rules_triggered_json: string; ai_priority: string; priority: string;
  status: string; lat: number; lng: number; water_body_id?: number;
};
type Stats = { high_unreviewed: number; sla_breaching: number; active_warnings: number };
const actor = { actor_id: 3, actor_role: 'authority' };

const parse = <T,>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export function AuthorityDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>({ high_unreviewed: 0, sla_breaching: 0, active_warnings: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (priority) query.set('priority', priority);
      if (search) query.set('search', search);
      const [queue, summary] = await Promise.all([
        fetch(`${API}/dashboard/queue?${query}`).then(r => r.ok ? r.json() : Promise.reject(new Error('Queue request failed'))),
        fetch(`${API}/dashboard/stats`).then(r => r.ok ? r.json() : Promise.reject(new Error('Stats request failed')))
      ]);
      setReports(queue);
      setStats(summary);
      setSelectedId(current => current && queue.some((item: Report) => item.id === current) ? current : queue[0]?.id ?? null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the authority queue.');
    } finally {
      setLoading(false);
    }
  }, [priority, search, status]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'TEXTAREA') return;
      const index = reports.findIndex(item => item.id === selectedId);
      if (event.key.toLowerCase() === 'j') setSelectedId(reports[Math.min(index + 1, reports.length - 1)]?.id ?? null);
      if (event.key.toLowerCase() === 'k') setSelectedId(reports[Math.max(index - 1, 0)]?.id ?? null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reports, selectedId]);

  const selected = useMemo(() => reports.find(item => item.id === selectedId), [reports, selectedId]);
  const transition = async (newStatus: string, reason?: string) => {
    if (!selected) return;
    if (newStatus === 'Rejected' && !reason?.trim()) { setError('A rejection reason is required.'); return; }
    if (newStatus === 'Resolved' && !note.trim()) { setError('Resolution notes are required.'); return; }
    const response = await fetch(`${API}/reports/${selected.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actor, new_status: newStatus, note: note || undefined, reason })
    });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.detail || 'The transition was rejected.'); return; }
    setNote(''); setRejectReason(''); await load();
  };

  if (loading) return <div className="min-h-screen p-8 text-white"><div className="h-10 w-72 animate-pulse rounded bg-white/10 mb-8" /><div className="grid gap-4 lg:grid-cols-3"><div className="h-96 animate-pulse rounded-2xl bg-white/10" /><div className="h-96 animate-pulse rounded-2xl bg-white/10 lg:col-span-2" /></div></div>;

  const ai = selected ? parse<{ categories?: Array<{ label?: string; confidence?: number } | string> }>(selected.ai_result_json, {}) : {};
  const findings = (ai.categories ?? []).map(item => typeof item === 'string' ? { label: item, confidence: selected?.ai_priority === 'High' ? 0.85 : 0.65 } : { label: item.label ?? 'Unclassified finding', confidence: item.confidence ?? 0 });
  const rules = selected ? parse<unknown[]>(selected.rules_triggered_json, []).map(rule => typeof rule === 'string' ? rule : String(rule)) : [];
  const confirmStatus = selected?.status === 'New' ? 'Under Review' : 'Verified';
  return (
    <main className="min-h-screen bg-ink-navy p-4 text-white md:p-6">
      <header className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div><p className="text-xs uppercase tracking-[.2em] text-glow-aqua">Authority workspace</p><h1 className="text-3xl font-bold">Verification queue</h1></div>
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm"><RefreshCw size={15} /> Live · 5s</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3 mb-6">
          <Attention icon={<ShieldAlert />} label="High priority unreviewed" value={stats.high_unreviewed} tone="text-alert-coral" />
          <Attention icon={<Clock3 />} label="SLAs about to breach" value={stats.sla_breaching} tone="text-watch-amber" />
          <Attention icon={<AlertTriangle />} label="Early warnings active" value={stats.active_warnings} tone="text-glow-aqua" />
        </div>
        <WarningFeed />
      </header>
      {error && <div className="mx-auto mb-4 max-w-[1600px] rounded-xl border border-alert-coral/40 bg-alert-coral/10 p-3 text-sm text-alert-coral">{error}</div>}
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <GlassPanel className="!p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Queue <span className="text-white/50">({reports.length})</span></h2><span className="text-xs text-white/40">J / K</span></div>
          <div className="relative mb-3"><Search size={15} className="absolute left-3 top-2.5 text-white/40" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports" className="w-full rounded-lg bg-black/20 py-2 pl-9 pr-2 text-sm outline-none ring-glow-aqua/40 focus:ring-1" /></div>
          <div className="grid grid-cols-2 gap-2 mb-4"><select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-lg bg-black/20 p-2 text-xs"><option value="">Priority</option><option>High</option><option>Medium</option><option>Low</option></select><select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg bg-black/20 p-2 text-xs"><option value="">Status</option><option>New</option><option>Under Review</option><option>Verified</option><option>Assigned</option><option>Action Taken</option><option>Needs Field Check</option></select></div>
          <div className="space-y-2 max-h-[65vh] overflow-y-auto">{reports.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${item.id === selectedId ? 'border-glow-aqua bg-glow-aqua/10' : 'border-white/10 bg-white/[.03] hover:bg-white/[.06]'}`}><div className="flex justify-between gap-2"><span className="font-medium">AQA-{item.id}</span><PriorityBadge level={item.priority as 'High' | 'Medium' | 'Low'} /></div><p className="mt-1 truncate text-sm text-white/70">{item.description}</p><div className="mt-2 flex justify-between text-[11px] text-white/40"><span>{item.issue_type}</span><span>{age(item.created_at)}</span></div></button>)}{reports.length === 0 && <div className="py-12 text-center text-sm text-white/50">No cases match these filters.</div>}</div>
        </GlassPanel>
        <GlassPanel className="!p-5">
          {!selected ? <div className="flex h-full min-h-[400px] items-center justify-center text-white/50">Select a case to inspect its evidence and audit history.</div> : <><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-white/50">CASE AQA-{selected.id}</p><h2 className="text-2xl font-bold">{selected.issue_type}</h2></div><StatusBadge status={selected.status as never} /></div><div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black"><img src={selected.evidence_url} alt="Submitted evidence" className="h-full w-full object-contain" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-white/50">AI suggested</p><p className="mt-1 font-semibold">{selected.ai_priority} priority · {selected.issue_type}</p><p className="text-xs text-white/50 mt-1">Confidence {Math.round((findings[0]?.confidence ?? 0) * 100)}%</p></div><div className={`rounded-xl border p-3 ${selected.priority !== selected.ai_priority ? 'border-watch-amber bg-watch-amber/10' : 'border-white/10'}`}><p className="text-xs text-white/50">Reviewer decided</p><p className="mt-1 font-semibold">{selected.priority} priority · {selected.issue_type}</p>{selected.priority !== selected.ai_priority && <p className="text-xs text-watch-amber mt-1">Human override recorded</p>}</div></div><section className="mt-5"><h3 className="mb-2 font-semibold">AI findings & rules triggered</h3>{findings.map(item => <div key={item.label} className="mb-2"><div className="flex justify-between text-xs"><span>{item.label.replace(/_/g, ' ')}</span><span>{Math.round(item.confidence * 100)}%</span></div><div className="mt-1 h-1.5 rounded bg-black/30"><div className="h-full rounded bg-glow-aqua" style={{ width: `${item.confidence * 100}%` }} /></div></div>)}{rules.map(rule => <p key={rule} className="mt-2 rounded bg-white/5 p-2 text-xs text-white/70">{rule}</p>)}</section><p className="mt-4 flex items-center gap-2 text-xs text-white/50"><MapPin size={14} /> {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)} · nearby reports and map available from case detail</p></>}
        </GlassPanel>
        <GlassPanel className="!p-4"><h2 className="mb-4 font-semibold">Actions</h2>{selected ? <><div className="grid grid-cols-2 gap-2"><button onClick={() => void transition(confirmStatus)} className="rounded-lg bg-glow-aqua px-3 py-2 text-sm font-semibold text-ink-navy"><Check size={15} className="inline mr-1" /> {confirmStatus === 'Under Review' ? 'Start review' : 'Confirm'}</button><button onClick={() => void transition('Rejected', rejectReason)} className="rounded-lg bg-alert-coral/20 px-3 py-2 text-sm text-alert-coral"><X size={15} className="inline mr-1" /> Reject</button></div><input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (required)" className="mt-3 w-full rounded-lg bg-black/20 p-2 text-xs" /><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add note (required to resolve)" className="mt-3 min-h-24 w-full rounded-lg bg-black/20 p-2 text-xs" /><button onClick={() => void transition('Assigned')} className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-sm">Assign to response unit</button><button onClick={() => void transition('Action Taken')} className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-sm"><FileCheck2 size={15} className="inline mr-1" /> Mark action taken</button><button onClick={() => void transition('Resolved')} className="mt-2 w-full rounded-lg bg-glow-aqua/20 px-3 py-2 text-sm text-glow-aqua">Resolve case</button><p className="mt-5 text-xs text-white/40"><UserRound size={13} className="inline mr-1" /> Authority actions are audited; citizens receive a notification after each update.</p><p className="mt-2 text-xs text-white/40"><MessageSquare size={13} className="inline mr-1" /> Full audit timeline is available on the report detail page.</p></> : <p className="text-sm text-white/50">Actions appear when a case is selected.</p>}</GlassPanel>
      </div>
    </main>
  );
}

function Attention({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className={`mb-2 ${tone}`}>{icon}</div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-white/50">{label}</p></div>;
}
function age(createdAt: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000));
  return hours < 1 ? '<1h' : `${hours}h`;
}
