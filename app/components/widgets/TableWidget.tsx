"use client"
import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, ArrowUpDown, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useWidgetStore, Widget } from '@/store/widgetStore';
import { normalizeToRows, JSONObject, JSONValue } from '@/lib/dataMapper';

interface TableWidgetProps {
  widget: Widget;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ widget }) => {
  const { removeWidget, refreshWidget, updateWidget } = useWidgetStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo<JSONObject[]>(() => {
    const rows = normalizeToRows(widget.data as unknown as JSONValue, undefined);
    let data = [...rows];

    if (searchTerm) {
      data = data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortField) {
      data.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue ?? '').toLowerCase();
        const bStr = String(bValue ?? '').toLowerCase();
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return data;
  }, [widget.data, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRefreshIntervalChange = (interval: string) => {
    updateWidget(widget.id, { refreshInterval: parseInt(interval) });
  };

  const columns = widget.selectedFields.length > 0 ? widget.selectedFields : Object.keys(filteredData[0] || {});

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {columns.map((column) => (
                  <th
                    key={column}
                    className="text-left py-2 px-3 font-medium text-sm text-primary cursor-pointer hover:text-primary"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      {column.replace('_', ' ')}
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                  {columns.map((column) => {
                    const v = row[column] as JSONValue;
                    let content: React.ReactNode;
                    if (typeof v === 'number') content = v.toFixed(2);
                    else if (typeof v === 'string' || typeof v === 'boolean' || v === null) content = String(v ?? '');
                    else content = JSON.stringify(v);
                    return (
                      <td key={column} className="py-2 px-3 text-sm">{content}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted">
            No data available
          </div>
        )}

        <div className="text-xs text-muted text-right">
          6 of 6 items
        </div>
      </div>
    </div>
  );
};