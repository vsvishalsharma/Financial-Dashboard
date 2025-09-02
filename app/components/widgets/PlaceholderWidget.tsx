import React from 'react';
import { Plus } from 'lucide-react';
import { useWidgetStore } from '@/store/widgetStore';

export const PlaceholderWidget: React.FC = () => {
  const { setAddModalOpen } = useWidgetStore();

  return (
    <div 
      className="widget-card border-dashed border-2 border-primary/30 hover:border-primary/50 cursor-pointer transition-colors group"
      onClick={() => setAddModalOpen(true)}
    >
      <div className="h-48 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/30 group-hover:border-primary/50 flex items-center justify-center mb-4 transition-colors">
          <Plus className="w-8 h-8 text-primary/60 group-hover:text-primary/80 transition-colors" />
        </div>
        <h3 className="text-lg font-medium text-primary mb-2">Add Widget</h3>
        <p className="text-sm text-secondary max-w-40">
          Connect to a finance API and create a custom widget
        </p>
      </div>
    </div>
  );
};