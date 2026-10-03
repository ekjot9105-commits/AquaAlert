import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassPanel } from '../../ui/GlassPanel';
import { PriorityBadge } from '../../ui/PriorityBadge';
import { StatusBadge } from '../../ui/StatusBadge';
import { Button } from '../../ui/Button';
import { ArrowLeft, Activity, ShieldCheck, MapPin } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch report from API
    fetch(`http://localhost:8000/reports`)
      .then(r => r.json())
      .then(data => {
        const found = data.find((r: any) => r.id === Number(id));
        setReport(found);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading case data...</div>;
  if (!report) return <div className="p-8 text-center text-alert-coral">Report not found.</div>;

  let rules = [];
  try { rules = JSON.parse(report.rules_triggered_json || '[]'); } catch {}
  let ai = null;
  try { ai = JSON.parse(report.ai_result_json || '{}'); } catch {}

  return (
    <div className="max-w-md mx-auto min-h-screen bg-ink-navy p-4 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white mb-6">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Case AQA-{report.id}</h1>
          <p className="text-sm text-white/50">{new Date(report.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={report.status as any} />
      </div>

      <div className="rounded-2xl overflow-hidden aspect-video bg-black mb-6">
        <img src={report.evidence_url} alt="Evidence" className="w-full h-full object-cover" />
      </div>

      <div className="flex items-start gap-3 bg-deep-teal/30 p-4 rounded-xl border border-white/5 mb-6">
        <MapPin className="text-glow-aqua mt-0.5" size={20} />
        <div>
          <p className="font-medium text-sm">Location</p>
          <p className="text-xs text-white/70">{report.lat.toFixed(4)}, {report.lng.toFixed(4)}</p>
          {report.water_body_id && <p className="text-xs text-glow-aqua mt-1">Water Body ID: {report.water_body_id}</p>}
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18}/> AI Assessment & Priority</h2>
      
      <GlassPanel className="p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Suggested Priority</span>
          <PriorityBadge level={report.priority as any} />
        </div>
        
        {ai && ai.categories && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-sm text-white/70 mb-2">Findings</p>
            {ai.categories.map((c: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{c.label.replace(/_/g, ' ')}</span>
                  <span>{Math.round(c.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-glow-aqua" style={{ width: `${c.confidence * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18}/> Rules Engine</h2>
      <div className="space-y-2 mb-8">
        {rules.length > 0 ? rules.map((r: str, i: number) => (
          <div key={i} className="bg-deep-teal/20 border border-white/10 rounded-lg p-3 text-sm">
            {r}
          </div>
        )) : (
          <p className="text-sm text-white/50">No rules triggered.</p>
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Timeline</h3>
        <div className="border-l-2 border-glow-aqua/30 ml-2 pl-4 py-1 space-y-4 relative">
          <div className="relative">
            <div className="absolute w-3 h-3 bg-glow-aqua rounded-full -left-[1.35rem] top-1" />
            <p className="text-sm font-medium">Report Filed</p>
            <p className="text-xs text-white/50">AI verified initial constraints</p>
          </div>
          {report.status !== 'New' && (
            <div className="relative">
              <div className="absolute w-3 h-3 bg-watch-amber rounded-full -left-[1.35rem] top-1" />
              <p className="text-sm font-medium">Under Review</p>
              <p className="text-xs text-white/50">Awaiting human validation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
