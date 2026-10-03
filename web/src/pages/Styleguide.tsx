import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GlassPanel } from '../ui/GlassPanel';
import { Pill } from '../ui/Pill';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { XPChip } from '../ui/XPChip';
import { Modal } from '../ui/Modal';
import { Toast } from '../ui/Toast';
import { Tabs } from '../ui/Tabs';
import { Tooltip } from '../ui/Tooltip';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Stepper } from '../ui/Stepper';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../store/authStore';

export const Styleguide = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { role, setRole } = useAuthStore();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
      <header className="flex items-center justify-between pb-8 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow-aqua">AquaAlert Design System</h1>
          <p className="text-foam-white/70 mt-2">Bioluminescent night river theme.</p>
        </div>
        <div className="flex gap-4 items-center">
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-deep-teal border border-glow-aqua/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-glow-aqua"
          >
            <option value="citizen">Role: Citizen</option>
            <option value="reviewer">Role: Reviewer</option>
            <option value="authority">Role: Authority</option>
          </select>
          <Button onClick={toggleTheme} variant="secondary">Toggle Theme ({theme})</Button>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Typography</h2>
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold">Display Heading 1</h1>
          <h2 className="text-3xl font-display font-semibold">Display Heading 2</h2>
          <h3 className="text-2xl font-display font-medium">Display Heading 3</h3>
          <p className="text-base font-body">Body Text: AquaAlert AI turns citizen observations into verified, location-aware environmental alerts and early warnings for urban water ecosystems.</p>
          <p className="text-sm font-mono text-glow-aqua">ID: AQA-2026-10394</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Zone</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Badges & Pills</h2>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <StatusBadge status="Healthy" />
          <StatusBadge status="Watch" />
          <StatusBadge status="Warning" />
          <StatusBadge status="Alert" />
        </div>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <PriorityBadge level="Low" />
          <PriorityBadge level="Medium" />
          <PriorityBadge level="High" />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Pill>Algae Bloom</Pill>
          <Pill>Debris</Pill>
          <XPChip xp={150} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Cards & Panels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-2">Standard Card</h3>
            <p className="text-sm text-white/70">Used for lists and standard content displays.</p>
          </Card>
          <GlassPanel blur="lg">
            <h3 className="font-semibold mb-2 text-glow-aqua">Heavy Glass Panel</h3>
            <p className="text-sm text-white/70">Used for emphasis or over 3D maps.</p>
          </GlassPanel>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Progress & Stepper</h2>
        <div className="space-y-8 max-w-lg">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Level 4</span>
              <span className="text-glow-aqua">450 / 1000 XP</span>
            </div>
            <ProgressBar progress={45} />
          </div>
          <Stepper steps={['Report', 'AI Check', 'Review']} currentStep={1} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Interactive Elements</h2>
        <div className="flex flex-wrap gap-8 items-start">
          <Avatar src="https://i.pravatar.cc/150?img=11" alt="User" size="lg" />
          
          <Tooltip content="Provides extra context">
            <span className="underline decoration-dashed decoration-glow-aqua/50 cursor-help">Hover me for tooltip</span>
          </Tooltip>

          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Example Modal">
            <p className="text-sm text-white/70 mb-4">This is a glassmorphic modal window.</p>
            <Button className="w-full" onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </Modal>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Feedback & State</h2>
        <div className="space-y-6 max-w-md">
          <Toast type="success" message="Report submitted successfully." />
          <Toast type="error" message="Failed to connect to AI provider." />
          <Toast type="info" message="New update available for AquaAlert." />
          
          <div className="mt-8 border border-white/10 rounded-xl p-4">
            <EmptyState 
              title="No reports yet" 
              description="You haven't submitted any water observations."
              action={<Button variant="secondary" size="sm">Submit Report</Button>}
            />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display mb-4 text-white">Tabs</h2>
        <Tabs 
          tabs={[
            { id: 't1', label: 'Overview', content: <div className="p-4 bg-white/5 rounded mt-2 text-sm">Overview content</div> },
            { id: 't2', label: 'History', content: <div className="p-4 bg-white/5 rounded mt-2 text-sm">History content</div> }
          ]}
        />
      </section>
      
    </div>
  );
};
