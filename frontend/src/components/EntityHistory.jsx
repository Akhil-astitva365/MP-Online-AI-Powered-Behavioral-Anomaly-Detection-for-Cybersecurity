import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function EntityHistory({ selectedEntityId, entities, theme }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeEntityId, setActiveEntityId] = useState(selectedEntityId || 'user_john_doe');
  const isDark = theme === 'black';

  useEffect(() => {
    if (selectedEntityId) setActiveEntityId(selectedEntityId);
  }, [selectedEntityId]);

  useEffect(() => {
    if (!activeEntityId) return;
    setLoading(true);
    fetch(`/api/entities/${activeEntityId}/history`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => {
        setHistory([
          { timestamp: '08:00', geo_velocity_kmh: 12.4, resource_accessed: '/api/v1/auth', threat_score: 0.02 },
          { timestamp: '10:15', geo_velocity_kmh: 45.0, resource_accessed: '/public/index.html', threat_score: 0.05 },
          { timestamp: '12:30', geo_velocity_kmh: 1240.8, resource_accessed: '/storage/backups/download', threat_score: 0.96 },
          { timestamp: '14:45', geo_velocity_kmh: 88.5, resource_accessed: '/admin/dashboard', threat_score: 0.88 }
        ]);
        setLoading(false);
      });
  }, [activeEntityId]);

  return (
    <div className="flex flex-col h-full font-sans space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Entity Selection</span>
        <select
          value={activeEntityId}
          onChange={(e) => setActiveEntityId(e.target.value)}
          className={`border rounded-full px-4 py-2 text-xs font-semibold focus:outline-none transition-all shadow-sm ${
            isDark ? 'bg-zinc-950/80 border-zinc-800 text-white' : 'bg-stone-100/80 border-stone-200 text-stone-900'
          }`}
        >
          {(entities || []).map((e) => (
            <option key={e.entity_id} value={e.entity_id}>
              {e.entity_id} ({e.primary_vector})
            </option>
          ))}
        </select>
      </div>

      {/* Velocity Dynamics Area Chart Box */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60">Velocity Dynamics (km/h)</h3>
        <div className={`h-40 w-full p-3 rounded-2xl border ${
          isDark ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-stone-50 border-stone-200/70'
        }`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="timestamp" tick={{ fill: isDark ? '#a1a1aa' : '#78716c', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: isDark ? '#a1a1aa' : '#78716c', fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="geo_velocity_kmh" stroke={isDark ? '#f4f4f5' : '#27272a'} fill={isDark ? '#3f3f46' : '#e4e4e7'} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Event List */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60">Event Timeline</h3>
        <div className="space-y-2">
          {history.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between font-mono transition-all ${
                isDark ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300' : 'bg-stone-50 border-stone-200/70 text-stone-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="opacity-50">{item.timestamp?.substring(11, 19) || item.timestamp}</span>
                <span className="font-bold">{item.resource_accessed}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{item.geo_velocity_kmh?.toFixed(1)} km/h</span>
                <span className="font-extrabold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                  Risk: {Math.round((item.risk_score || item.threat_score || 0) * 100 <= 100 ? (item.risk_score || item.threat_score || 0) * 100 : (item.risk_score || item.threat_score || 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
