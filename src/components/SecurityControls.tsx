import React, { useState } from 'react';
import { Shield, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import { api } from '../services/api';

interface SecurityControl {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  critical: boolean;
  icon: React.ElementType;
}

export function SecurityControls() {
  const [controls, setControls] = useState<SecurityControl[]>([
    {
      id: 'ddos-protection',
      name: 'DDoS Protection',
      description: 'Advanced DDoS mitigation algorithms',
      enabled: true,
      critical: true,
      icon: Shield
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting',
      description: 'Automatic request throttling',
      enabled: true,
      critical: false,
      icon: ShieldCheck
    },
    {
      id: 'geo-blocking',
      name: 'Geo-blocking',
      description: 'Block traffic from suspicious regions',
      enabled: false,
      critical: false,
      icon: AlertTriangle
    },
    {
      id: 'emergency-mode',
      name: 'Emergency Mode',
      description: 'Maximum security lockdown',
      enabled: false,
      critical: true,
      icon: Zap
    }
  ]);

  const toggleControl = (id: string) => {
    setControls(prev => prev.map(control => {
      if (control.id === id) {
        const newEnabled = !control.enabled;
        // Update setting via API
        api.updateSetting(control.id.replace('-', '_'), newEnabled.toString())
          .catch(error => console.error('Failed to update setting:', error));
        return { ...control, enabled: newEnabled };
      }
      return control;
    }));
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Security Controls</h3>
      <div className="space-y-4">
        {controls.map(control => {
          const Icon = control.icon;
          return (
            <div key={control.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${control.critical ? 'text-red-400' : 'text-cyan-400'}`} />
                <div>
                  <h4 className="text-white font-medium">{control.name}</h4>
                  <p className="text-gray-400 text-sm">{control.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleControl(control.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  control.enabled 
                    ? control.critical 
                      ? 'bg-red-600' 
                      : 'bg-cyan-600'
                    : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    control.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}