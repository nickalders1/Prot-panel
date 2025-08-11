import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Eye, MapPin } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';

export function ThreatFeed() {
  const [threats, setThreats] = useState<any[]>([]);
  const { lastMessage } = useWebSocket('ws://localhost:8080');

  useEffect(() => {
    // Load initial attack data
    const loadAttacks = async () => {
      try {
        const attacks = await api.getRecentAttacks();
        const formattedThreats = attacks.slice(0, 10).map(attack => ({
          id: attack.id.toString(),
          type: attack.blocked ? 'blocked' : 'attack',
          message: `${attack.attack_type} attack from`,
          source: attack.ip,
          timestamp: new Date(attack.timestamp),
          severity: attack.severity
        }));
        setThreats(formattedThreats);
      } catch (error) {
        console.log('No attack data available yet');
      }
    };

    loadAttacks();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'alert') {
      const newThreat = {
        id: Date.now().toString(),
        type: lastMessage.data.type,
        message: `${lastMessage.data.attackType || 'Unknown'} attack from`,
        source: lastMessage.data.ip,
        timestamp: new Date(lastMessage.timestamp),
        severity: lastMessage.data.severity
      };
      setThreats(prev => [newThreat, ...prev.slice(0, 9)]);
    }
  }, [lastMessage]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'attack': return AlertTriangle;
      case 'blocked': return Shield;
      case 'suspicious': return Eye;
      case 'info': return MapPin;
    }
  };

  const getColorClass = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-cyan-400 bg-cyan-900/20';
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Live Threat Feed</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {threats.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No threats detected yet</p>
            <p className="text-xs">Monitoring for suspicious activity...</p>
          </div>
        )}
        {threats.map(threat => {
          const Icon = getIcon(threat.type);
          return (
            <div key={threat.id} className={`p-3 rounded-lg ${getColorClass(threat.severity)} border border-opacity-30`}>
              <div className="flex items-start space-x-3">
                <Icon className="w-4 h-4 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {threat.message} {threat.source}
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(threat.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}