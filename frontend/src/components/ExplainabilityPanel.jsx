import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function ExplainabilityPanel({ alert, theme }) {
  const [feedbackSent, setFeedbackSent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isDark = theme === 'black';

  if (!alert) {
    return (
      <div className={`flex flex-col items-center justify-center text-center h-full text-xs font-medium ${
        isDark ? 'text-zinc-500' : 'text-stone-400'
      }`}>
        Select an alert from the queue to view details.
      </div>
    );
  }

  const shapData = (alert.top_shap_features || []).map((f) => ({
    name: f.feature.replace('_enc', '').replace(/_/g, ' '),
    value: parseFloat((f.shap_value || f.abs_shap || 0).toFixed(3))
  }));

  const riskScore = Math.round(alert.risk_score || alert.threat_score * 100);
  const mitre = alert.mitre || { technique_id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access', url: '#' };

  const handleFeedback = async (status) => {
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: alert.event_id,
          entity_id: alert.entity_id,
          predicted_label: alert.predicted_label,
          feedback_status: status,
          analyst_notes: "Verified by SOC Analyst"
        })
      });
      setFeedbackSent(status);
    } catch (e) {
      console.error("Feedback error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 font-sans">
      {/* Header Info Box */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold opacity-80">{alert.event_id}</span>
              <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-stone-200 text-stone-800'
              }`}>
                {alert.predicted_label.replace(/_/g, ' ')}
              </span>
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
              Entity: <span className="font-bold text-zinc-100 dark:text-zinc-100">{alert.entity_id}</span> ({alert.department || alert.entity_type})
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-extrabold font-mono ${riskScore > 80 ? 'text-rose-500' : 'text-amber-500'}`}>
              {riskScore}/100
            </div>
            <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
              Risk Level
            </div>
          </div>
        </div>
      </div>

      {/* MITRE ATT&CK Info Pill Box */}
      <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-medium ${
        isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'
      }`}>
        <div>
          <span className="font-bold">MITRE {mitre.technique_id}:</span> {mitre.name || mitre.technique_name}
        </div>
        <a
          href={mitre.url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] underline font-semibold opacity-70 hover:opacity-100"
        >
          Details &rarr;
        </a>
      </div>

      {/* Executive Summary Box */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider opacity-60">Executive Summary</h3>
        <div className={`p-4 rounded-2xl text-xs leading-relaxed font-sans whitespace-pre-wrap border ${
          isDark ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300' : 'bg-stone-50 border-stone-200/70 text-stone-800'
        }`}>
          {alert.investigation_report || alert.storyline}
        </div>
      </div>

      {/* SHAP Feature Drivers Chart Box */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider opacity-60">Risk Drivers</h3>
        <div className={`h-36 w-full p-3 rounded-2xl border ${
          isDark ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-stone-50 border-stone-200/70'
        }`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={shapData} margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: isDark ? '#a1a1aa' : '#78716c', fontSize: 10 }} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: isDark ? '#f4f4f5' : '#27272a', fontSize: 10 }} width={80} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', fontSize: '11px' }}
              />
              <Bar dataKey="value" fill={isDark ? '#e4e4e7' : '#27272a'} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analyst Verification Box */}
      <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
        isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-100/80 border-stone-200/80'
      }`}>
        <span className="font-semibold opacity-80">Verification:</span>
        {feedbackSent ? (
          <span className="text-emerald-500 font-bold flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Verified ({feedbackSent})
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback('TRUE_POSITIVE')}
              disabled={submitting}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition-all ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-stone-200 border-stone-300 text-stone-800 hover:bg-stone-300'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> True Positive
            </button>
            <button
              onClick={() => handleFeedback('FALSE_POSITIVE')}
              disabled={submitting}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition-all ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-stone-200 border-stone-300 text-stone-800 hover:bg-stone-300'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> False Positive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
