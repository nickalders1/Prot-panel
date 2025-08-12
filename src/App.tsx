import React, { useState, useEffect } from 'react';
import { Shield, Activity, AlertTriangle, Globe, Server, Users, Clock, Zap } from 'lucide-react';
import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import { MetricCard } from './components/MetricCard';
import { TrafficChart } from './components/TrafficChart';
import { SecurityControls } from './components/SecurityControls';
import { ThreatFeed } from './components/ThreatFeed';
import { NetworkMap } from './components/NetworkMap';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [stats, setStats] = useState({
    totalRequests: '0',
    blockedAttacks: '0',
    activeConnections: '0',
    serverLoad: '0%'
  });
  const [isConnected, setIsConnected] = useState(false);
  const { lastMessage, isConnected: wsConnected } = useWebSocket();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    // Load initial stats
    const loadStats = async () => {
      try {
        const dashboardStats = await api.getDashboardStats();
        setStats({
          totalRequests: dashboardStats.total_requests?.toLocaleString() || '0',
          blockedAttacks: dashboardStats.blocked_requests?.toLocaleString() || '0',
          activeConnections: dashboardStats.unique_ips?.toLocaleString() || '0',
          serverLoad: '0%' // This would come from system monitoring
        });
        setIsConnected(true);
      } catch (error) {
        console.log('API not available yet, using default values');
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'alert') {
        const severity = lastMessage.data.severity;
        if (severity === 'high') setThreatLevel('high');
        else if (severity === 'medium') setThreatLevel('medium');
      } else if (lastMessage.type === 'traffic_update') {
        const { blocked, suspicious } = lastMessage.data;
        if (blocked > 50) setThreatLevel('high');
        else if (suspicious > 20 || blocked > 10) setThreatLevel('medium');
        else setThreatLevel('low');
      }
    }
  }, [lastMessage]);

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">SecureGuard Pro</h1>
                <p className="text-gray-400 text-sm">Advanced DDoS Protection Panel</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? '● Connected' : '● Disconnected'}
                </div>
                <div className={`text-sm font-semibold ${getThreatColor(threatLevel)}`}>
                  Threat Level: {threatLevel.toUpperCase()}
                </div>
                <div className="text-gray-400 text-xs">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
              
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                threatLevel === 'high' ? 'bg-red-400' : 
                threatLevel === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={Globe}
            trend={undefined}
            color="cyan"
            subtitle="Last 24 hours"
          />
          <MetricCard
            title="Blocked Attacks"
            value={stats.blockedAttacks}
            icon={Shield}
            trend={undefined}
            color="green"
            subtitle="Today"
          />
          <MetricCard
            title="Active Connections"
            value={stats.activeConnections}
            icon={Users}
            trend={undefined}
            color="yellow"
            subtitle="Unique IPs"
          />
          <MetricCard
            title="Server Load"
            value={stats.serverLoad}
            icon={Server}
            trend={undefined}
            color="red"
            subtitle="CPU Usage"
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Traffic Chart - Spans 2 columns */}
          <div className="lg:col-span-2">
            <TrafficChart />
          </div>
          
          {/* Security Controls */}
          <div>
            <SecurityControls />
          </div>
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Network Map */}
          <NetworkMap />
          
          {/* Threat Feed */}
          <ThreatFeed />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          {!isConnected && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Backend not connected. Start the server with: <code className="bg-gray-700 px-2 py-1 rounded">npm run server</code>
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={!isConnected}
              onClick={() => api.updateSetting('emergency_mode', 'true').catch(console.error)}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency Lockdown</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={!isConnected}
              onClick={() => api.updateSetting('ddos_protection', 'true').catch(console.error)}
            >
              <Zap className="w-4 h-4" />
              <span>Boost Protection</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={!isConnected}
            >
              <Activity className="w-4 h-4" />
              <span>Run Diagnostics</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={!isConnected}
            >
              <Clock className="w-4 h-4" />
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
