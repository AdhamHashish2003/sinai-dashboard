"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ComponentType } from "react";

interface SortableWidgetCardProps {
  id: string;
  title: string;
  Component: ComponentType<Record<string, unknown>>;
  componentProps?: Record<string, unknown>;
  dataUpdatedAt?: number;
}

export function SortableWidgetCard({ id, title, Component, componentProps, dataUpdatedAt }: SortableWidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
      className="rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {dataUpdatedAt && dataUpdatedAt > 0 ? (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
            </span>
          ) : null}
        </div>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0 ml-2"
          aria-label={`Drag ${title}`}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <div className="px-4 pb-4">
        <Component {...(componentProps ?? {})} />
      </div>
    </div>
  );
}
