import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useWidgetStore, Widget } from '@/store/widgetStore';
import { TableWidget } from './widgets/TableWidget';
import { CardWidget } from './widgets/CardWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { PlaceholderWidget } from './widgets/PlaceholderWidget';
import { AddWidgetModal } from './AddWidgetModal';

export const Dashboard: React.FC = () => {
  const { widgets, reorderWidgets, setAddModalOpen, isAddModalOpen } = useWidgetStore();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderWidgets(result.source.index, result.destination.index);
  };

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'table':
        return <TableWidget widget={widget} />;
      case 'card':
        return <CardWidget widget={widget} />;
      case 'chart':
        return <ChartWidget widget={widget} />;
      default:
        return <PlaceholderWidget />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-primary-foreground rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-primary">Finance Dashboard</h1>
              <p className="text-sm text-primary mt-1">Active widget · Real-time data</p>
            </div>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>

        {/* Widgets Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="widgets" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {widgets
                  .sort((a, b) => a.position - b.position)
                  .map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`transform transition-all duration-200 ${
                            snapshot.isDragging ? 'scale-105 rotate-2' : ''
                          }`}
                        >
                          {renderWidget(widget)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                
                {/* Add Widget Placeholder */}
                <PlaceholderWidget />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Widget Modal */}
        <AddWidgetModal open={isAddModalOpen} onOpenChange={setAddModalOpen} />
      </div>
    </div>
  );
};