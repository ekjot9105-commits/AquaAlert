import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowDown, ArrowRight, Check, ChevronRight, CircleAlert, Droplets, Eye, HeartPulse, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';

const Scene = lazy(() => import('./LandingScene').then(module => ({ default: module.LandingScene })));

const acts = [
  { eyebrow: '01 / HERO', title: 'Healthy waters. Healthy ecosystems. Healthy communities.', body: 'Your phone is the earliest sensor a river has. AquaAlert turns safe everyday observations into shared action.', cta: 'Become a Water Guardian' },
  { eyebrow: '02 / SEE IT', title: 'Notice what changes before it becomes a crisis.', body: 'A 30-second check, a photo, or a simple “looks fine” helps build a living picture of the water around you.', cta: 'Keep exploring' },
  { eyebrow: '03 / AI SCAN', title: 'AI helps you look closer, not decide for you.', body: 'Visual assessment surfaces patterns and confidence. It is not a lab test, and a human always remains in the loop.', cta: 'See the safety layer' },
  { eyebrow: '04 / EARLY WARNING', title: 'Small signals become useful when they connect.', body: 'Clusters and trends raise an emerging-risk signal so communities and authorities can respond earlier.', cta: 'Watch the signal grow' },
  { eyebrow: '05 / RESPOND', title: 'People decide. Teams act. Rivers recover.', body: 'Prioritized queues, routing, evidence, and an audit trail carry one observation through verification to resolution.', cta: 'Meet the response loop' },
  { eyebrow: '06 / JOIN', title: 'Your first check can start a better week for water.', body: 'Build a streak without spam, earn trust through quality, and see the impact your neighborhood makes together.', cta: 'Start your first Water Check' },
];

