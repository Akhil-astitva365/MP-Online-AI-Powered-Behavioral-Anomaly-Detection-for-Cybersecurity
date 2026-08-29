import React, { useState, useEffect } from 'react';
import { Database, Server, Monitor, User, ArrowRight } from 'lucide-react';

export default function AttackGraph({ theme }) {
  const [topology, setTopology] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'black';

  useEffect(() => {
    fetch('/api/graph/topology')
      .then(res => res.json())
      .then(data => {
        setTopology(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getNodeIcon = (type) => {
    if (type === 'user') return <User className="w-5 h-5 opacity-70" />;
    if (type === 'machine') return <Monitor className="w-5 h-5 opacity-70" />;
    if (type === 'server') return <Server className="w-5 h-5 opacity-70" />;
    return <Database className="w-5 h-5 opacity-70" />;
  };

  return (
    <div className="flex flex-col h-full font-sans space-y-5">
      <div className="flex-1 flex flex-col justify-center items-center">
        {loading ? (
          <div className="text-xs text-stone-400">Loading topology...</div>
        ) : (
          <div className="w-full max-w-4xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              {(topology.nodes || []).map((node, idx) => (
                <React.Fragment key={node.id}>
                  <div className={`p-5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                    isDark ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-100' : 'bg-stone-100/80 border-stone-200/80 text-stone-900'
                  }`}>
                    <div className="mb-2.5 p-2.5 rounded-full bg-black/5 dark:bg-white/5">{getNodeIcon(node.type)}</div>
                    <div className="text-xs font-bold">{node.label}</div>
                    <div className="text-[10px] font-mono opacity-50 mt-1">{node.id}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Traversal Hops List */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-60">Detected Hops</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {(topology.edges || []).map((edge, i) => (
                  <div key={i} className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isDark ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300' : 'bg-stone-50 border-stone-200/70 text-stone-800'
                  }`}>
                    <span className="opacity-80">{edge.source} &rarr; {edge.target}</span>
                    <span className="font-bold px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{edge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
