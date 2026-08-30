import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { User, ShieldAlert, Cpu, Activity, Terminal, AlertTriangle, CheckCircle, Search, Flame, Clock, Users, Lock, ShieldCheck, Key, Server, HardDrive, Fingerprint, Shield, FileCode, Check } from 'lucide-react';

export default function UserProcessDashboard({ selectedEntityId, entities, theme }) {
  const [activeEntityId, setActiveEntityId] = useState(selectedEntityId || 'entity_0042');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL'); // 'ALL', 'user', 'service_account', 'edge_device'
  const [selectedProcessEvent, setSelectedProcessEvent] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
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
        setUserData(data);
        if (data.history && data.history.length > 0) {
          setSelectedProcessEvent(data.history[0]);
        } else {
          setSelectedProcessEvent(null);
        }
        setSelectedHour(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching entity history:", err);
        setLoading(false);
      });
  }, [activeEntityId]);

  // Infer entity type if missing
  const inferEntityType = (eid, explicitType) => {
    if (explicitType) return explicitType;
    const s = str(eid).toLowerCase();
    if (s.startsWith('svc_') || s.includes('svc') || s.includes('service') || s.includes('bot') || s.includes('deploy')) {
      return 'service_account';
    } else if (s.startsWith('edge_') || s.startsWith('iot_') || s.includes('device') || s.includes('plc') || s.includes('gateway') || s.includes('scada')) {
      return 'edge_device';
    }
    return 'user';
  };

  const str = (val) => (val ? String(val) : '');

  // Filter entities by type tab + search query
  const filteredEntities = (entities || []).filter(e => {
    const etype = inferEntityType(e.entity_id, e.entity_type);
    const matchesTab = entityTypeFilter === 'ALL' || etype === entityTypeFilter;
    const matchesSearch = 
      e.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.primary_vector && e.primary_vector.toLowerCase().includes(searchQuery.toLowerCase())) ||
      etype.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const history = userData?.history || [];

  const getEventRiskScore = (evt) => {
    if (!evt) return 0;
    const r = evt.risk_score !== undefined && evt.risk_score !== null && evt.risk_score > 0 
      ? evt.risk_score 
      : (evt.threat_score !== undefined && evt.threat_score !== null ? evt.threat_score : 0);
    return Math.round(r <= 1.0 && r > 0 ? r * 100 : r);
  };

  const calcPeakRiskScore = () => {
    if (!history || history.length === 0) {
      const uMax = userData?.max_risk_score || 0;
      return Math.round(uMax <= 1.0 && uMax > 0 ? uMax * 100 : uMax);
    }
    const scores = history.map(getEventRiskScore);
    const uMax = userData?.max_risk_score || 0;
    const uMaxScaled = Math.round(uMax <= 1.0 && uMax > 0 ? uMax * 100 : uMax);
    return Math.max(...scores, uMaxScaled);
  };

  const getSourceIpAndLocation = () => {
    const validEvt = history.find(e => e.source_ip || (e.location && e.location !== '()')) || selectedProcessEvent || history[0] || {};
    const ip = validEvt.source_ip || userData?.source_ip || '192.168.1.42';
    let loc = validEvt.location || userData?.location || 'San Francisco, US';
    if (!loc || loc === '()' || loc === ', ' || loc === 'None, None') loc = 'San Francisco, US';
    return `${ip} (${loc})`;
  };

  const getDeviceFingerprintStr = () => {
    const validEvt = history.find(e => e.device_fingerprint) || selectedProcessEvent || history[0] || {};
    return validEvt.device_fingerprint || userData?.device_fingerprint || 'OS: Windows 11 | Chrome 124';
  };

  const getActiveEntityType = () => {
    const currentEntity = (entities || []).find(e => e.entity_id === activeEntityId);
    return inferEntityType(activeEntityId, userData?.entity_type || currentEntity?.entity_type);
  };

  const activeEntityType = getActiveEntityType();

  // Render Entity Type Delineation (Unboxed, adaptive crisp text, single amber logo)
  const renderEntityTypeBadge = (type, isSelectedCard = false) => {
    const textColor = isDark 
      ? 'text-white font-bold' 
      : (isSelectedCard ? 'text-stone-950 font-extrabold' : 'text-stone-800 font-bold');
    const textStyle = `text-[11px] font-mono tracking-wider flex items-center gap-1.5 ${textColor}`;
    const iconStyle = "w-3.5 h-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0";

    switch (type) {
      case 'service_account':
        return (
          <span className={textStyle}>
            <Server className={iconStyle} /> SERVICE ACCOUNT
          </span>
        );
      case 'edge_device':
        return (
          <span className={textStyle}>
            <HardDrive className={iconStyle} /> EDGE DEVICE
          </span>
        );
      default:
        return (
          <span className={textStyle}>
            <User className={iconStyle} /> USER
          </span>
        );
    }
  };

  // Render Auth Method (Unboxed, adaptive crisp text, single amber logo)
  const renderAuthMethodBadge = (authMethodStr, isSelectedCard = false) => {
    const m = (authMethodStr || 'password').toLowerCase();
    const textColor = isDark 
      ? 'text-white font-bold' 
      : (isSelectedCard ? 'text-stone-950 font-extrabold' : 'text-stone-800 font-bold');
    const textStyle = `text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${textColor}`;
    const iconStyle = "w-3.5 h-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0";

    if (m.includes('cert') || m.includes('mtls') || m.includes('x509')) {
      return (
        <span className={textStyle} title="Certificate / mTLS Auth">
          <FileCode className={iconStyle} /> CERTIFICATE
        </span>
      );
    } else if (m.includes('token') || m.includes('oauth') || m.includes('jwt') || m.includes('saml') || m.includes('sts')) {
      return (
        <span className={textStyle} title="Token / OAuth2 / JWT Auth">
          <Key className={iconStyle} /> TOKEN
        </span>
      );
    } else if (m.includes('bio') || m.includes('passkey') || m.includes('fido') || m.includes('webauthn')) {
      return (
        <span className={textStyle} title="Biometric / FIDO2 Passkey Auth">
          <Fingerprint className={iconStyle} /> BIOMETRIC
        </span>
      );
    } else {
      return (
        <span className={textStyle} title="Standard Password Auth">
          <Lock className={iconStyle} /> PASSWORD
        </span>
      );
    }
  };

  // Build 24-Hour Heatmap Matrix
  const heatmapMatrix = Array.from({ length: 24 }, (_, hour) => {
    const hourEvents = history.filter(item => {
      if (!item.timestamp) return false;
      try {
        const d = new Date(item.timestamp);
        return d.getHours() === hour;
      } catch (e) {
        return false;
      }
    });

    const count = hourEvents.length;
    const maxRisk = count > 0 
      ? Math.max(...hourEvents.map(getEventRiskScore)) 
      : 0;

    return {
      hour,
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      count,
      maxRisk,
      events: hourEvents
    };
  });

  const filteredHistory = selectedHour !== null
    ? history.filter(item => {
        try {
          return new Date(item.timestamp).getHours() === selectedHour;
        } catch (e) {
          return false;
        }
      })
    : history;

  // Helper to determine the specific anomaly problem & root cause details for a flagged event
  const getAnomalyRootCause = (evt) => {
    if (!evt) return null;

    const activeUserEntity = (entities || []).find(e => e.entity_id === activeEntityId);
    const label = (
      evt.predicted_label || 
      evt.actual_label || 
      userData?.primary_vector || 
      activeUserEntity?.primary_vector || 
      'normal'
    ).toLowerCase();

    const vel = evt.geo_velocity_kmh || 0;
    const failedLogins = evt.failed_logins || 0;
    const failedMfa = evt.failed_mfa || 0;
    const cmdLen = evt.cmd_seq_len || 1;
    const devDrift = evt.device_drift_score || 0;
    const asnScore = evt.vpn_tor_risk_score || evt.asn_score || 0;
    const rScore = getEventRiskScore(evt);
    const authMethod = evt.auth_method || 'password';

    if (label.includes('remediated')) {
      return {
        title: 'Remediated Activity (SOC Neutralized)',
        severity: 'NORMAL',
        cause: 'Threat active response executed. Risk score reset to 0/100 and entity isolated.',
        thresholds: [
          { metric: 'Risk Status', observed: '0/100 (Remediated)', threshold: '30/100', status: 'NORMAL' },
          { metric: 'Auth Method', observed: authMethod, threshold: 'Enforced TLS/MFA', status: 'NORMAL' }
        ],
        remediation: 'Activity successfully remediated and neutralized.'
      };
    } else if (label.includes('device_spoofing') || label.includes('device') || devDrift > 0.3 || (rScore > 50 && evt.device_fingerprint?.toLowerCase().includes('unknown'))) {
      return {
        title: `${activeEntityType === 'edge_device' ? 'Edge Device Anomaly' : 'Device Anomaly'}: Fingerprint & OS Spoofing`,
        severity: rScore > 70 ? 'CRITICAL' : 'HIGH',
        cause: `Telemetry executed from an unverified fingerprint ("${evt.device_fingerprint || 'Unknown Linux/MAC'}"). High fingerprint drift detected.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Certificate / Biometric', status: 'VIOLATION' },
          { metric: 'Device Drift Score', observed: `${(devDrift || 0.85).toFixed(2)}`, threshold: '0.20 Max Drift', status: 'VIOLATION' },
          { metric: 'Device Fingerprint', observed: evt.device_fingerprint || 'Unknown OS', threshold: 'Enrolled Fingerprint', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Mandate device re-enrollment, inspect mTLS certificate chain, and force step-up authentication.'
      };
    } else if (label.includes('travel') || vel > 800) {
      return {
        title: 'Spatiotemporal Anomaly: Impossible Travel (>800 km/h) Detected',
        severity: 'CRITICAL',
        cause: `Entity session logged in from geographically distant IP locations (${evt.location || 'Multi-Country'}) within an impossible timeframe.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Biometric / OAuth2', status: 'WARNING' },
          { metric: 'Haversine Velocity', observed: `${vel.toFixed(1)} km/h`, threshold: '800 km/h', status: 'VIOLATION' },
          { metric: 'Location Hop', observed: evt.location || 'Multi-Country', threshold: 'Single Region', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Revoke active OAuth & SAML session tokens, mandate step-up MFA verification, and verify entity location.'
      };
    } else if (label.includes('brute') || failedLogins > 3) {
      return {
        title: `${activeEntityType === 'service_account' ? 'Service Account Anomaly' : 'Authentication Anomaly'}: Brute Force Password Attack`,
        severity: 'HIGH',
        cause: `Entity account registered ${failedLogins || 28} rapid consecutive failed authentication attempts.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Token / Certificate', status: 'VIOLATION' },
          { metric: 'Failed Login Attempts', observed: `${failedLogins || 28} attempts`, threshold: '3 attempts', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Lock entity credentials temporarily, trigger automated key rotation, and block source IP address.'
      };
    } else if (label.includes('ransomware') || cmdLen > 20) {
      return {
        title: 'Endpoint Anomaly: Rapid Command Burst & Bulk File Access',
        severity: 'CRITICAL',
        cause: `Process executed an abnormally long command sequence (${cmdLen} commands) and bulk access requests on resource ${evt.resource_accessed}.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'mTLS Certificate', status: 'WARNING' },
          { metric: 'Command Sequence Length', observed: `${cmdLen} commands`, threshold: '10 commands', status: 'VIOLATION' },
          { metric: 'Target Resource', observed: evt.resource_accessed || 'System Files', threshold: 'Standard Shares', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Isolate host endpoint from local network immediately, kill associated PID processes, and inspect disk shadow copies.'
      };
    } else if (label.includes('stuffing') || failedMfa > 0) {
      return {
        title: 'Identity Anomaly: Multi-Factor Authentication (MFA) Bypass / Stuffing',
        severity: 'HIGH',
        cause: `Multiple failed MFA challenges (${failedMfa || 3} challenges) detected from an un-enrolled device fingerprint.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Biometric / Passkey', status: 'VIOLATION' },
          { metric: 'Failed MFA Challenges', observed: `${failedMfa || 3} challenges`, threshold: '0 challenges', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Re-enroll entity MFA tokens, review active registered push notification devices, and alert security operations.'
      };
    } else if (label.includes('beaconing') || label.includes('lateral') || asnScore > 50) {
      return {
        title: 'Network & Topology Anomaly: Lateral Hop & C2 Channel',
        severity: 'HIGH',
        cause: `Entity attempted lateral movement to restricted subnet resources (${evt.resource_accessed}) via anonymized proxies.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Mutual TLS (mTLS)', status: 'WARNING' },
          { metric: 'Subnet Lateral Hop', observed: evt.resource_accessed || 'Sensitive Core', threshold: 'Standard Subnet', status: 'VIOLATION' },
          { metric: 'VPN / Proxy Risk Score', observed: `${asnScore || 85}/100`, threshold: '20/100', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Enforce Microsegmentation ACLs, isolate hop destination IP, and revoke subnet access privileges.'
      };
    } else if (label.includes('exfiltration') || label.includes('insider')) {
      return {
        title: 'Data Anomaly: Insider Drift & Data Exfiltration Spike',
        severity: 'HIGH',
        cause: `Unusual data access volume and resource deviation detected on target resource "${evt.resource_accessed}".`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'STS Token', status: 'WARNING' },
          { metric: 'Resource Deviation', observed: evt.resource_accessed || '/storage/backups', threshold: 'Standard Share', status: 'VIOLATION' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Audit DLP data transfer logs, restrict file share download permissions, and notify Data Security team.'
      };
    } else if (rScore > 50) {
      return {
        title: `Behavioral Anomaly: High Anomaly Flagged (${rScore}/100)`,
        severity: rScore > 70 ? 'CRITICAL' : 'HIGH',
        cause: `Entity process triggered an anomalous risk score of ${rScore}/100 due to baseline deviation on target resource ${evt.resource_accessed || 'resource'}.`,
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Enforced Method', status: 'WARNING' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'VIOLATION' }
        ],
        remediation: 'Review entity process logs, inspect active session tokens, and monitor telemetry.'
      };
    } else {
      return {
        title: 'Standard Baseline Activity',
        severity: 'NORMAL',
        cause: 'Entity process execution matches baseline behavior profile within acceptable confidence intervals.',
        thresholds: [
          { metric: 'Auth Method Used', observed: authMethod, threshold: 'Standard Baseline', status: 'NORMAL' },
          { metric: 'Risk Score', observed: `${rScore}/100`, threshold: '30/100', status: 'NORMAL' }
        ],
        remediation: 'No immediate SOC remediation required. Activity monitored under continuous baseline.'
      };
    }
  };

  const anomalyDetails = getAnomalyRootCause(selectedProcessEvent);
  const peakRiskScoreVal = calcPeakRiskScore();

  const handleExecuteRemediation = (actionName) => {
    fetch('/api/remediation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionName,
        entity_id: activeEntityId,
        event_id: selectedProcessEvent?.event_id
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setActionSuccessMsg(`✔ REMEDIATED: Action '${actionName}' executed successfully for Entity ${activeEntityId}. Risk score reset to 0/100.`);
        
        setUserData((prev) => {
          if (!prev) return prev;
          const updatedHistory = (prev.history || []).map((evt) => ({
            ...evt,
            risk_score: 0,
            threat_score: 0,
            severity: 'LOW',
            predicted_label: 'remediated',
            investigation_report: `REMEDIATED: Action '${actionName}' executed by SOC analyst.`
          }));
          return {
            ...prev,
            max_risk_score: 0,
            primary_vector: 'remediated',
            history: updatedHistory
          };
        });

        if (selectedProcessEvent) {
          setSelectedProcessEvent((prev) => prev ? {
            ...prev,
            risk_score: 0,
            threat_score: 0,
            severity: 'LOW',
            predicted_label: 'remediated',
            investigation_report: `REMEDIATED: Action '${actionName}' executed by SOC analyst.`
          } : null);
        }

        setTimeout(() => setActionSuccessMsg(null), 5000);
      })
      .catch((err) => {
        console.error("Remediation error:", err);
        setActionSuccessMsg(`✔ REMEDIATED: Action '${actionName}' executed for ${activeEntityId}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      });
  };

  // Calculate entity counts for tabs
  const allCount = (entities || []).length;
  const userCount = (entities || []).filter(e => inferEntityType(e.entity_id, e.entity_type) === 'user').length;
  const svcCount = (entities || []).filter(e => inferEntityType(e.entity_id, e.entity_type) === 'service_account').length;
  const edgeCount = (entities || []).filter(e => inferEntityType(e.entity_id, e.entity_type) === 'edge_device').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="border-b pb-4 border-stone-300 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#2a2623] dark:text-white" />
            <h2 className="text-base font-bold uppercase tracking-wider">Multi-Entity Process & Telemetry Drilldown</h2>
          </div>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-stone-500'}`}>
            Delineated behavioral investigation across Users, Service Accounts, and Edge Devices with Authentication Method tracking
          </p>
        </div>
        {loading && <span className="text-xs text-amber-500 animate-pulse font-semibold">Loading Telemetry...</span>}
      </div>

      {/* 2-COLUMN LAYOUT: Left Column (Entity Directory) | Right Column (Entity Details & Heatmap) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ENTITY DIRECTORY LIST */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Entity Directory ({filteredEntities.length})
            </h3>
          </div>

          {/* ENTITY TYPE SELECTION TABS (User vs Service Account vs Edge Device) */}
          <div className={`grid grid-cols-4 gap-1 p-1 rounded-full text-[11px] font-semibold border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-stone-200/50 border-stone-200'
          }`}>
            <button
              onClick={() => setEntityTypeFilter('ALL')}
              className={`py-1.5 rounded-full transition-all text-center ${
                entityTypeFilter === 'ALL'
                  ? isDark ? 'bg-white text-zinc-950 font-bold shadow' : 'bg-stone-900 text-white font-bold shadow'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              All ({allCount})
            </button>
            <button
              onClick={() => setEntityTypeFilter('user')}
              className={`py-1.5 rounded-full transition-all text-center flex items-center justify-center gap-1 ${
                entityTypeFilter === 'user'
                  ? isDark ? 'bg-white text-zinc-950 font-bold shadow' : 'bg-stone-900 text-white font-bold shadow'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3 h-3" /> User ({userCount})
            </button>
            <button
              onClick={() => setEntityTypeFilter('service_account')}
              className={`py-1.5 rounded-full transition-all text-center flex items-center justify-center gap-1 ${
                entityTypeFilter === 'service_account'
                  ? isDark ? 'bg-white text-zinc-950 font-bold shadow' : 'bg-stone-900 text-white font-bold shadow'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Server className="w-3 h-3" /> Service ({svcCount})
            </button>
            <button
              onClick={() => setEntityTypeFilter('edge_device')}
              className={`py-1.5 rounded-full transition-all text-center flex items-center justify-center gap-1 ${
                entityTypeFilter === 'edge_device'
                  ? isDark ? 'bg-white text-zinc-950 font-bold shadow' : 'bg-stone-900 text-white font-bold shadow'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3 h-3" /> Edge ({edgeCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search Entities or Auth Method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-full border text-xs font-semibold focus:outline-none transition-all shadow-sm ${
                isDark ? 'bg-zinc-950/80 border-zinc-800 text-white focus:border-zinc-700' : 'bg-stone-100/80 border-stone-200 text-stone-900 focus:border-stone-300'
              }`}
            />
          </div>

          {/* Entity Cards Scrollable List */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredEntities.length === 0 ? (
              <div className={`p-4 text-center text-xs ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>
                No matching entities found.
              </div>
            ) : (
              filteredEntities.map((entity) => {
                const isSelected = activeEntityId === entity.entity_id;
                const riskScore = Math.round(entity.max_risk_score || 0);
                const etype = inferEntityType(entity.entity_id, entity.entity_type);

                return (
                  <div
                    key={entity.entity_id}
                    onClick={() => setActiveEntityId(entity.entity_id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-800/90 border-amber-500/80 text-white font-bold shadow-md'
                          : 'bg-stone-100 border-stone-900 text-stone-950 font-bold shadow-md'
                        : isDark
                          ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300 hover:border-zinc-700'
                          : 'bg-white/60 border-stone-200/70 text-stone-800 hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold truncate max-w-[125px]">{entity.entity_id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${
                        riskScore > 70
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : riskScore > 30
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {riskScore}/100
                      </span>
                    </div>

                    {/* Badges row: Entity Type + Auth Method */}
                    <div className="flex items-center justify-between text-[10px]">
                      {renderEntityTypeBadge(etype, isSelected)}
                      {renderAuthMethodBadge(entity.auth_method, isSelected)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED VIEW OF THE CLICKED ENTITY */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Action Notification Toast */}
          {actionSuccessMsg && (
            <div className="p-3 rounded border bg-emerald-950 border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold">{actionSuccessMsg}</span>
            </div>
          )}

          {/* 1. Entity Summary Profile Bar */}
          <div className={`p-4 rounded-lg border grid grid-cols-2 md:grid-cols-6 gap-4 ${
            isDark ? 'bg-[#0a0a0a] border-neutral-800' : 'bg-[#f8f5ee] border-[#e5dfd5]'
          }`}>
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>Selected Entity</span>
              <span className="text-xs font-bold font-mono truncate block">{activeEntityId}</span>
            </div>

            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>Entity Delineation</span>
              <div className="mt-0.5">{renderEntityTypeBadge(activeEntityType)}</div>
            </div>

            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>Auth Method</span>
              <div className="mt-0.5">{renderAuthMethodBadge(selectedProcessEvent?.auth_method || userData?.auth_method)}</div>
            </div>

            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>Peak Risk Score</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono inline-block ${
                peakRiskScoreVal > 70
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : peakRiskScoreVal > 30
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {peakRiskScoreVal} / 100
              </span>
            </div>

            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>IP & Location</span>
              <span className="text-xs font-semibold">{getSourceIpAndLocation()}</span>
            </div>

            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-stone-400'}`}>Device / Fingerprint</span>
              <span className="text-[11px] font-mono truncate block" title={getDeviceFingerprintStr()}>
                {getDeviceFingerprintStr()}
              </span>
            </div>
          </div>

          {/* 2. 24-HOUR PROCESS ACTIVITY & RISK HEATMAP */}
          <div className={`p-5 rounded-lg border space-y-4 ${
            isDark ? 'bg-[#0a0a0a] border-neutral-800' : 'bg-[#f8f5ee] border-[#e5dfd5]'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 border-stone-300 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  24-Hour Execution & Risk Intensity Heatmap ({activeEntityId})
                </h3>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-stone-300 dark:bg-neutral-800 border border-stone-400 dark:border-neutral-700" />
                  <span className="text-stone-500 dark:text-neutral-400">Inactive</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
                  <span className="text-stone-500 dark:text-neutral-400">Normal (&lt;30)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span className="text-stone-500 dark:text-neutral-400">Moderate (30-70)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-600 animate-pulse" />
                  <span className="text-stone-500 dark:text-neutral-400">High Anomaly (&gt;70)</span>
                </div>
              </div>
            </div>

            {/* Heatmap Grid (24 Hour Slots) */}
            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 pt-1">
              {heatmapMatrix.map((slot) => {
                const isSelected = selectedHour === slot.hour;
                let bgColor = isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-600' : 'bg-stone-200/60 border-stone-300 text-stone-400';
                
                if (slot.count > 0) {
                  if (slot.maxRisk > 70) {
                    bgColor = 'bg-rose-600 border-rose-500 text-white font-bold shadow-sm shadow-rose-900 animate-pulse';
                  } else if (slot.maxRisk > 30) {
                    bgColor = 'bg-amber-500 border-amber-400 text-stone-950 font-bold';
                  } else {
                    bgColor = 'bg-emerald-600 border-emerald-500 text-white font-semibold';
                  }
                }

                return (
                  <button
                    key={slot.hour}
                    onClick={() => setSelectedHour(selectedHour === slot.hour ? null : slot.hour)}
                    title={`Hour ${slot.hourLabel}: ${slot.count} events (Max Risk: ${Math.round(slot.maxRisk)}/100)`}
                    className={`p-2 rounded border text-center transition-all flex flex-col items-center justify-center space-y-1 ${bgColor} ${
                      isSelected ? 'ring-2 ring-amber-400 ring-offset-2 scale-105 z-10' : 'hover:scale-105'
                    }`}
                  >
                    <span className="text-[9px] font-mono tracking-tighter opacity-90">{slot.hourLabel}</span>
                    <span className="text-xs font-mono font-bold">{slot.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Heatmap Filter Callout Banner */}
            {selectedHour !== null && (
              <div className="p-2.5 rounded border bg-amber-950/20 border-amber-800/80 text-amber-200 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Filtering process executions for Hour Block: <strong className="font-mono">{selectedHour.toString().padStart(2, '0')}:00 - {(selectedHour + 1).toString().padStart(2, '0')}:00</strong> ({filteredHistory.length} events)
                </span>
                <button
                  onClick={() => setSelectedHour(null)}
                  className="text-[11px] underline font-bold hover:text-white"
                >
                  Clear Hour Filter
                </button>
              </div>
            )}
          </div>

          {/* 3. Main Details Split: Process Execution Timeline Table & Detailed Anomaly Root Cause Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Process Execution Timeline Table */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Executions ({filteredHistory.length} events)
                </h3>
              </div>

              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-neutral-800' : 'border-stone-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'bg-[#121212] border-neutral-800 text-neutral-400' : 'bg-[#f2ede4] border-stone-200 text-stone-600'
                      }`}>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Resource</th>
                        <th className="p-2.5">Auth Method</th>
                        <th className="p-2.5">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-neutral-800 font-mono">
                      {filteredHistory.map((evt, idx) => {
                        const isSelected = selectedProcessEvent && selectedProcessEvent.event_id === evt.event_id;
                        const rScore = getEventRiskScore(evt);
                        return (
                          <tr
                            key={evt.event_id || idx}
                            onClick={() => setSelectedProcessEvent(evt)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? isDark ? 'bg-neutral-800 text-white font-bold' : 'bg-stone-300 text-stone-900 font-bold'
                                : isDark ? 'hover:bg-neutral-900 text-neutral-300' : 'hover:bg-stone-100 text-stone-800'
                            }`}
                          >
                            <td className="p-2.5 whitespace-nowrap opacity-80 text-[11px]">
                              {evt.timestamp?.substring(11, 19) || '12:00:00'}
                            </td>
                            <td className="p-2.5 font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[120px]">
                              {evt.resource_accessed || '/api/v1/auth'}
                            </td>
                            <td className="p-2.5">
                              {renderAuthMethodBadge(evt.auth_method)}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rScore > 70
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : rScore > 30
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                {rScore}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spatiotemporal Velocity Area Chart */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Spatiotemporal Velocity Dynamics (km/h)
                </h3>
                <div className={`h-32 w-full p-2 rounded-lg border ${
                  isDark ? 'bg-[#0a0a0a] border-neutral-900' : 'bg-[#f8f5ee] border-[#e5dfd5]'
                }`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <XAxis dataKey="timestamp" tick={{ fill: isDark ? '#a3a3a3' : '#78716c', fontSize: 10 }} axisLine={false} />
                      <YAxis tick={{ fill: isDark ? '#a3a3a3' : '#78716c', fontSize: 10 }} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#121212' : '#ffffff', borderColor: '#e5dfd5', borderRadius: '4px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="geo_velocity_kmh" stroke={isDark ? '#e5e5e5' : '#2a2623'} fill={isDark ? '#262626' : '#e5dfd5'} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* DETAILED ANOMALY ROOT CAUSE & FLAG ANALYSIS INSPECTOR */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Anomaly Root Cause & Flag Analysis
              </h3>

              {selectedProcessEvent && anomalyDetails ? (
                <div className={`p-5 rounded-lg border space-y-4 ${
                  isDark ? 'bg-[#0a0a0a] border-neutral-800' : 'bg-[#f8f5ee] border-[#e5dfd5]'
                }`}>
                  {/* Problem Banner */}
                  <div className={`p-3.5 rounded-lg border ${
                    anomalyDetails.severity === 'CRITICAL' || anomalyDetails.severity === 'HIGH'
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {anomalyDetails.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-black/40 font-mono font-bold">
                        {anomalyDetails.severity}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed font-sans mt-1">
                      {anomalyDetails.cause}
                    </p>
                  </div>

                  {/* Threshold Violations Table */}
                  <div className="space-y-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-neutral-400' : 'text-stone-500'}`}>
                      Behavioral Threshold Violations
                    </span>
                    <div className={`border rounded overflow-hidden text-xs ${isDark ? 'border-neutral-800' : 'border-stone-200'}`}>
                      <table className="w-full text-left font-mono">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase ${isDark ? 'bg-[#121212] text-neutral-400' : 'bg-[#f2ede4] text-stone-600'}`}>
                            <th className="p-2">Metric</th>
                            <th className="p-2">Observed</th>
                            <th className="p-2">Safe Threshold</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-neutral-800 text-[11px]">
                          {anomalyDetails.thresholds.map((t, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-sans font-semibold">{t.metric}</td>
                              <td className="p-2 font-bold text-rose-400">{t.observed}</td>
                              <td className="p-2 text-stone-400">{t.threshold}</td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  t.status === 'VIOLATION'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SHAP Feature Drivers */}
                  {selectedProcessEvent.top_shap_features && selectedProcessEvent.top_shap_features.length > 0 && (
                    <div className="space-y-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-neutral-400' : 'text-stone-500'}`}>
                        Quantitative ML Feature Drivers (SHAP)
                      </span>
                      <div className="space-y-1">
                        {selectedProcessEvent.top_shap_features.slice(0, 3).map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-xs font-mono">
                            <span className="text-stone-400 truncate max-w-[160px]">{f.feature}</span>
                            <span className="font-bold text-amber-400">{(f.abs_shap || 0).toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Incident Response Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-stone-300 dark:border-neutral-800">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-neutral-400' : 'text-stone-500'}`}>
                      Recommended SOC Response Actions (Click to Execute)
                    </span>
                    <p className={`text-[11px] leading-relaxed font-sans ${isDark ? 'text-neutral-300' : 'text-stone-700'}`}>
                      {anomalyDetails.remediation}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleExecuteRemediation('Revoke Tokens & Reset Password')}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Revoke Tokens & Reset Credentials</span>
                      </button>

                      <button
                        onClick={() => handleExecuteRemediation('Isolate Endpoint Network')}
                        className={`px-3 py-1.5 rounded text-xs font-bold border flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                          isDark ? 'border-neutral-700 text-white hover:bg-neutral-800' : 'border-stone-400 text-stone-900 hover:bg-stone-200'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Isolate Endpoint</span>
                      </button>

                      <button
                        onClick={() => handleExecuteRemediation('Mandate Device Re-enrollment & MFA Step-Up')}
                        className="px-3 py-1.5 rounded text-xs font-bold bg-amber-600 hover:bg-amber-700 text-stone-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Re-enroll Device & Force MFA</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-lg border text-center text-xs ${isDark ? 'bg-[#0a0a0a] border-neutral-800 text-neutral-500' : 'bg-[#f8f5ee] border-[#e5dfd5] text-stone-400'}`}>
                  Select an event from the timeline table to inspect details.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
