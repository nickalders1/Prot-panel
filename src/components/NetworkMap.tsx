import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function NetworkMap() {
  const [connections, setConnections] = useState<any[]>([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    // Initialize with empty connections
    setConnections([]);
  }, []);

  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'traffic_update' || lastMessage.type === 'alert')) {
      const centerX = 200;
      const centerY = 150;
      const newConnections = [];

      // Create connections based on real data
      const dataPoints = lastMessage.type === 'traffic_update' ? 
        [
          { type: 'normal', count: lastMessage.data.normal || 0 },
          { type: 'suspicious', count: lastMessage.data.suspicious || 0 },
          { type: 'blocked', count: lastMessage.data.blocked || 0 }
        ] : 
        [{ type: lastMessage.data.type === 'attack' ? 'blocked' : 'suspicious', count: 1 }];

      let connectionIndex = 0;
      dataPoints.forEach(({ type, count }) => {
        const numConnections = Math.min(Math.ceil(count / 10), 8); // Max 8 connections per type
        for (let i = 0; i < numConnections; i++) {
          const angle = (connectionIndex / 12) * Math.PI * 2;
          const radius = 80 + Math.random() * 40;
          const sourceX = centerX + Math.cos(angle) * radius;
          const sourceY = centerY + Math.sin(angle) * radius;
          
          newConnections.push({
            id: connectionIndex.toString(),
            source: { x: sourceX, y: sourceY },
            target: { x: centerX, y: centerY },
            type,
            intensity: Math.min(count / 50, 1) // Scale intensity based on count
          });
          connectionIndex++;
        }
      });

      setConnections(newConnections);
    }
  }, [lastMessage]);

  // Fallback: generate some basic connections if no data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (connections.length === 0) {
        const centerX = 200;
        const centerY = 150;
        const fallbackConnections = [];
        
        for (let i = 0; i < 6; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const sourceX = centerX + Math.cos(angle) * radius;
        const sourceY = centerY + Math.sin(angle) * radius;
        
        fallbackConnections.push({
          id: i.toString(),
          source: { x: sourceX, y: sourceY },
          target: { x: centerX, y: centerY },
          type: 'normal',
          intensity: 0.3
        });
      }
        setConnections(fallbackConnections);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [connections.length]);

  const getColor = (type: string) => {
    switch (type) {
      case 'normal': return '#10B981';
      case 'suspicious': return '#F59E0B';
      case 'blocked': return '#EF4444';
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Network Activity Map</h3>
      <div className="relative h-64 bg-gray-900/50 rounded-lg overflow-hidden">
        <svg className="w-full h-full">
          {/* Center node (server) */}
          <circle
            cx="200"
            cy="150"
            r="12"
            fill="#06B6D4"
            className="drop-shadow-lg"
          />
          <circle
            cx="200"
            cy="150"
            r="20"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2"
            opacity="0.3"
            className="animate-pulse"
          />
          
          {/* Connections */}
          {connections.map(connection => (
            <g key={connection.id}>
              <line
                x1={connection.source.x}
                y1={connection.source.y}
                x2={connection.target.x}
                y2={connection.target.y}
                stroke={getColor(connection.type)}
                strokeWidth={2 + connection.intensity * 3}
                opacity={0.4 + connection.intensity * 0.4}
                className="animate-pulse"
              />
              <circle
                cx={connection.source.x}
                cy={connection.source.y}
                r={4 + connection.intensity * 2}
                fill={getColor(connection.type)}
                opacity={0.8}
              />
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 space-y-1">
          {connections.length === 0 && (
            <div className="text-xs text-gray-400">
              Waiting for network data...
            </div>
          )}
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded"></div>
            <span className="text-gray-300">Normal</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">Suspicious</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-red-500 rounded"></div>
            <span className="text-gray-300">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
