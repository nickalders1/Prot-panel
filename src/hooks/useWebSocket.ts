// src/hooks/useWebSocket.ts
import { useEffect, useMemo, useRef, useState } from "react";

export function useWebSocket(customUrl?: string) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const url = useMemo(() => {
    if (customUrl) return customUrl;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }, [customUrl]);

  const connect = () => {
    try {
      ws.current = new WebSocket(url);
      ws.current.onopen = () => setIsConnected(true);
      ws.current.onmessage = (e) => setLastMessage(JSON.parse(e.data));
      ws.current.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
      ws.current.onerror = (err) => console.error("WS error:", err);
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
    }
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      ws.current?.close();
    };
  }, [url]);

  return { isConnected, lastMessage, sendMessage };
}
