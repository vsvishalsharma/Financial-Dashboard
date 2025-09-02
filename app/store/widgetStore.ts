import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetField {
  name: string;
  value: unknown;
  type: string;
}

export interface Widget {
  id: string;
  name: string;
  type: 'card' | 'table' | 'chart';
  apiUrl: string;
  refreshInterval: number;
  data: unknown;
  fields: WidgetField[];
  selectedFields: string[];
  lastUpdated: Date;
  isLoading?: boolean;
  error?: string;
  position: number;
}

interface WidgetStore {
  widgets: Widget[];
  isAddModalOpen: boolean;
  addWidget: (widget: Omit<Widget, 'id' | 'lastUpdated' | 'position'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (sourceIndex: number, destinationIndex: number) => void;
  setAddModalOpen: (open: boolean) => void;
  refreshWidget: (id: string) => Promise<void>;
  testApiUrl: (url: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: [
        {
          id: '1',
          name: 'Stock Prices',
          type: 'table',
          apiUrl: '',
          refreshInterval: 30,
          data: [
            { company: 'UI Inc Etf', price: 114.2, '52_week_high': 114.73 },
            { company: 'Mirae Asset Mutual Fund Silver Etf', price: 114.92, '52_week_high': 114.7 },
            { company: 'Sbi Ftx Sr4 1842 D Reg Nbcr Cf', price: 16.03, '52_week_high': 16.22 },
            { company: 'Hdfc Gold Etf', price: 87, '52_week_high': 88.21 },
            { company: 'Absl Fnrfm', price: 110.16, '52_week_high': 110.16 },
            { company: 'Motilal Oswal Midcap 100 Etf', price: 60.32, '52_week_high': 22 }
          ],
          fields: [
            { name: 'company', value: '', type: 'string' },
            { name: 'price', value: 0, type: 'number' },
            { name: '52_week_high', value: 0, type: 'number' }
          ],
          selectedFields: ['company', 'price', '52_week_high'],
          lastUpdated: new Date(),
          position: 0
        },
        {
          id: '2',
          name: 'Bitcoin',
          type: 'card',
          apiUrl: '',
          refreshInterval: 30,
          data: {
            currency: 'BTC',
            price: '₹73,69,378.76',
            rate: '946,423.01',
            change: '+0.87%'
          },
          fields: [
            { name: 'currency', value: '', type: 'string' },
            { name: 'price', value: '', type: 'string' },
            { name: 'rate', value: '', type: 'string' },
            { name: 'change', value: '', type: 'string' }
          ],
          selectedFields: ['currency', 'price', 'rate'],
          lastUpdated: new Date(),
          position: 1
        }
      ],
      isAddModalOpen: false,

      addWidget: (widgetData) => {
        const newWidget: Widget = {
          ...widgetData,
          id: Date.now().toString(),
          lastUpdated: new Date(),
          position: get().widgets.length
        };
        set((state) => ({
          widgets: [...state.widgets, newWidget]
        }));
      },

      removeWidget: (id) => {
        set((state) => ({
          widgets: state.widgets.filter(w => w.id !== id)
        }));
      },

      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, ...updates, lastUpdated: new Date() }
              : w
          )
        }));
      },

      reorderWidgets: (sourceIndex, destinationIndex) => {
        set((state) => {
          const newWidgets = [...state.widgets];
          const [removed] = newWidgets.splice(sourceIndex, 1);
          newWidgets.splice(destinationIndex, 0, removed);
          
          return {
            widgets: newWidgets.map((widget, index) => ({
              ...widget,
              position: index
            }))
          };
        });
      },

      setAddModalOpen: (open) => {
        set({ isAddModalOpen: open });
      },

      refreshWidget: async (id) => {
        const widget = get().widgets.find(w => w.id === id);
        if (!widget || !widget.apiUrl) return;

        set((state) => ({
          widgets: state.widgets.map(w => 
            w.id === id ? { ...w, isLoading: true } : w
          )
        }));

        try {
          // Detect Alpha Vantage and inject key via query param through proxy
          const needsAlphaKey = (() => {
            try { return new URL(widget.apiUrl).host.includes('alphavantage.co'); } catch { return false; }
          })();

          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: widget.apiUrl,
              method: 'GET',
              ...(needsAlphaKey ? { authEnv: 'ALPHA_VANTAGE_API_KEY', authQueryParam: 'apikey' } : {})
            })
          });

          if (response.status === 429) {
            const { message } = await response.json().catch(() => ({ message: 'API limit reached, try later' }));
            set((state) => ({
              widgets: state.widgets.map(w => 
                w.id === id 
                  ? { ...w, isLoading: false, error: message || 'API limit reached, try later' }
                  : w
              )
            }));
            return;
          }

          if (!response.ok) {
            const { message } = await response.json().catch(() => ({ message: 'Failed to fetch data' }));
            throw new Error(message || `Request failed with ${response.status}`);
          }

          const { data } = await response.json();
          const unwrapped = (() => {
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              const keys = Object.keys(data as Record<string, unknown>);
              if (keys.length === 1) {
                const inner = (data as Record<string, unknown>)[keys[0]];
                if (inner && (typeof inner === 'object')) return inner as unknown;
              }
            }
            return data as unknown;
          })();
          
          set((state) => ({
            widgets: state.widgets.map(w => 
              w.id === id 
                ? { ...w, data: unwrapped, isLoading: false, error: undefined, lastUpdated: new Date() }
                : w
            )
          }));
        } catch (error) {
          set((state) => ({
            widgets: state.widgets.map(w => 
              w.id === id 
                ? { ...w, isLoading: false, error: error instanceof Error ? error.message : 'Failed to fetch data' }
                : w
            )
          }));
        }
      },

      testApiUrl: async (url) => {
        try {
          const needsAlphaKey = (() => {
            try { return new URL(url).host.includes('alphavantage.co'); } catch { return false; }
          })();

          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              method: 'GET',
              ...(needsAlphaKey ? { authEnv: 'ALPHA_VANTAGE_API_KEY', authQueryParam: 'apikey' } : {})
            })
          });

          if (response.status === 429) {
            const { message } = await response.json().catch(() => ({ message: 'API limit reached, try later' }));
            return { success: false, error: message || 'API limit reached, try later' };
          }

          if (!response.ok) {
            const { message } = await response.json().catch(() => ({ message: 'Failed to test API' }));
            return { success: false, error: message || 'Failed to test API' };
          }

          const { data } = await response.json();
          const unwrapped = (() => {
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              const keys = Object.keys(data as Record<string, unknown>);
              if (keys.length === 1) {
                const inner = (data as Record<string, unknown>)[keys[0]];
                if (inner && (typeof inner === 'object')) return inner as unknown;
              }
            }
            return data as unknown;
          })();
          return { success: true, data: unwrapped };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to test API'
          };
        }
      }
    }),
    {
      name: 'widget-store'
    }
  )
);