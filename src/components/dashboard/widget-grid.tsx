"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type { ComponentType } from "react";
import type { WidgetConfig, WidgetId } from "@/types/dashboard";
import { useWidgetGrid } from "@/hooks/use-widget-grid";
import { useRealtimeData } from "@/hooks/use-realtime-data";
import { SortableWidgetCard } from "./sortable-widget-card";
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

const WIDGET_COMPONENTS: Record<WidgetId, ComponentType<Record<string, unknown>>> = {
  "mrr-chart": MrrChartWidget as ComponentType<Record<string, unknown>>,
  "social-growth": SocialGrowthWidget as ComponentType<Record<string, unknown>>,
  "keyword-rankings": KeywordRankingsWidget as ComponentType<Record<string, unknown>>,
  "webhooks": WebhooksWidget as ComponentType<Record<string, unknown>>,
  "active-users": ActiveUsersWidget as ComponentType<Record<string, unknown>>,
  "content-calendar": ContentCalendarWidget as ComponentType<Record<string, unknown>>,
};

export function WidgetGrid() {
  const { mounted, widgets, handleDragEnd } = useWidgetGrid("sinai-saas-order", DEFAULT_WIDGETS);
  useRealtimeData();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DEFAULT_WIDGETS.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-card h-72 animate-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => (
            <SortableWidgetCard
              key={widget.id}
              id={widget.id}
              title={widget.title}
              Component={WIDGET_COMPONENTS[widget.id]}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
