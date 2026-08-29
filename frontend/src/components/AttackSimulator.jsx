import React, { useState } from 'react';
import { Play } from 'lucide-react';

export default function AttackSimulator({ onSimulatedAlertAdded, theme }) {
  const [selectedAttack, setSelectedAttack] = useState('impossible_travel');
  const [entityId, setEntityId] = useState('user_john_doe');
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const isDark = theme === 'black';

  const attackTypes = [
    { id: 'impossible_travel', label: 'Impossible Travel (>900 km/h)', mitre: 'T1078' },
    { id: 'brute_force', label: 'Brute Force Authentication', mitre: 'T1110' },
    { id: 'lateral_movement', label: 'Lateral Movement Hop', mitre: 'T1021' },
    { id: 'ransomware_activity', label: 'Ransomware Outbreak', mitre: 'T1486' },
    { id: 'c2_beaconing', label: 'C2 Network Beaconing', mitre: 'T1071' }
  ];

  const handleSimulate = async () => {
    setSimulating(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entityId,
          attack_type: selectedAttack
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data.simulated_alert);
        if (onSimulatedAlertAdded) {
          onSimulatedAlertAdded(data.simulated_alert);
        }
      }
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-sans space-y-5">
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 opacity-70">Target Entity</label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className={`w-full rounded-full border px-4 py-2.5 text-xs font-mono font-semibold focus:outline-none transition-all shadow-sm ${
              isDark ? 'bg-zinc-950/80 border-zinc-800 text-white focus:border-zinc-700' : 'bg-stone-100/80 border-stone-200 text-stone-900 focus:border-stone-300'
            }`}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-70">Attack Vector</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {attackTypes.map((atk) => {
              const isSelected = selectedAttack === atk.id;
              return (
                <button
                  key={atk.id}
                  onClick={() => setSelectedAttack(atk.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all text-xs font-semibold flex items-center justify-between shadow-sm ${
                    isSelected
                      ? isDark ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold scale-[1.01]' : 'bg-stone-900 border-stone-900 text-white font-bold scale-[1.01]'
                      : isDark ? 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/40' : 'bg-stone-100/50 border-stone-200 text-stone-800 hover:bg-stone-200/50'
                  }`}
                >
                  <span>{atk.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{atk.mitre}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={simulating}
          className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
            isDark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          {simulating ? 'Simulating...' : 'Execute Attack Simulation'}
        </button>

        {lastResult && (
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed font-sans whitespace-pre-wrap ${
            isDark ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300' : 'bg-stone-50 border-stone-200/80 text-stone-800'
          }`}>
            {lastResult.investigation_report}
          </div>
        )}
      </div>
    </div>
  );
}
