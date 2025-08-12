import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function TrafficChart() {
  const [data, setData] = useState<any[]>([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    // Initialize with empty data
    const initData = [];
    for (let i = 29; i >= 0; i--) {
      const time = new Date(Date.now() - i * 2000);
      initData.push({
        time: time.toLocaleTimeString(),
        normal: 0,
        suspicious: 0,
        blocked: 0
      });
    }
    setData(initData);
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'traffic_update') {
      const newPoint = {
        time: new Date().toLocaleTimeString(),
        normal: lastMessage.data.normal || 0,
        suspicious: lastMessage.data.suspicious || 0,
        blocked: lastMessage.data.blocked || 0
      };
      
      setData(prev => {
        const newData = [...prev.slice(1), newPoint];
        return newData;
      });
    }
  }, [lastMessage]);

  // Fallback to fetch data if WebSocket is not available
  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const response = await fetch('/api/traffic?hours=1');
        if (response.ok) {
          const trafficData = await response.json();
          if (trafficData.length > 0) {
            const formattedData = trafficData.slice(-30).map((item: any) => ({
              time: new Date(item.timestamp).toLocaleTimeString(),
              normal: item.normal_requests || 0,
              suspicious: item.suspicious_requests || 0,
              blocked: item.blocked_requests || 0
            }));
            setData(formattedData);
          }
        }
      } catch (error) {
        console.log('Traffic data not available yet');
      }
    };

    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 30000);

    return () => clearInterval(interval);
  }, []);

  const maxValue = Math.max(...data.map(d => d.normal + d.suspicious + d.blocked));
  const displayMaxValue = maxValue > 0 ? maxValue : 100;

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Real-time Traffic Analysis</h3>
      <div className="h-64 relative">
        <svg className="w-full h-full">
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const normalHeight = (point.normal / displayMaxValue) * 80;
            const suspiciousHeight = (point.suspicious / displayMaxValue) * 80;
            const blockedHeight = (point.blocked / displayMaxValue) * 80;
            
            return (
              <g key={index}>
                {/* Normal traffic */}
                <rect
                  x={`${x}%`}
                  y={`${100 - normalHeight}%`}
                  width="2%"
                  height={`${normalHeight}%`}
                  fill="#10B981"
                  opacity="0.8"
                />
                {/* Suspicious traffic */}
                <rect
                  x={`${x}%`}
                  y={`${100 - normalHeight - suspiciousHeight}%`}
                  width="2%"
                  height={`${suspiciousHeight}%`}
                  fill="#F59E0B"
                  opacity="0.8"
                />
                {/* Blocked traffic */}
                <rect
                  x={`${x}%`}
                  y={`${100 - normalHeight - suspiciousHeight - blockedHeight}%`}
                  width="2%"
                  height={`${blockedHeight}%`}
                  fill="#EF4444"
                  opacity="0.8"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-center text-sm text-gray-400 mt-2">
        {data.length > 0 && data[data.length - 1].normal + data[data.length - 1].suspicious + data[data.length - 1].blocked === 0 
          ? "Waiting for traffic data..." 
          : `Latest: ${data[data.length - 1]?.normal || 0} normal, ${data[data.length - 1]?.suspicious || 0} suspicious, ${data[data.length - 1]?.blocked || 0} blocked`}
      </div>
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-300">Normal</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-sm text-gray-300">Suspicious</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-300">Blocked</span>
        </div>
      </div>
    </div>
  );
}