export function Landing() {
  const [act, setAct] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [tour, setTour] = useState(false);
  const [canvasActive, setCanvasActive] = useState(true);
  const shell = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = (navigator.hardwareConcurrency || 4) <= 2;
    const webgl = (() => { try { const canvas = document.createElement('canvas'); return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl')); } catch { return false; } })();
    setFallback(reduced || lowPower || !webgl);
    const update = () => {
      const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setAct(Math.min(5, Math.floor((window.scrollY / height) * 6)));
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    const visibility = () => setCanvasActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setCanvasActive(entry.isIntersecting && document.visibilityState === 'visible'), { threshold: 0.05 });
    if (canvasHost.current) observer.observe(canvasHost.current);
    return () => {
      window.removeEventListener('scroll', update);
      document.removeEventListener('visibilitychange', visibility);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!tour) return;
    const timer = window.setInterval(() => {
      const next = Math.min(5, act + 1);
      document.getElementById(`act-${next}`)?.scrollIntoView({ behavior: 'smooth' });
      if (next === 5) setTour(false);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [tour, act]);
  const current = acts[act];
  const scrollTo = (index: number) => document.getElementById(`act-${index}`)?.scrollIntoView({ behavior: 'smooth' });
  return <div ref={shell} className="bg-ink-navy text-foam-white">
    <a href="#story" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-glow-aqua focus:px-4 focus:py-2 focus:text-ink-navy">Skip to story</a>
    <div className="relative">
      <div className={`sticky top-0 z-0 h-screen overflow-hidden ${fallback ? 'bg-[radial-gradient(circle_at_60%_35%,#155a69_0%,#0a2534_42%,#06141f_80%)]' : ''}`}>
        {!fallback && <Suspense fallback={null}><div ref={canvasHost} className="absolute inset-0"><Canvas dpr={[1, 2]} frameloop={canvasActive ? 'always' : 'never'} camera={{ position: [0, 2.5, 8], fov: 42 }}><Scene act={act} /></Canvas></div></Suspense>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-navy/60 via-transparent to-ink-navy" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-5 py-6 md:px-10">
          <nav className="pointer-events-auto flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-bold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-glow-aqua text-ink-navy"><Droplets size={20} /></span>AquaAlert</Link><span className="hidden text-right text-[10px] uppercase tracking-[.18em] text-white/55 sm:block">IEEE OneAquaHealth Global Hackathon 2026<br />Track 6: Resilience Informatics</span></nav>
          <div className="pointer-events-auto max-w-2xl pb-10"><span className="text-xs font-bold uppercase tracking-[.22em] text-glow-aqua">{current.eyebrow}</span><h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">{current.title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">{current.body}</p><div className="mt-7 flex flex-wrap gap-3">{act === 0 || act === 5 ? <Link to="/home" className="rounded-xl bg-glow-aqua px-5 py-3 font-bold text-ink-navy shadow-lg shadow-glow-aqua/20">{act === 5 ? 'Start your first Water Check' : 'Become a Water Guardian'} <ArrowRight size={17} className="ml-1 inline" /></Link> : <button onClick={() => scrollTo(Math.min(5, act + 1))} className="rounded-xl bg-glow-aqua px-5 py-3 font-bold text-ink-navy">{current.cta} <ArrowDown size={17} className="ml-1 inline" /></button>}{act === 0 && <button onClick={() => { setTour(true); scrollTo(1); }} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white backdrop-blur">Watch the 60-second tour</button>}</div></div>
          <div className="pointer-events-auto flex items-end justify-between"><div className="flex gap-2">{acts.map((item, index) => <button aria-label={`Go to ${item.eyebrow}`} key={item.eyebrow} onClick={() => scrollTo(index)} className={`h-1.5 rounded-full transition-all ${index === act ? 'w-10 bg-glow-aqua' : 'w-3 bg-white/30'}`} />)}</div><span className="hidden items-center gap-2 text-xs text-white/45 md:flex"><ArrowDown size={14} /> Scroll to explore</span></div>
        </div>
      </div>
      <div id="story" className="relative z-10 -mt-[600vh]">{acts.map((item, index) => <section id={`act-${index}`} key={item.eyebrow} aria-label={item.eyebrow} className="h-screen px-5 md:px-10"><div className="mx-auto max-w-6xl pt-[72vh]"><span className="sr-only">{item.title}. {item.body}</span></div></section>)}</div>
    </div>
    <BelowScene />
  </div>;
}

function BelowScene() {
  return <div className="relative z-20 border-t border-white/10 bg-ink-navy px-5 py-20 md:px-10"><div className="mx-auto max-w-6xl">
    <section aria-labelledby="how" className="py-12"><p className="text-xs uppercase tracking-[.2em] text-glow-aqua">From signal to stewardship</p><h2 id="how" className="mt-3 text-3xl font-bold md:text-5xl">How it works</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{[['01', Eye, 'See safely', 'Make a quick observation from a safe distance. Clean-water checks count too.'], ['02', Sparkles, 'Understand together', 'AI surfaces visual patterns while confidence and evidence stay visible.'], ['03', ShieldCheck, 'Act with trust', 'Human review, routing, and an audit trail turn signals into accountable action.']].map(([number, Icon, title, text]) => <article key={String(number)} className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><span className="text-sm text-glow-aqua">{String(number)}</span><Icon size={24} className="mt-8 text-glow-aqua" /><h3 className="mt-4 text-xl font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{String(text)}</p></article>)}</div></section>
    <section className="grid gap-6 py-20 lg:grid-cols-[1fr_1.2fr]"><div><p className="text-xs uppercase tracking-[.2em] text-watch-amber">One Health in one picture</p><h2 className="mt-3 text-3xl font-bold">Water connects the living world.</h2><p className="mt-4 text-white/60">Healthier ecosystems can support healthier habitats and communities. AquaAlert tracks environmental signals; it does not diagnose illness or claim medical outcomes.</p></div><div className="grid grid-cols-3 items-center gap-2 rounded-3xl border border-white/10 bg-white/[.04] p-6 text-center"><div><Waves className="mx-auto text-glow-aqua" /><p className="mt-2 text-sm">Water ecosystem</p></div><ChevronRight className="mx-auto text-white/30" /><div><HeartPulse className="mx-auto text-health-lime" /><p className="mt-2 text-sm">Animals & habitats</p></div><ChevronRight className="mx-auto text-white/30" /><div><CircleAlert className="mx-auto text-watch-amber" /><p className="mt-2 text-sm">Community awareness</p></div></div></section>
    <div className="grid gap-4 md:grid-cols-2"><InfoCard title="For citizens" icon={<Sparkles />} text="Gamified 30-second checks reward consistent, quality observations without encouraging spam or risky behavior." /><InfoCard title="For authorities" icon={<ShieldCheck />} text="Prioritized queues, routing, SLA visibility, human verification, and an evidence-backed audit trail." /><InfoCard title="Trust & safety" icon={<ShieldCheck />} text="AI recommends, humans decide. Evidence is retained, confidence is shown, and safety always comes first." /><InfoCard title="Built to scale" icon={<Waves />} text="Modular services, configurable routing per city, and an open API make the system ready to grow." /></div>
    <footer className="mt-20 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/45 md:flex-row md:justify-between"><span>AquaAlert · Water Guardians</span><span>IEEE OneAquaHealth · Track 6: Resilience Informatics</span><span>Demo data shown for the hackathon experience.</span></footer>
  </div></div>;
}
function InfoCard({ title, icon, text }: { title: string; icon: ReactNode; text: string }) { return <article className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><div className="text-glow-aqua">{icon}</div><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{text}</p><Check size={16} className="mt-5 text-health-lime" /></article>; }
