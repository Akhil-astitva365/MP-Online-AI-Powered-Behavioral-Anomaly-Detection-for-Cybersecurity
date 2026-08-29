import React from 'react';
import { MapPin } from 'lucide-react';

export default function WorldMap({ alerts, theme }) {
  const travelAlerts = (alerts || []).filter(a => a.geo_velocity_kmh > 400);
  const isDark = theme === 'black';

  const locs = [
    { name: 'San Francisco, US', lat: 37.77, lon: -122.41, count: 420 },
    { name: 'New York, US', lat: 40.71, lon: -74.00, count: 310 },
    { name: 'London, GB', lat: 51.50, lon: -0.12, count: 280 },
    { name: 'Tokyo, JP', lat: 35.67, lon: 139.65, count: 85 },
    { name: 'Frankfurt, DE', lat: 50.11, lon: 8.68, count: 95 }
  ];

  return (
    <div className="flex flex-col h-full font-sans space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {locs.map((loc) => (
          <div key={loc.name} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'
          }`}>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 opacity-60" />
              <div>
                <div className="text-xs font-bold">{loc.name}</div>
                <div className="text-[10px] font-mono opacity-50">{loc.lat}, {loc.lon}</div>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
              {loc.count} Evts
            </span>
          </div>
        ))}
      </div>

      {/* Travel Anomaly Stream */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60">Spatial Velocity Anomalies (&gt;900 km/h)</h3>
        <div className="space-y-2">
          {travelAlerts.slice(0, 5).map((a, idx) => (
            <div key={idx} className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-mono transition-all ${
              isDark ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300' : 'bg-stone-50 border-stone-200/70 text-stone-800'
            }`}>
              <div className="flex items-center gap-3">
                <span className="font-bold">{a.event_id}</span>
                <span className="font-bold">{a.entity_id}</span>
                <span className="opacity-60 text-[11px]">{a.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{a.geo_velocity_kmh.toFixed(1)} km/h</span>
                <span className="font-bold text-rose-500">Risk {Math.round(a.risk_score || a.threat_score * 100)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
