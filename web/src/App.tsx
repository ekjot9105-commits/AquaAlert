import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Styleguide } from './pages/Styleguide';
import { ReportWizard } from './features/reports/ReportWizard';
import { ReportDetail } from './pages/ReportDetail';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { Analytics } from './pages/Analytics';
import { lazy, Suspense } from 'react';
import { WarningFeed } from './components/WarningFeed';
import { GuardianHub } from './pages/GuardianHub';
import { Landing } from './pages/Landing';
import { I18nProvider } from './i18n';
import { CityAdmin } from './pages/CityAdmin';
import { AppShell } from './components/AppShell';

const CommunityMap = lazy(() => import('./pages/CommunityMap').then(module => ({ default: module.CommunityMap })));

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      <I18nProvider><ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppShell />}>
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="/report" element={<ReportWizard />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="/dashboard" element={<AuthorityDashboard />} />
          <Route path="/map" element={<Suspense fallback={<div className="p-8">Loading community map...</div>}><CommunityMap /></Suspense>} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin/cities" element={<CityAdmin />} />
          <Route path="/warnings" element={<div className="min-h-screen bg-ink-navy p-6 text-white"><WarningFeed /></div>} />
          <Route path="/home" element={<GuardianHub />} />
        </Route>
      </Routes>
      </ErrorBoundary></I18nProvider>
    </BrowserRouter>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AquaAlert page failed to render', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-ink-navy p-6 text-white">
          <section className="max-w-md rounded-2xl border border-alert-coral/40 bg-white/5 p-6 text-center">
            <h1 className="text-2xl font-bold">This page needs a refresh</h1>
            <p className="mt-2 text-sm text-white/65">A display error was caught without losing your report data.</p>
            <button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-glow-aqua px-4 py-2 font-semibold text-ink-navy">Reload page</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default App;
