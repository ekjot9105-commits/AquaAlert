import React, { useEffect, useState } from 'react';
import { Button } from '../../../ui/Button';
import { ReportDraft } from '../ReportWizard';
import { submitReport } from '../../../services/api';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, Circle, Navigation } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  draft: ReportDraft;
  onReset: () => void;
}

export const SuccessStep: React.FC<Props> = ({ draft, onReset }) => {
  const [status, setStatus] = useState<'submitting' | 'success' | 'error'>('submitting');
  const [reportId, setReportId] = useState<number | null>(null);
  const { role } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Only submit if we haven't already
    const submit = async () => {
      try {
        const payload = {
          user_id: 1, // Mock citizen ID
          water_body_id: draft.waterBodyId,
          lat: draft.lat,
          lng: draft.lng,
          description: draft.description,
          issue_type: draft.issueType,
          evidence_b64: draft.evidenceB64,
          evidence_url: "https://placehold.co/600x400/004d00/FFF?text=Demo+Upload", // Mock upload URL
          ai_result_json: JSON.stringify(draft.aiResult),
          ai_confidence: draft.aiResult?.overall_confidence || 0,
          ai_priority: draft.aiResult?.priority_suggestion || "Low",
        };
        const res = await submitReport(payload);
        setReportId(res.id);
        setStatus('success');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };
    submit();
  }, []);

  if (status === 'submitting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Navigation size={48} className="text-glow-aqua opacity-50" />
        </motion.div>
        <p className="mt-4 font-medium">Submitting your observation...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-alert-coral mb-4">Submission failed. Your draft is saved locally.</p>
        <Button onClick={() => setStatus('submitting')}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center text-center">
      {/* XP Burst Simulation */}
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="w-24 h-24 bg-glow-aqua/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(46,230,214,0.4)]"
      >
        <Check size={48} className="text-glow-aqua" />
      </motion.div>

      <h2 className="text-3xl font-display font-bold mb-2">+50 XP Earned!</h2>
      <p className="text-white/70 mb-8">Thank you for protecting our waters.</p>

      <div className="bg-deep-teal/40 border border-white/10 rounded-2xl p-6 w-full text-left mb-8">
        <h3 className="font-semibold mb-1 text-glow-aqua">Case ID: AQA-{reportId}</h3>
        <p className="text-sm text-white/70 mb-6">What happens next?</p>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <CheckCircle2 className="text-glow-aqua mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-xs text-white/50">AI analysis attached</p>
            </div>
          </div>
          <div className="flex gap-3 opacity-50">
            <Circle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium">Under Review</p>
              <p className="text-xs">Human or field verification</p>
            </div>
          </div>
          <div className="flex gap-3 opacity-50">
            <Circle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium">Action Taken</p>
              <p className="text-xs">Response unit dispatched</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full">
        <Button variant="secondary" className="flex-1" onClick={onReset}>New Report</Button>
        <Button className="flex-1" onClick={() => navigate(`/reports/${reportId}`)}>View Details</Button>
      </div>
    </div>
  );
};
