import { Button } from '../../../ui/Button';
import type { ReportDraft } from '../ReportWizard';
import { cn } from '../../../utils/cn';
import { AlertTriangle, Trash2, Droplets, Leaf, Activity, Wind, HelpCircle, CheckCircle } from 'lucide-react';

interface Props {
  draft: ReportDraft;
  updateDraft: (u: Partial<ReportDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'Visible waste', icon: Trash2 },
  { id: 'Discoloration', icon: Droplets },
  { id: 'Algae-like growth', icon: Leaf },
  { id: 'Foam or oil sheen', icon: Droplets },
  { id: 'Fish or aquatic distress', icon: Activity },
  { id: 'Bad smell', icon: Wind },
  { id: 'Looks fine', icon: CheckCircle },
  { id: 'Other', icon: HelpCircle },
];

export const DescribeStep = ({ draft, updateDraft, onNext, onBack }: Props) => {
  return (
    <div className="flex flex-col flex-1">
      <div className="bg-alert-coral/10 border border-alert-coral/30 rounded-xl p-3 mb-6 flex items-start gap-3">
        <AlertTriangle className="text-alert-coral shrink-0 mt-0.5" size={18} />
        <p className="text-sm font-medium text-alert-coral">
          Safety first: Never enter, touch, or collect contaminated water.
        </p>
      </div>

      <h2 className="text-xl font-display font-bold mb-4">What seems to be the issue?</h2>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = draft.issueType === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => updateDraft({ issueType: cat.id })}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border",
                isSelected 
                  ? "bg-glow-aqua text-ink-navy border-glow-aqua shadow-[0_0_10px_rgba(46,230,214,0.3)] font-semibold" 
                  : "bg-deep-teal/50 border-white/10 text-white/80 hover:bg-white/10"
              )}
            >
              <Icon size={16} />
              {cat.id}
            </button>
          );
        })}
      </div>

      <textarea
        placeholder="Add a short description (optional)..."
        value={draft.description}
        onChange={e => updateDraft({ description: e.target.value })}
        className="w-full bg-deep-teal/30 border border-white/20 rounded-xl p-4 text-sm focus:outline-none focus:border-glow-aqua focus:ring-1 focus:ring-glow-aqua resize-none h-24 mb-6"
      />

      <h3 className="text-sm font-semibold mb-3">How serious does it look?</h3>
      <div className="flex gap-2 mb-8 bg-deep-teal/30 p-1 rounded-xl border border-white/10">
        {['Low', 'Medium', 'High'].map(level => (
          <button
            key={level}
            onClick={() => updateDraft({ severity: level })}
            className={cn(
              "flex-1 py-2 text-sm rounded-lg font-medium transition-all",
              draft.severity === level 
                ? (level === 'High' ? "bg-alert-coral text-white" : level === 'Low' ? "bg-health-lime text-ink-navy" : "bg-watch-amber text-ink-navy")
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mt-auto">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext} disabled={!draft.issueType}>Analyze Image</Button>
      </div>
    </div>
  );
};
