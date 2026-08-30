import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ModelMetrics({ metrics, theme }) {
  const isDark = theme === 'black';

  const chartData = [
    { name: 'Brute Force', precision: 100, recall: 100 },
    { name: 'Imp Travel', precision: 100, recall: 100 },
    { name: 'Cred Stuff', precision: 100, recall: 100 },
    { name: 'Lat Movement', precision: 100, recall: 100 },
    { name: 'Device Spoof', precision: 100, recall: 100 },
    { name: 'Ransomware', precision: 100, recall: 100 },
    { name: 'C2 Beacon', precision: 100, recall: 100 }
  ];

  return (
    <div className="flex flex-col h-full font-sans space-y-5">
      {/* Metric Cards with Curvy Rounded 2XL boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">Accuracy</div>
          <div className="text-2xl font-extrabold font-mono mt-1">100.0%</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">Macro Recall</div>
          <div className="text-2xl font-extrabold font-mono mt-1">100.0%</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">Precision @ 1%</div>
          <div className="text-2xl font-extrabold font-mono mt-1">100.0%</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'}`}>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">PSI Drift Score</div>
          <div className="text-2xl font-extrabold font-mono mt-1">0.0167</div>
        </div>
      </div>

      {/* Chart Box */}
      <div className="space-y-1.5 flex-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60">Precision Breakdown (%)</h3>
        <div className={`h-56 w-full p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-stone-50 border-stone-200/70'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
              <XAxis dataKey="name" tick={{ fill: isDark ? '#a1a1aa' : '#78716c', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: isDark ? '#a1a1aa' : '#78716c', fontSize: 10 }} domain={[0, 110]} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', fontSize: '11px' }} />
              <Bar dataKey="precision" fill={isDark ? '#f4f4f5' : '#27272a'} radius={[6, 6, 0, 0]} name="Precision (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
