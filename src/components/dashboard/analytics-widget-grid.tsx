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
import { useState, type ComponentType } from "react";
import type { AnalyticsWidgetConfig, AnalyticsWidgetId } from "@/types/dashboard";
import { useWidgetGrid } from "@/hooks/use-widget-grid";
import { SortableWidgetCard } from "./sortable-widget-card";
import { PageViewsWidget } from "./widgets/page-views";
import { TrafficSourcesWidget } from "./widgets/traffic-sources";
import { SeoOverviewWidget } from "./widgets/seo-overview";
import { SalesRevenueWidget } from "./widgets/sales-revenue";
import { ConversionFunnelWidget } from "./widgets/conversion-funnel";
import { TopProductsWidget } from "./widgets/top-products";

const DEFAULT_WIDGETS: AnalyticsWidgetConfig[] = [
  { id: "page-views", title: "Page Views & Visitors", position: 0 },
  { id: "traffic-sources", title: "Traffic Sources", position: 1 },
  { id: "seo-overview", title: "SEO Overview", position: 2 },
  { id: "sales-revenue", title: "Sales & Revenue", position: 3 },
  { id: "conversion-funnel", title: "Conversion Funnel", position: 4 },
  { id: "top-products", title: "Top Products", position: 5 },
];

const PERIOD_OPTIONS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

const WIDGET_COMPONENTS: Record<AnalyticsWidgetId, ComponentType<Record<string, unknown>>> = {
  "page-views": PageViewsWidget as ComponentType<Record<string, unknown>>,
  "traffic-sources": TrafficSourcesWidget as ComponentType<Record<string, unknown>>,
  "seo-overview": SeoOverviewWidget as ComponentType<Record<string, unknown>>,
  "sales-revenue": SalesRevenueWidget as ComponentType<Record<string, unknown>>,
  "conversion-funnel": ConversionFunnelWidget as ComponentType<Record<string, unknown>>,
  "top-products": TopProductsWidget as ComponentType<Record<string, unknown>>,
};

export function AnalyticsWidgetGrid() {
  const { mounted, widgets, handleDragEnd } = useWidgetGrid("sinai-analytics-order", DEFAULT_WIDGETS);
  const [period, setPeriod] = useState("30");

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
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {widgets.map((widget) => (
              <SortableWidgetCard
                key={widget.id}
                id={widget.id}
                title={widget.title}
                Component={WIDGET_COMPONENTS[widget.id]}
                componentProps={{ period }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
