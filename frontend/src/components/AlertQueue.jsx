import React from 'react';
import { Search, Filter } from 'lucide-react';

export default function AlertQueue({ alerts, selectedAlert, onSelectAlert, activeFilter, onFilterChange, searchTerm, onSearchChange, theme }) {
  const vectors = ['ALL', 'impossible_travel', 'brute_force', 'lateral_movement', 'device_spoofing', 'ransomware_activity', 'c2_beaconing'];
  const isDark = theme === 'black';

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Top Search & Filter Bar */}
      <div className="space-y-3 mb-4 flex-shrink-0">
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-4 top-3 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
          <input
            type="text"
            placeholder="Search entity, event ID, or location..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full rounded-full pl-10 pr-4 py-2.5 text-xs border focus:outline-none transition-all shadow-sm ${
              isDark
                ? 'bg-zinc-950/80 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-700'
                : 'bg-stone-100/80 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-stone-300'
            }`}
          />
        </div>

        {/* Minimal Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <Filter className={`w-3.5 h-3.5 mr-1 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
          {vectors.map((vec) => (
            <button
              key={vec}
              onClick={() => onFilterChange(vec)}
              className={`px-3 py-1 rounded-full text-xs transition-all flex-shrink-0 font-medium ${
                activeFilter === vec
                  ? isDark
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'bg-stone-900 text-white font-bold shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800'
                    : 'text-stone-600 hover:text-stone-900 bg-stone-200/50 hover:bg-stone-200'
              }`}
            >
              {vec === 'ALL' ? 'All Alerts' : vec.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Curvy Alert List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className={`text-center py-20 text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
            No security events matching criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const isSelected = selectedAlert?.event_id === alert.event_id;
              const riskScore = Math.round(alert.risk_score || alert.threat_score * 100);
              const mitre = alert.mitre || { technique_id: 'T1078' };

              return (
                <div
                  key={alert.event_id}
                  onClick={() => onSelectAlert(alert)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                    isSelected
                      ? isDark
                        ? 'bg-zinc-800/90 border-zinc-700 text-white shadow-md scale-[1.01]'
                        : 'bg-stone-100 border-stone-300 text-stone-900 shadow-md scale-[1.01]'
                      : isDark
                        ? 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-800/40 text-zinc-300'
                        : 'bg-white/60 border-stone-200/70 hover:bg-stone-100/70 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold opacity-60">{alert.event_id}</span>
                      <span className="font-bold text-xs">{alert.entity_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {mitre.technique_id}
                      </span>
                      <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-[10px] ${
                        riskScore > 80
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {riskScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs opacity-70">
                    <span className="truncate">{alert.location}</span>
                    <span className="font-mono text-[11px] truncate max-w-[180px]">{alert.resource_accessed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
