import { useEffect, useState } from 'react';
import { CheckCircle2, Droplets, Heart, MapPin, Shield, Sparkles, Waves } from 'lucide-react';
import { XpHud } from '../components/XpHud';
import { WarningFeed } from '../components/WarningFeed';
import { StreamCheckup } from '../components/StreamCheckup';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n';

const API = 'http://localhost:8000';
type WaterBody = { id: number; name: string };
type Home = {
  user: { id: number; handle: string; xp: number; streak: number; name: string; level: number; current_threshold: number; next_threshold: number; next_name: string };
  adopted: Array<{ id: number; name: string; status: string; health_score: number }>;
  quests: Array<{ key: string; title: string; description: string; xp_reward: number; completed: boolean }>;
  impact: Array<{ report_id: number; status: string; issue_type: string }>;
  city_goal: { current: number; target: number; label: string };
};

export function GuardianHub() {
  const { t } = useI18n();
  const [home, setHome] = useState<Home | null>(null);
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [selectedBody, setSelectedBody] = useState('');
  const [showCheck, setShowCheck] = useState(false);
  const [showStreamCheckup, setShowStreamCheckup] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [message, setMessage] = useState('');
  const [sound, setSound] = useState(() => localStorage.getItem('aquaalert-sound') === 'on');
  const [quietHours, setQuietHours] = useState(() => localStorage.getItem('aquaalert-quiet-hours') === 'on');

  const load = () => Promise.all([
    fetch(`${API}/guardian/home?user_id=1`).then(response => response.json()),
    fetch(`${API}/water-bodies`).then(response => response.json()),
  ]).then(([guardian, bodies]) => {
    setHome(guardian);
    setWaterBodies(bodies);
    setSelectedBody(String(guardian.adopted[0]?.id ?? bodies[0]?.id ?? ''));
  });

  useEffect(() => { void load(); }, []);

  const completeCheck = async (response: string) => {
    const result = await fetch(`${API}/guardian/daily-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, water_body_id: Number(selectedBody), response }),
    }).then(request => request.json());
    setMessage(result.duplicate ? 'Already checked today — your observation is safely counted once.' : `+${result.xp_awarded} XP · streak ${result.user.streak}`);
    setCelebrate(!result.duplicate);
    setShowCheck(false);
    await load();
    window.setTimeout(() => setCelebrate(false), 1400);
  };

  if (!home) return <main className="min-h-screen bg-ink-navy p-6 text-white"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-32 rounded-2xl bg-white/10" /><div className="mt-4 h-64 rounded-2xl bg-white/10" /></div></main>;
  const goal = Math.min(100, Math.round((home.city_goal.current / home.city_goal.target) * 100));
  const selectedName = waterBodies.find(body => String(body.id) === selectedBody)?.name ?? 'Selected water body';
  const updatePreference = (key: string, enabled: boolean) => { localStorage.setItem(key, enabled ? 'on' : 'off'); };
  const playChime = () => {
    if (!sound) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.value = 0.04;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  };

  return <main className="min-h-screen bg-ink-navy p-4 text-white md:p-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-glow-aqua">{t('waterGuardians')}</p><h1 className="text-3xl font-bold">Hello, {home.user.handle}</h1></div><div className="flex items-center gap-3"><LanguageSwitcher /><div className="flex h-14 w-14 items-center justify-center rounded-full bg-glow-aqua/15 text-glow-aqua"><Droplets size={28} /></div></div></header>
      <div className="mt-5"><XpHud user={home.user} celebrate={celebrate} /></div>
      {message && <div className="mt-3 rounded-xl border border-health-lime/30 bg-health-lime/10 p-3 text-sm text-health-lime"><Sparkles size={15} className="mr-1 inline" />{message}</div>}
      <section className="mt-5 rounded-2xl border border-glow-aqua/30 bg-gradient-to-br from-deep-teal/70 to-ink-navy p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-glow-aqua">Ripple's tip</p><h2 className="mt-1 text-xl font-bold">Small observations make a safer watershed.</h2><p className="mt-2 text-sm text-white/65">Stay on paths and never enter the water to complete a quest.</p></div><div className="text-5xl" aria-label="Ripple mascot">💧</div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={() => setShowCheck(true)} className="rounded-xl bg-glow-aqua px-4 py-3 font-bold text-ink-navy shadow-lg shadow-glow-aqua/20"><CheckCircle2 size={18} className="mr-2 inline" />{t('dailyCheck')}</button>
          <button onClick={() => setShowStreamCheckup(true)} className="rounded-xl border border-health-lime/50 bg-health-lime/10 px-4 py-3 font-bold text-health-lime"><Waves size={18} className="mr-2 inline" />{t('streamCheckup')}</button>
        </div>
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Shield size={17} className="text-glow-aqua" />Today's quests</h2>{home.quests.slice(0, 3).map(quest => <div key={quest.key} className={`mb-2 rounded-xl border p-3 ${quest.completed ? 'border-health-lime/30 bg-health-lime/5' : 'border-white/10'}`}><div className="flex justify-between gap-2"><span className="text-sm font-medium">{quest.completed ? '✓ ' : ''}{quest.title}</span><span className="text-xs text-watch-amber">+{quest.xp_reward} XP</span></div><p className="mt-1 text-xs text-white/55">{quest.description}</p></div>)}</section>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Heart size={17} className="text-alert-coral" />Your water bodies</h2>{home.adopted.length ? home.adopted.map(body => <div key={body.id} className="mb-3"><div className="flex justify-between text-sm"><span>Guardian of {body.name}</span><span>{Math.round(body.health_score)}%</span></div><div className="mt-1 h-2 rounded bg-black/30"><div className="h-full rounded bg-glow-aqua" style={{ width: `${body.health_score}%` }} /></div><p className="mt-1 text-xs text-white/55">{body.status}</p></div>) : <p className="text-sm text-white/55">Adopt up to three water bodies to follow their health.</p>}<select aria-label="Adopt a water body" value={selectedBody} onChange={async event => { setSelectedBody(event.target.value); await fetch(`${API}/guardian/adopt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, water_body_id: Number(event.target.value) }) }); await load(); }} className="mt-2 w-full rounded-lg bg-black/20 p-2 text-sm"><option value="">Adopt a water body</option>{waterBodies.map(body => <option key={body.id} value={body.id}>{body.name}</option>)}</select></section>
      </div>
      <div className="mt-4"><WarningFeed /></div>
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">City goal</h2><span className="text-sm text-glow-aqua">{home.city_goal.current} / {home.city_goal.target}</span></div><p className="mt-1 text-xs text-white/55">{home.city_goal.label}</p><div className="mt-3 h-3 rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-glow-aqua to-health-lime" style={{ width: `${goal}%` }} /></div></section>
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4"><h2 className="mb-3 font-semibold">Impact journal</h2>{home.impact.length ? home.impact.map(item => <div key={item.report_id} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0"><MapPin size={16} className="text-glow-aqua" /><p className="text-sm">Report #{item.report_id}: {item.issue_type} · <span className="text-glow-aqua">{item.status}</span></p></div>) : <p className="text-sm text-white/55">Your verified impact will appear here.</p>}</section>
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4"><h2 className="mb-3 font-semibold">Small delights</h2><label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={sound} onChange={event => { setSound(event.target.checked); updatePreference('aquaalert-sound', event.target.checked); }} />Sound effects</label><label className="mt-2 flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={quietHours} onChange={event => { setQuietHours(event.target.checked); updatePreference('aquaalert-quiet-hours', event.target.checked); }} />Quiet hours for notifications</label><p className="mt-2 text-xs text-white/45">Sound is off by default. Haptic feedback is used only where your device supports it.</p></section>
    </div>
    {showStreamCheckup && selectedBody && <StreamCheckup waterBodyId={Number(selectedBody)} waterBodyName={selectedName} onClose={() => setShowStreamCheckup(false)} onComplete={result => { playChime(); setMessage(`+${result.xp_awarded} XP · checkup quality ${result.quality_score}%`); setCelebrate(result.xp_awarded > 0); setShowStreamCheckup(false); void load(); window.setTimeout(() => setCelebrate(false), 1400); }} />}
    {showCheck && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-glow-aqua/30 bg-ink-navy p-5"><h2 className="text-xl font-bold">Daily Water Check</h2><p className="mt-2 text-sm text-white/60">Choose a nearby water body. Stay on land and keep a safe distance.</p><select value={selectedBody} onChange={event => setSelectedBody(event.target.value)} className="mt-4 w-full rounded-lg bg-black/30 p-3">{waterBodies.map(body => <option key={body.id} value={body.id}>{body.name}</option>)}</select><div className="mt-4 grid gap-2"><button onClick={() => void completeCheck('fine')} className="rounded-lg bg-health-lime/20 p-3 text-left text-health-lime">Looks fine · valuable clean-water data</button><button onClick={() => void completeCheck('off')} className="rounded-lg bg-watch-amber/20 p-3 text-left text-watch-amber">Something is off · start a safe report</button><button onClick={() => setShowCheck(false)} className="rounded-lg border border-white/15 p-3 text-white/70">Cancel</button></div></div></div>}
  </main>;
}
