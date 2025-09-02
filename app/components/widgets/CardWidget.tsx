import React from 'react';
import { RefreshCw, MoreVertical, Trash2, Edit, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useWidgetStore, Widget } from '@/store/widgetStore';

interface CardWidgetProps {
  widget: Widget;
}

export const CardWidget: React.FC<CardWidgetProps> = ({ widget }) => {
  const { removeWidget, refreshWidget, updateWidget } = useWidgetStore();

  const handleRefreshIntervalChange = (interval: string) => {
    updateWidget(widget.id, { refreshInterval: parseInt(interval) });
  };

  const data = (widget.data as Record<string, unknown>) || {};

  return (
    <div className="widget-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">{widget.name}</h3>
          <p className="text-sm text-primary">Last updated: {new Date(widget.lastUpdated).toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={widget.refreshInterval.toString()} onValueChange={handleRefreshIntervalChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1m</SelectItem>
              <SelectItem value="300">5m</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshWidget(widget.id)}
            disabled={widget.isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${widget.isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => removeWidget(widget.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        {widget.error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
            {widget.error}
          </div>
        )}
        {/* Currency Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">currency</span>
          </div>
          <span className="font-mono text-sm">{(data.currency as string) || 'N/A'}</span>
        </div>

        {/* Main Price Display */}
        <div className="text-center py-6">
          <div className="text-3xl font-bold text-primary mb-2">
            {(data.price as string) || 'N/A'}
          </div>
          <div className="text-sm text-muted">
            {(data.rate as string) || 'N/A'}
          </div>
        </div>

        {/* Additional Fields */}
        <div className="space-y-3 pt-4 border-t border-border">
          {widget.selectedFields.filter(field => !['currency', 'price', 'rate'].includes(field)).map((field) => (
            <div key={field} className="flex items-center justify-between">
              <span className="text-sm text-primary capitalize">{field.replace('_', ' ')}</span>
              <span className="text-sm font-medium">
                {String((data as Record<string, unknown>)[field] ?? 'N/A')}
              </span>
            </div>
          ))}
        </div>

        {/* Change Indicator */}
        {typeof data.change === 'string' && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className={`text-sm font-medium ${
              data.change.startsWith('+') ? 'text-success' : 'text-destructive'
            }`}>
              {data.change}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};