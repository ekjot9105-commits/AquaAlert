import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Styleguide } from './pages/Styleguide';
import { ReportWizard } from './features/reports/ReportWizard';
import { ReportDetail } from './pages/ReportDetail';

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="/report" element={<ReportWizard />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        
        {/* Redirect root to report wizard for Phase 2 demo */}
        <Route path="/" element={<Navigate to="/report" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
