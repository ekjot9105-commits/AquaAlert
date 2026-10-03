import { useState, useEffect } from 'react';
import { Stepper } from '../../ui/Stepper';
import { CaptureStep } from './steps/CaptureStep';
import { PlaceStep } from './steps/PlaceStep';
import { DescribeStep } from './steps/DescribeStep';
import { ScanStep } from './steps/ScanStep';
import { SuccessStep } from './steps/SuccessStep';

export type ReportDraft = {
  evidenceB64: string;
  lat: number | null;
  lng: number | null;
  waterBodyId: number | null;
  description: string;
  issueType: string;
  severity: string;
  aiResult: any;
};

const STEPS = ['Capture', 'Place', 'Describe', 'Scan'];
const DRAFT_KEY = 'aquaalert_report_draft';

export const ReportWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<ReportDraft>({
    evidenceB64: '',
    lat: null,
    lng: null,
    waterBodyId: null,
    description: '',
    issueType: '',
    severity: 'Medium',
    aiResult: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const updateDraft = (updates: Partial<ReportDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(p => Math.min(STEPS.length, p + 1));
  const prevStep = () => setCurrentStep(p => Math.max(0, p - 1));

  const reset = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft({ evidenceB64: '', lat: null, lng: null, waterBodyId: null, description: '', issueType: '', severity: 'Medium', aiResult: null });
    setCurrentStep(0);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-ink-navy text-foam-white flex flex-col pt-8 pb-12 px-4">
      {currentStep < STEPS.length && (
        <div className="mb-8">
          <Stepper steps={STEPS} currentStep={currentStep} />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {currentStep === 0 && <CaptureStep draft={draft} updateDraft={updateDraft} onNext={nextStep} />}
        {currentStep === 1 && <PlaceStep draft={draft} updateDraft={updateDraft} onNext={nextStep} onBack={prevStep} />}
        {currentStep === 2 && <DescribeStep draft={draft} updateDraft={updateDraft} onNext={nextStep} onBack={prevStep} />}
        {currentStep === 3 && <ScanStep draft={draft} updateDraft={updateDraft} onNext={nextStep} onBack={prevStep} />}
        {currentStep === 4 && <SuccessStep draft={draft} onReset={reset} />}
      </div>
    </div>
  );
};
