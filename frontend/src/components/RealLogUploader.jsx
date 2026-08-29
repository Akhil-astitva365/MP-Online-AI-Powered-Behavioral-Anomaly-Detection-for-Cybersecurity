import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Radio, Play, Square } from 'lucide-react';

export default function RealLogUploader({ onLogsUploaded, theme }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [simStreaming, setSimStreaming] = useState(false);
  const [simEventsCount, setSimEventsCount] = useState(0);
  const isDark = theme === 'black';

  const checkSimStatus = async () => {
    try {
      const res = await fetch('/api/simulation/stream/status');
      const data = await res.json();
      setSimStreaming(data.active);
      setSimEventsCount(data.events_generated || 0);
    } catch (e) {}
  };

  useEffect(() => {
    checkSimStatus();
    const interval = setInterval(checkSimStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleLiveSimStream = async () => {
    try {
      const endpoint = simStreaming ? '/api/simulation/stream/stop' : '/api/simulation/stream/start';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setSimStreaming(data.active);
      if (data.active) {
        setUploadStatus({
          type: 'success',
          message: 'Live Threat Telemetry Stream Active (3s interval).'
        });
      }
    } catch (e) {
      console.error("Stream toggle error:", e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/logs/upload', {
        method: 'POST',
        body: formData
      });
      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        data = { success: false, detail: `Server error response (HTTP ${res.status})` };
      }

      if (res.ok && data.success) {
        setUploadStatus({
          type: 'success',
          message: `Processed ${data.processed_count} events from ${file.name}`
        });
        if (onLogsUploaded) {
          onLogsUploaded(data.alerts);
        }
      } else {
        setUploadStatus({ type: 'error', message: data.detail || `Error processing log file` });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: `Upload error: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: File Uploader Card */}
        <div className={`p-8 rounded-3xl border-2 border-dashed text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
          isDark ? 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-600' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
        }`}>
          <input
            type="file"
            accept=".json,.jsonl,.ndjson,.csv"
            onChange={handleFileUpload}
            disabled={uploading}
            id="real-log-file-input"
            className="hidden"
          />
          <label htmlFor="real-log-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-3">
            <div className={`p-3 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-stone-200 text-stone-800'}`}>
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {uploading ? 'Processing Log File...' : 'Upload Log File'}
            </div>
            <p className={`text-[11px] font-medium opacity-60`}>
              Supports JSON, JSONL, NDJSON, and CSV files
            </p>
          </label>
        </div>

        {/* Option 2: Live Stream Simulation Card */}
        <div className={`p-8 rounded-3xl border text-center flex flex-col items-center justify-center space-y-4 transition-all ${
          simStreaming
            ? isDark ? 'bg-amber-950/20 border-amber-800/80' : 'bg-amber-500/10 border-amber-300'
            : isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-stone-50 border-stone-200/80'
        }`}>
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 ${simStreaming ? 'text-amber-500 animate-pulse' : 'text-stone-400'}`} />
            <div className="text-xs font-bold uppercase tracking-wider">
              {simStreaming ? 'Stream Active' : 'Live Telemetry Stream'}
            </div>
          </div>

          <p className={`text-[11px] font-medium opacity-70`}>
            {simStreaming
              ? `Ingesting live telemetry every 3s. Generated ${simEventsCount} events.`
              : 'Streams real-time telemetry directly into the engine via WebSockets.'
            }
          </p>

          <button
            onClick={toggleLiveSimStream}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md ${
              simStreaming
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : isDark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            {simStreaming ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{simStreaming ? 'Pause Stream' : 'Start Live Telemetry'}</span>
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
          uploadStatus.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
        }`}>
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
}
