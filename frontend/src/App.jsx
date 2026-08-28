import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Sun, Moon, RefreshCw, Radio, Sparkles } from 'lucide-react';
import AlertQueue from './components/AlertQueue';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import EntityHistory from './components/EntityHistory';
import AttackSimulator from './components/AttackSimulator';
import ModelMetrics from './components/ModelMetrics';
import WorldMap from './components/WorldMap';
import AttackGraph from './components/AttackGraph';
import RealLogUploader from './components/RealLogUploader';
import UserProcessDashboard from './components/UserProcessDashboard';

export default function App() {
  const [theme, setTheme] = useState('warm'); // 'warm' or 'black'
  const [activeTab, setActiveTab] = useState('alerts');
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const latestAlertIdRef = useRef(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'warm' ? 'black' : 'warm';
    setTheme(nextTheme);
    if (nextTheme === 'black') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const pollData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [statusRes, alertsRes, entitiesRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => null),
        fetch('/api/alerts').then(r => r.json()).catch(() => ({ alerts: [] })),
        fetch('/api/entities').then(r => r.json()).catch(() => ({ entities: [] }))
      ]);

      if (statusRes) setStatus(statusRes);
      if (alertsRes.alerts) {
        const fetchedAlerts = alertsRes.alerts;
        const latestId = fetchedAlerts.length > 0 ? fetchedAlerts[0].event_id : null;

        if (isInitial || latestId !== latestAlertIdRef.current || fetchedAlerts.length !== alerts.length) {
          latestAlertIdRef.current = latestId;
          setAlerts(fetchedAlerts);
          setSelectedAlert(prevSelected => {
            if (!prevSelected) return fetchedAlerts[0] || null;
            const existing = fetchedAlerts.find(a => a.event_id === prevSelected.event_id);
            return existing || (isInitial ? fetchedAlerts[0] : prevSelected);
          });
        }
      }
      if (entitiesRes.entities) setEntities(entitiesRes.entities);
    } catch (e) {
      console.error("Polling error:", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    pollData(true);
    const pollInterval = setInterval(() => {
      pollData(false);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleUploadedAlerts = (newAlerts) => {
    if (newAlerts && newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev]);
      setSelectedAlert(newAlerts[0]);
      setActiveTab('alerts');
    }
  };

  const handleSimulatedAlert = (newAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
    setSelectedAlert(newAlert);
    setActiveTab('alerts');
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesFilter = activeFilter === 'ALL' ||
      (a.predicted_label || '').toLowerCase().includes(activeFilter.toLowerCase()) ||
      (a.actual_label || '').toLowerCase().includes(activeFilter.toLowerCase());
    
    const matchesSearch = !searchTerm ||
      (a.entity_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.event_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.mitre?.technique_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const isDark = theme === 'black';

  const [simStreaming, setSimStreaming] = useState(false);

  const checkSimStatus = async () => {
    try {
      const res = await fetch('/api/simulation/stream/status');
      const data = await res.json();
      setSimStreaming(data.active);
    } catch (e) {}
  };

  const toggleLiveSimStream = async () => {
    try {
      const endpoint = simStreaming ? '/api/simulation/stream/stop' : '/api/simulation/stream/start';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setSimStreaming(data.active);
      pollData(false);
    } catch (e) {}
  };

  useEffect(() => {
    checkSimStatus();
    const interval = setInterval(checkSimStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f6f4ee] text-stone-900'
    }`}>
      {/* Curved Minimal Header */}
      <header className={`sticky top-0 z-50 glass-panel border-b transition-colors duration-300 ${
        isDark ? 'bg-[#09090b]/80 border-zinc-800/80' : 'bg-[#f6f4ee]/80 border-stone-200/80'
      }`}>
        <div className="max-w-[1500px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl shadow-sm ${isDark ? 'bg-zinc-800 text-amber-400' : 'bg-stone-900 text-amber-400'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-base uppercase">Sentinel SOC</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-stone-200 text-stone-700'
              }`}>v2.4</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Stream Pill */}
            <button
              onClick={toggleLiveSimStream}
              className={`px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                simStreaming
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                  : isDark
                  ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                  : 'bg-white/80 border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${simStreaming ? 'text-amber-400' : 'text-emerald-500 animate-pulse'}`} />
              <span>{simStreaming ? 'Stream Active' : 'Start Stream'}</span>
            </button>

            {/* Theme Toggle Pill */}
            <button
              onClick={toggleTheme}
              className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                isDark
                  ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-white/80 border-stone-200 text-stone-700 hover:text-stone-900'
              }`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => pollData(true)}
              className={`p-2 rounded-full border transition-all shadow-sm ${
                isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white/80 border-stone-200 text-stone-600 hover:text-stone-900'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Minimal Curved Navigation Pill Tabs */}
        <div className="max-w-[1500px] mx-auto px-6 pb-3 pt-1">
          <div className={`p-1.5 rounded-full flex items-center gap-1 overflow-x-auto text-xs ${
            isDark ? 'bg-zinc-900/60 border border-zinc-800/60' : 'bg-stone-200/50 border border-stone-200/80'
          }`}>
            {[
              { id: 'alerts', label: 'Alert Feed', count: alerts.length },
              { id: 'user_dashboard', label: 'User Process Drilldown' },
              { id: 'upload', label: 'Upload Logs' },
              { id: 'world', label: 'Global Map' },
              { id: 'graph', label: 'Attack Graph' },
              { id: 'history', label: 'Entity History' },
              { id: 'simulator', label: 'Threat Lab' },
              { id: 'metrics', label: 'Model Metrics' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 whitespace-nowrap font-medium ${
                    isActive
                      ? isDark
                        ? 'bg-white text-zinc-950 font-bold shadow-md'
                        : 'bg-stone-900 text-white font-bold shadow-md'
                      : isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-300/40'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? isDark ? 'bg-zinc-200 text-zinc-900' : 'bg-stone-700 text-white'
                        : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-stone-300 text-stone-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Card Container with Rounded 3XL Box Styling */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-6 py-5 flex flex-col">
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className={`lg:col-span-5 h-[calc(100vh-190px)] min-h-[500px] p-5 rounded-3xl border glass-panel transition-all shadow-lg ${
              isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
            }`}>
              <AlertQueue
                alerts={filteredAlerts}
                selectedAlert={selectedAlert}
                onSelectAlert={setSelectedAlert}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                theme={theme}
              />
            </div>
            <div className={`lg:col-span-7 h-[calc(100vh-190px)] min-h-[500px] p-6 rounded-3xl border glass-panel transition-all shadow-lg ${
              isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
            }`}>
              <ExplainabilityPanel alert={selectedAlert} theme={theme} />
            </div>
          </div>
        )}

        {activeTab === 'user_dashboard' && (
          <div className={`min-h-[500px] p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <UserProcessDashboard
              selectedEntityId={selectedAlert?.entity_id}
              entities={entities}
              theme={theme}
            />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] max-w-3xl mx-auto w-full p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <RealLogUploader onLogsUploaded={handleUploadedAlerts} theme={theme} />
          </div>
        )}

        {activeTab === 'world' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <WorldMap alerts={alerts} theme={theme} />
          </div>
        )}

        {activeTab === 'graph' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <AttackGraph theme={theme} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <EntityHistory
              selectedEntityId={selectedAlert?.entity_id}
              entities={entities}
              theme={theme}
            />
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] max-w-3xl mx-auto w-full p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <AttackSimulator onSimulatedAlertAdded={handleSimulatedAlert} theme={theme} />
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className={`h-[calc(100vh-190px)] min-h-[500px] max-w-4xl mx-auto w-full p-6 rounded-3xl border glass-panel shadow-lg ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white/80 border-stone-200/80'
          }`}>
            <ModelMetrics metrics={status} theme={theme} />
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className={`py-3 text-center text-xs opacity-60 font-medium ${
        isDark ? 'text-zinc-500' : 'text-stone-400'
      }`}>
        Sentinel SOC &bull; Autonomous Anomaly Engine
      </footer>
    </div>
  );
}
