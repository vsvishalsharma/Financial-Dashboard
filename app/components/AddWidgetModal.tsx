"use client";
import React, { useState } from 'react';
import { X, FlaskConical, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useWidgetStore, WidgetField } from '@/store/widgetStore';

interface AddWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ open, onOpenChange }) => {
  const { addWidget, testApiUrl } = useWidgetStore();
  
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    refreshInterval: 30,
    displayType: 'card' as 'card' | 'table' | 'chart'
  });
  
  const [apiTest, setApiTest] = useState<{
    loading: boolean;
    success: boolean;
    error?: string;
    data?: unknown;
    fields: WidgetField[];
  }>({
    loading: false,
    success: false,
    fields: []
  });
  
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const resetForm = () => {
    setFormData({ name: '', apiUrl: '', refreshInterval: 30, displayType: 'card' });
    setApiTest({ loading: false, success: false, fields: [] });
    setSelectedFields([]);
  };

  const handleTestApi = async () => {
    if (!formData.apiUrl) return;
    
    setApiTest(prev => ({ ...prev, loading: true, error: undefined }));
    
    const result = await testApiUrl(formData.apiUrl);
    
    if (result.success && result.data) {
      const fields = extractFields(result.data);
      setApiTest({
        loading: false,
        success: true,
        data: result.data,
        fields
      });
      // Auto-select all fields initially
      setSelectedFields(fields.map(f => f.name));
    } else {
      setApiTest({
        loading: false,
        success: false,
        error: result.error,
        fields: []
      });
    }
  };

  const extractFields = (data: unknown): WidgetField[] => {
    const fields: WidgetField[] = [];
    
    if (Array.isArray(data) && data.length > 0) {
      // For array data, extract fields from first object
      const firstItem = data[0] as Record<string, unknown>;
      Object.keys(firstItem).forEach(key => {
        fields.push({
          name: key,
          value: firstItem[key],
          type: typeof firstItem[key]
        });
      });
    } else if (typeof data === 'object' && data !== null) {
      // For object data, extract all keys
      const obj = data as Record<string, unknown>;
      Object.keys(obj).forEach(key => {
        fields.push({
          name: key,
          value: obj[key],
          type: typeof obj[key]
        });
      });
    }
    
    return fields;
  };

  const handleFieldSelection = (fieldName: string, checked: boolean) => {
    setSelectedFields(prev => 
      checked 
        ? [...prev, fieldName]
        : prev.filter(f => f !== fieldName)
    );
  };

  const handleSubmit = () => {
    if (!formData.name || !apiTest.success) return;
    
    addWidget({
      name: formData.name,
      type: formData.displayType,
      apiUrl: formData.apiUrl,
      refreshInterval: formData.refreshInterval,
      data: apiTest.data,
      fields: apiTest.fields,
      selectedFields: selectedFields.length > 0 ? selectedFields : apiTest.fields.map(f => f.name)
    });
    
    resetForm();
    onOpenChange(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Widget
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-1">
          {/* Widget Name */}
          <div className="space-y-2">
            <Label htmlFor="widget-name">Widget Name</Label>
            <Input
              id="widget-name"
              placeholder="Bitcoin"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <div className="flex gap-2">
              <Input
                id="api-url"
                placeholder="https://api.coinbase.com/v2/exchange-rates?currency=BTC"
                value={formData.apiUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                className="flex-1"
              />
              <Button 
                onClick={handleTestApi}
                disabled={!formData.apiUrl || apiTest.loading}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
              >
                {apiTest.loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4 mr-1" />
                    Test
                  </>
                )}
              </Button>
            </div>
            
            {/* API Test Status */}
            {apiTest.success && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="w-4 h-4" />
                API connection successful! 1 top-level fields found.
              </div>
            )}
            
            {apiTest.error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {apiTest.error}
              </div>
            )}
          </div>

          {/* Refresh Interval */}
          <div className="space-y-2">
            <Label>Refresh Interval (seconds)</Label>
            <Input
              type="number"
              placeholder="30"
              value={formData.refreshInterval}
              onChange={(e) => setFormData(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 30 }))}
            />
          </div>

          {/* Display Mode */}
          <div className="space-y-2">
            <Label>Select Fields to Display</Label>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Mode</Label>
              <div className="flex gap-2">
                {(['card', 'table', 'chart'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={formData.displayType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, displayType: type }))}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Field Selection */}
          {apiTest.fields.length > 0 && (
            <div className="space-y-3">
              <Label>Search Fields</Label>
              <Input placeholder="Search for fields..." />
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-arrays"
                    defaultChecked
                  />
                  <Label htmlFor="show-arrays" className="text-sm">
                    Show arrays only (for table view)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Available Fields</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
                  {apiTest.fields.map((field) => (
                    <div key={field.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={field.name}
                          checked={selectedFields.includes(field.name)}
                          onCheckedChange={(checked) => handleFieldSelection(field.name, checked as boolean)}
                        />
                        <Label htmlFor={field.name} className="text-sm font-medium">
                          {field.name}
                        </Label>
                        <span className="text-xs text-muted bg-muted px-1 rounded">
                          {field.type}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <span className="text-xs">+</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Fields */}
              {selectedFields.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Fields</Label>
                  <div className="p-3 border rounded-md bg-muted/20">
                    {selectedFields.map((fieldName) => (
                      <div key={fieldName} className="flex items-center justify-between py-1">
                        <span className="text-sm">{fieldName}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleFieldSelection(fieldName, false)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !apiTest.success}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Add Widget
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};