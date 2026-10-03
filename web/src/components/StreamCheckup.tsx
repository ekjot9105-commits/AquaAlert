import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Info, Waves, X } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { enqueueRequest } from '../services/offlineQueue';

const API = 'http://localhost:8000';
type Choice = { value: string; label: string; icon: string };
type Question = { key: keyof Answers; title: string; hint: string; choices: Choice[] };
type Answers = {
  water_color: string;
  clarity: string;
  floating_material: string;
  smell: string;
  wildlife: string;
  recent_rain: string;
};

const QUESTIONS: Question[] = [
  { key: 'water_color', title: 'What color does the water look?', hint: 'Color means the visible shade from a safe distance, not a lab measurement.', choices: [{ value: 'clear', label: 'Clear / blue', icon: '💧' }, { value: 'green', label: 'Greenish', icon: '🌿' }, { value: 'brown', label: 'Brown / murky', icon: '🟤' }, { value: 'other', label: 'Something else', icon: '👀' }] },
  { key: 'clarity', title: 'How clear is it?', hint: 'Clarity is how easily you can see through the surface.', choices: [{ value: 'clear', label: 'Easy to see through', icon: '🔎' }, { value: 'cloudy', label: 'A little cloudy', icon: '☁️' }, { value: 'very_cloudy', label: 'Very cloudy', icon: '🌫️' }] },
  { key: 'floating_material', title: 'Do you see anything floating?', hint: 'Natural material includes leaves or foam; never touch or collect it.', choices: [{ value: 'none', label: 'Nothing noticeable', icon: '✨' }, { value: 'natural', label: 'Leaves / natural material', icon: '🍂' }, { value: 'litter', label: 'Litter or unusual material', icon: '🧴' }, { value: 'unknown', label: 'Not sure', icon: '❔' }] },
  { key: 'smell', title: 'Is there a noticeable smell?', hint: 'Do not lean over the water to smell it. Only report what you notice from a safe distance.', choices: [{ value: 'none', label: 'No unusual smell', icon: '🌬️' }, { value: 'earthy', label: 'Earthy / natural', icon: '🌱' }, { value: 'strong_or_unusual', label: 'Strong or unusual', icon: '⚠️' }, { value: 'unknown', label: 'Could not tell', icon: '❔' }] },
  { key: 'wildlife', title: 'What wildlife do you see?', hint: 'Wildlife observations are useful context; do not approach animals or the water.', choices: [{ value: 'none_seen', label: 'None seen', icon: '—' }, { value: 'fish_birds', label: 'Fish or birds behaving normally', icon: '🐟' }, { value: 'distress', label: 'Distress or unusual behavior', icon: '🦆' }, { value: 'unknown', label: 'Could not tell', icon: '❔' }] },
  { key: 'recent_rain', title: 'Has it rained recently?', hint: 'Think about rain in the last 48 hours near this water body.', choices: [{ value: 'none', label: 'No rain', icon: '☀️' }, { value: 'light', label: 'A little rain', icon: '🌦️' }, { value: 'heavy', label: 'Heavy rain', icon: '🌧️' }, { value: 'unknown', label: 'Not sure', icon: '❔' }] },
];

const EMPTY: Answers = { water_color: '', clarity: '', floating_material: '', smell: '', wildlife: '', recent_rain: '' };

export function StreamCheckup({ waterBodyId, waterBodyName, onClose, onComplete }: { waterBodyId: number; waterBodyName: string; onClose: () => void; onComplete: (result: { xp_awarded: number; quality_score: number }) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const question = QUESTIONS[step];
  const answered = Object.values(answers).filter(Boolean).length;
  const quality = useMemo(() => Math.round(answered / QUESTIONS.length * 100), [answered]);
  const choose = (value: string) => setAnswers(current => ({ ...current, [question.key]: value }));
  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API}/guardian/stream-checkup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, water_body_id: waterBodyId, ...answers }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Could not save checkup');
      if (navigator.vibrate) navigator.vibrate([25, 40, 25]);
      onComplete(result);
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueRequest(`${API}/guardian/stream-checkup`, { user_id: 1, water_body_id: waterBodyId, ...answers });
          if (navigator.vibrate) navigator.vibrate(30);
          onComplete({ xp_awarded: 0, quality_score: Math.round(answered / QUESTIONS.length * 100) });
        setError('Saved offline, will send when connected.');
        setSaving(false);
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not save checkup');
    } finally {
      setSaving(false);
    }
  };
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="stream-checkup-title">
    <div className="w-full max-w-lg rounded-2xl border border-glow-aqua/30 bg-ink-navy p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-glow-aqua">Citizen science · 2 minutes</p><h2 id="stream-checkup-title" className="mt-1 text-2xl font-bold">Stream Checkup</h2><p className="mt-1 text-sm text-white/60">{waterBodyName} · stay on land and observe from a safe distance.</p></div><button onClick={onClose} aria-label="Close checkup" className="rounded-lg p-2 text-white/60 hover:bg-white/10"><X size={18} /></button></div>
      <div className="mt-5"><div className="flex items-center justify-between text-xs text-white/60"><span>Question {step + 1} of {QUESTIONS.length}</span><span>Quality {quality}%</span></div><div className="mt-2 h-2 rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-glow-aqua to-health-lime transition-all" style={{ width: `${quality}%` }} /></div></div>
      <div className="mt-6"><div className="flex items-center gap-2"><Waves size={19} className="text-glow-aqua" /><h3 className="text-lg font-semibold">{question.title}</h3><Tooltip content={question.hint}><button aria-label="Explain this question" className="text-white/50"><Info size={15} /></button></Tooltip></div><p className="mt-2 text-sm text-white/55">{question.hint}</p><div className="mt-4 grid grid-cols-2 gap-2">{question.choices.map(choice => <button key={choice.value} onClick={() => choose(choice.value)} className={`rounded-xl border p-3 text-left transition ${answers[question.key] === choice.value ? 'border-glow-aqua bg-glow-aqua/15 text-white' : 'border-white/10 bg-white/[.03] text-white/75 hover:border-white/30'}`}><span className="text-xl">{choice.icon}</span><span className="mt-1 block text-sm">{choice.label}</span>{answers[question.key] === choice.value && <Check size={15} className="mt-2 text-health-lime" />}</button>)}</div></div>
      {error && <p className="mt-4 rounded-lg bg-alert-coral/10 p-3 text-sm text-alert-coral">{error}</p>}
      <div className="mt-6 flex justify-between gap-3"><button onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0} className="flex items-center gap-1 rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-30"><ChevronLeft size={16} />Back</button>{step < QUESTIONS.length - 1 ? <button onClick={() => setStep(current => Math.min(QUESTIONS.length - 1, current + 1))} disabled={!answers[question.key]} className="flex items-center gap-1 rounded-lg bg-glow-aqua px-4 py-2 text-sm font-bold text-ink-navy disabled:opacity-40">Next<ChevronRight size={16} /></button> : <button onClick={() => void submit()} disabled={!answers[question.key] || saving} className="rounded-lg bg-health-lime px-4 py-2 text-sm font-bold text-ink-navy disabled:opacity-40">{saving ? 'Saving…' : 'Save checkup'}</button>}</div>
    </div>
  </div>;
}
