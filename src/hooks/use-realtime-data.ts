"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

const MAX_RETRIES = 5;
const FALLBACK_INTERVAL_MS = 30_000;

export function useRealtimeData() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retriesRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function invalidateAll() {
      queryClient.invalidateQueries({ queryKey: ["mrr"] });
      queryClient.invalidateQueries({ queryKey: ["social"] });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    }

    function startFallbackPolling() {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(invalidateAll, FALLBACK_INTERVAL_MS);
    }

    function stopFallbackPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    async function connect() {
      // Initialize the socket.io server (idempotent)
      await fetch("/api/socket").catch(() => null);

      const socket = io({ reconnection: false });
      socketRef.current = socket;

      socket.on("connect", () => {
        retriesRef.current = 0;
        stopFallbackPolling();
      });

      socket.on("disconnect", () => {
        startFallbackPolling();
      });

      socket.on("connect_error", () => {
        retriesRef.current += 1;
        if (retriesRef.current >= MAX_RETRIES) {
          socket.disconnect();
          startFallbackPolling();
        } else {
          const backoffMs = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000);
          setTimeout(() => socket.connect(), backoffMs);
        }
      });

      socket.on("dashboard:update", (data: { type: string }) => {
        switch (data.type) {
          case "mrr":
            queryClient.invalidateQueries({ queryKey: ["mrr"] });
            break;
          case "social":
            queryClient.invalidateQueries({ queryKey: ["social"] });
            break;
          case "webhook":
            queryClient.invalidateQueries({ queryKey: ["webhooks"] });
            break;
          case "users":
            queryClient.invalidateQueries({ queryKey: ["users"] });
            break;
          case "keywords":
            queryClient.invalidateQueries({ queryKey: ["keywords"] });
            break;
          case "calendar":
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            break;
          case "page-views":
            queryClient.invalidateQueries({ queryKey: ["page-views"] });
            break;
          case "traffic-sources":
            queryClient.invalidateQueries({ queryKey: ["traffic-sources"] });
            break;
          case "seo-overview":
            queryClient.invalidateQueries({ queryKey: ["seo-overview"] });
            break;
          case "sales":
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            break;
          case "conversion-funnel":
            queryClient.invalidateQueries({ queryKey: ["conversion-funnel"] });
            break;
          case "top-products":
            queryClient.invalidateQueries({ queryKey: ["top-products"] });
            break;
        }
      });

      socket.on("connect", () => socket.emit("join", "dashboard"));
    }

    connect().catch(() => startFallbackPolling());

    return () => {
      socketRef.current?.disconnect();
      stopFallbackPolling();
    };
  }, [queryClient]);
}
