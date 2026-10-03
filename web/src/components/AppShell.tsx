import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Bell, Droplets, FilePlus2, Home, Map, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

const links = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/report', label: 'Report', icon: FilePlus2 },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/warnings', label: 'Warnings', icon: Bell },
  { to: '/dashboard', label: 'Authority', icon: ShieldCheck },
];

export function AppShell() {
  return <div className="min-h-screen bg-ink-navy text-foam-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-navy/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
        <NavLink to="/home" className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-lg font-bold text-glow-aqua focus:outline-none focus:ring-2 focus:ring-glow-aqua"><Droplets size={21} />AquaAlert</NavLink>
        <nav aria-label="Primary navigation" className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-glow-aqua md:px-3 md:text-sm ${isActive ? 'bg-glow-aqua/15 text-glow-aqua' : 'text-white/65'}`}><Icon size={16} /><span>{label}</span></NavLink>)}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
    <main><Outlet /></main>
  </div>;
}
