"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type ComponentType } from "react";
import { GripVertical } from "lucide-react";
import type { WidgetConfig, WidgetId } from "@/types/dashboard";
import { useRealtimeData } from "@/hooks/use-realtime-data";
import { MrrChartWidget } from "./widgets/mrr-chart";
import { SocialGrowthWidget } from "./widgets/social-growth";
import { KeywordRankingsWidget } from "./widgets/keyword-rankings";
import { WebhooksWidget } from "./widgets/webhooks";
import { ActiveUsersWidget } from "./widgets/active-users";
import { ContentCalendarWidget } from "./widgets/content-calendar";

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "mrr-chart", title: "MRR Overview", position: 0 },
  { id: "social-growth", title: "Social Growth", position: 1 },
  { id: "keyword-rankings", title: "Keyword Rankings", position: 2 },
  { id: "webhooks", title: "Recent Events", position: 3 },
  { id: "active-users", title: "Active Users", position: 4 },
  { id: "content-calendar", title: "Content Calendar", position: 5 },
];

const WIDGET_COMPONENTS: Record<WidgetId, ComponentType> = {
  "mrr-chart": MrrChartWidget,
  "social-growth": SocialGrowthWidget,
  "keyword-rankings": KeywordRankingsWidget,
  "webhooks": WebhooksWidget,
  "active-users": ActiveUsersWidget,
  "content-calendar": ContentCalendarWidget,
};

function SortableWidget({ widget }: { widget: WidgetConfig }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const Component = WIDGET_COMPONENTS[widget.id];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: "relative",
      }}
      className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{widget.title}</h3>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag ${widget.title}`}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <div className="px-4 pb-4">
        <Component />
      </div>
    </div>
  );
}

export function WidgetGrid() {
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  useRealtimeData();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((w, i) => ({ ...w, position: i }));
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => (
            <SortableWidget key={widget.id} widget={widget} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
