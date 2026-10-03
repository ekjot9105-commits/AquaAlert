import React, { useEffect, useState } from 'react';
import { Button } from '../../../ui/Button';
import { ReportDraft } from '../ReportWizard';
import { aiAssess } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { PriorityBadge } from '../../../ui/PriorityBadge';
import { Info, ScanLine, AlertCircle } from 'lucide-react';

interface Props {
  draft: ReportDraft;
  updateDraft: (u: Partial<ReportDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ScanStep: React.FC<Props> = ({ draft, updateDraft, onNext, onBack }) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [provider, setProvider] = useState<string>('');
  
  // Cinematic states
  const [findingsStep, setFindingsStep] = useState(0);

  useEffect(() => {
    if (!draft.aiResult) {
      aiAssess(draft.evidenceB64, draft.description).then(res => {
        setResult(res.result);
        setProvider(res.provider);
        updateDraft({ aiResult: res.result });
      }).catch(err => {
        console.error(err);
        setError(true);
      });
    } else {
      setResult(draft.aiResult);
    }
  }, []);

  useEffect(() => {
    if (result) {
      setAnalyzing(false);
      // Stagger findings
      const t1 = setTimeout(() => setFindingsStep(1), 500);
      const t2 = setTimeout(() => setFindingsStep(2), 1500);
      const t3 = setTimeout(() => setFindingsStep(3), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [result]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-alert-coral mb-4" />
        <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
        <p className="text-white/70 mb-8">We couldn't analyze the image. You can still submit your report manually.</p>
        <div className="flex gap-4 w-full">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button className="flex-1" onClick={() => {
            updateDraft({ aiResult: { priority_suggestion: 'Medium', categories: [], overall_confidence: 0 } });
            onNext();
          }}>Skip Analysis</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-display font-bold mb-6 text-center">
        {analyzing ? "AI Analysis in progress..." : "Analysis Complete"}
      </h2>

      <div className="relative rounded-2xl overflow-hidden aspect-square mb-6 bg-black flex items-center justify-center border-2 border-deep-teal mx-auto w-full max-w-sm">
        <img src={`data:image/jpeg;base64,${draft.evidenceB64}`} className="w-full h-full object-cover opacity-50" alt="Scanning" />
        
        {analyzing && (
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }} 
            transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
            className="absolute left-0 right-0 h-1 bg-glow-aqua shadow-[0_0_20px_rgba(46,230,214,1)] z-10"
          />
        )}
        
        {/* Confidence Ring overlay */}
        {!analyzing && result && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="w-32 h-32 rounded-full border-4 border-glow-aqua flex items-center justify-center bg-ink-navy/60 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-2xl font-display font-bold text-glow-aqua">{Math.round(result.overall_confidence * 100)}%</div>
                <div className="text-[10px] uppercase tracking-wider">Confidence</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-deep-teal border border-glow-aqua/30 text-xs text-white/80">
          <Info size={14} className="text-glow-aqua" />
          Visual assessment, not a laboratory test
          {provider === 'Mock' && <span className="ml-2 text-alert-coral font-bold">(Demo AI)</span>}
        </span>
      </div>

      <div className="flex-1 space-y-4 px-2">
        <AnimatePresence>
          {findingsStep >= 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm text-white/70">Detected Category</span>
              <span className="font-semibold">{result.categories[0]?.label.replace(/_/g, ' ') || 'None'}</span>
            </motion.div>
          )}
          {findingsStep >= 2 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm text-white/70">Suggested Priority</span>
              <PriorityBadge level={result.priority_suggestion} />
            </motion.div>
          )}
          {findingsStep >= 3 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-deep-teal/40 p-3 rounded-xl border border-white/5">
              <p className="text-sm italic text-white/90">"{result.categories[0]?.evidence_note || result.uncertainty_notes}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {findingsStep >= 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <p className="text-center text-sm font-medium mb-4">Does this look right?</p>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={onBack}>No, Edit</Button>
            <Button className="flex-1" onClick={onNext}>Yes, Submit</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
