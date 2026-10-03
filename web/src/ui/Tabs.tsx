import React, { useState } from 'react';
import { cn } from '../utils/cn';

export const Tabs = ({ tabs, defaultTab }: { tabs: { id: string, label: string, content: React.ReactNode }[], defaultTab?: string }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div>
      <div className="flex space-x-1 border-b border-white/10 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-glow-aqua text-glow-aqua"
                : "border-transparent text-foam-white/70 hover:text-foam-white hover:border-white/20"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
};
