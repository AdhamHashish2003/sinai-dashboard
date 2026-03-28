"use client";

import { useState, useEffect } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";

interface WidgetItem {
  id: string;
  title: string;
  position: number;
}

export function useWidgetGrid<T extends WidgetItem>(storageKey: string, defaults: T[]) {
  const [mounted, setMounted] = useState(false);
  const [widgets, setWidgets] = useState(defaults);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const order: string[] = JSON.parse(saved);
        const reordered = order
          .map((id) => defaults.find((w) => w.id === id))
          .filter((w): w is T => w !== undefined);
        // Append any new widgets not in saved order
        const remaining = defaults.filter((w) => !order.includes(w.id));
        if (reordered.length > 0) {
          setWidgets([...reordered, ...remaining].map((w, i) => ({ ...w, position: i })));
        }
      }
    } catch {
      // ignore bad localStorage
    }
  }, [storageKey]); // defaults is stable (const array)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx).map((w, i) => ({ ...w, position: i }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(next.map((w) => w.id)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { mounted, widgets, handleDragEnd };
}
