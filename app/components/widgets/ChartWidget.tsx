import React, { useMemo } from 'react';
import { RefreshCw, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWidgetStore, Widget } from '@/store/widgetStore';
import { normalizeToRows, JSONObject } from '@/lib/dataMapper';

interface ChartWidgetProps {
  widget: Widget;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget }) => {
  const { removeWidget, refreshWidget, updateWidget } = useWidgetStore();

  const handleRefreshIntervalChange = (interval: string) => {
    updateWidget(widget.id, { refreshInterval: parseInt(interval) });
  };

  // Prepare chart data using normalized rows and smart field selection
  const chartData = useMemo(() => {
    const payload = (widget.data as unknown) as JSONObject | undefined;
    if (!payload) return [] as { name: string; value: number }[];

    // 1) Alpha Vantage: detect Time Series blocks and convert to points
    const tsKey = Object.keys(payload).find(k => /time series/i.test(k));
    if (tsKey) {
      const series = payload[tsKey] as unknown;
      if (series && typeof series === 'object' && !Array.isArray(series)) {
        const entries = Object.entries(series as Record<string, JSONObject>);
        // Prefer newest last for left-to-right chronological display
        const sorted = entries.sort(([a], [b]) => a.localeCompare(b));

        const points = sorted.map(([name, obj]) => {
          const o = obj as JSONObject;
          // Prefer '4. close' then other numeric fields
          const preferredKeys = ['4. close', '5. adjusted close', 'close', 'price', 'value'];
          let raw: unknown = undefined;
          for (const key of preferredKeys) {
            if (o[key] != null) { raw = o[key]; break; }
          }
        
          if (raw == null) {
            // fallback to first numeric-looking field
            const firstNumericKey = Object.keys(o).find(k => !Number.isNaN(parseFloat(String(o[k]))));
            raw = firstNumericKey ? o[firstNumericKey] : undefined;
          }
          const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
          return { name, value: Number.isFinite(num) ? num : NaN };
        }).filter(p => Number.isFinite(p.value));

        return points;
      }
    }

    // 2) Generic fallback: normalize rows and pick fields heuristically
    const rows = normalizeToRows(payload, widget.selectedFields);
    if (!rows.length) return [] as { name: string; value: number }[];

    const lower = (s: string) => s.toLowerCase();
    const candidatesX = ['date', 'time', 'timestamp', 'latest trading day', 'name', 'symbol'];
    const candidatesY = ['price', 'close', 'value', 'open', 'high', 'low', 'volume', 'change'];

    const allKeys = Object.keys(rows[0] || {});
    const xField = widget.selectedFields.find(f => candidatesX.includes(lower(f)))
      || allKeys.find(k => candidatesX.includes(lower(k)))
      || allKeys[0];

    const findNumericField = (keys: string[]) => {
      const sel = widget.selectedFields.find(f => candidatesY.some(c => lower(f).includes(c)) || /\d+\.\s*(price|close|open|high|low|volume|change)/i.test(f));
      if (sel) return sel;
      const byName = keys.find(k => candidatesY.some(c => lower(k).includes(c)));
      if (byName) return byName;
      const numericKey = keys.find(k => rows.some(r => !Number.isNaN(parseFloat(String((r as JSONObject)[k])))));
      return numericKey || keys[0];
    };

    const yField = findNumericField(allKeys);
    const points = rows.map((r, idx) => {
      const name = String((r as JSONObject)[xField] ?? `Item ${idx + 1}`);
      const raw = (r as JSONObject)[yField];
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
      return { name, value: Number.isFinite(num) ? num : NaN };
    }).filter(p => Number.isFinite(p.value));

    return points;
  }, [widget.data, widget.selectedFields]);

  return (
    <div className="widget-card relative">
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

      <div className="h-64">
        {widget.error && (
          <div className="mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
            {widget.error}
          </div>
        )}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--text-secondary))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--text-secondary))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--widget-bg))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--text-primary))'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted">
            No data available for chart
          </div>
        )}
      </div>

      {widget.isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};