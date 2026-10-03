import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldAlert, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Ambulance, 
  Radio, 
  Cpu, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  ExternalLink,
  Layers,
  ArrowRight,
  Activity,
  Database,
  Server,
  Zap,
  Shield,
  Navigation,
  CloudRain,
  Upload,
  Camera,
  Image as ImageIcon,
  X
} from "lucide-react"
import { FALLBACK_SYSTEM_HEALTH, FALLBACK_SCENARIOS } from "@/lib/mock-data"

interface Scenario {
  id: string
  title: string
  description: string
  sender: string
  lat: number
  lng: number
  caption: string
  has_photo: boolean
  expected_outcome: string
}

interface AdminConsoleProps {
  onSwitchToDispatcher: () => void
  onSwitchToDriver: () => void
}

export function AdminConsole({ onSwitchToDispatcher, onSwitchToDriver }: AdminConsoleProps) {
  // Navigation tab state
  const [adminTab, setAdminTab] = useState<'risk_matrix' | 'simulator'>('risk_matrix')
  const [systemHealth, setSystemHealth] = useState<any | null>(FALLBACK_SYSTEM_HEALTH)
  const [isScanningRisk, setIsScanningRisk] = useState(false)

  // Autopilot state
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false)
  const [tickRateSec, setTickRateSec] = useState(3)
  const [stepSize, setStepSize] = useState(2)
  const [steppedVehicles, setSteppedVehicles] = useState<any[]>([])
  const [lastTickTime, setLastTickTime] = useState<number | null>(null)
  const autopilotTimer = useRef<any>(null)

  // Disaster injector state
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS as any)
  const [selectedScenario, setSelectedScenario] = useState<string>('nongpoh_flooding')
  const [nh6FleetState, setNh6FleetState] = useState<any>(null)
  const [isInjecting, setIsInjecting] = useState(false)
  const [triageResult, setTriageResult] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Custom photo upload & vision test
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null)
  const [customImageFileName, setCustomImageFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Collapsible chain of thought
  const [isThinkOpen, setIsThinkOpen] = useState(false)

  // Load scenarios & fleet status
  const loadScenarios = () => {
    fetch('/api/incidents/inject_demo.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.scenarios) {
          setScenarios(data.scenarios)
          if (data.nh6_fleet_state) {
            setNh6FleetState(data.nh6_fleet_state)
          }
        }
      })
      .catch(err => console.error('Failed to load scenarios', err))
  }

  // Load live system health and corridor risk matrix
  const loadSystemHealth = () => {
    fetch('/api/admin/system_health.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSystemHealth(data.data)
        }
      })
      .catch(err => console.error('Failed to load system health', err))
  }

  useEffect(() => {
    loadScenarios()
    loadSystemHealth()
    const interval = setInterval(loadSystemHealth, 8000)
    return () => clearInterval(interval)
  }, [])

  // Trigger DeepSeek-R1 Risk Scan across all corridors
  const triggerRiskScan = async () => {
    setIsScanningRisk(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const res = await fetch('/api/risk/predict.php')
      const data = await res.json()
      if (data.success) {
        setSuccessMessage('DeepSeek-R1 Cognitive Risk Scan completed across all 6 corridors!')
        loadSystemHealth()
      } else {
        setErrorMessage(data.message || 'Risk scan failed')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection to risk prediction engine failed')
    } finally {
      setIsScanningRisk(false)
    }
  }

  // Fleet simulation tick
  const triggerTick = async (manualStep = stepSize) => {
    try {
      const res = await fetch('/api/telemetry/sim_tick.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_size: manualStep, sim_mode: 'admin' })
      })
      const data = await res.json()
      if (data.success && data.vehicles) {
        setSteppedVehicles(data.vehicles)
        setLastTickTime(Date.now())
      }
    } catch (err) {
      console.warn('Simulation tick error:', err)
    }
  }

  // Autopilot loop interval
  useEffect(() => {
    if (isAutopilotRunning) {
      triggerTick()
      autopilotTimer.current = setInterval(() => {
        triggerTick()
      }, tickRateSec * 1000)
    } else {
      if (autopilotTimer.current) {
        clearInterval(autopilotTimer.current)
      }
    }
    return () => {
      if (autopilotTimer.current) clearInterval(autopilotTimer.current)
    }
  }, [isAutopilotRunning, tickRateSec, stepSize])

  // Pre-position emergency fleet on NH-6 (Issue 2 Fix)
  const handlePreposition = async () => {
    try {
      setErrorMessage(null)
      const res = await fetch('/api/incidents/inject_demo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preposition_nh6' })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage(data.message)
        loadScenarios()
        triggerTick()
      } else {
        setErrorMessage(data.message || 'Pre-positioning failed')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during pre-positioning')
    }
  }

  // 1-Click Complete Demo Reset (Issue 5 Fix)
  const handleResetDemo = async () => {
    if (!confirm('Execute clean 7-table demo reset? All test incidents, notifications, and alert logs will be purged, and nominal demo trips re-activated.')) {
      return
    }
    try {
      setErrorMessage(null)
      const res = await fetch('/api/incidents/inject_demo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Demo environment cleanly reset across 7 tables & fleet auto-staged on NH-6!')
        setTriageResult(null)
        loadScenarios()
        triggerTick()
      } else {
        setErrorMessage(data.message || 'Reset failed')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during demo reset')
    }
  }

  // Handle custom disaster image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP).')
      return
    }
    setCustomImageFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setCustomImageBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const clearCustomImage = () => {
    setCustomImageBase64(null)
    setCustomImageFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Inject disaster scenario
  const handleInject = async () => {
    setIsInjecting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setTriageResult(null)

    try {
      const res = await fetch('/api/incidents/inject_demo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scenario_key: selectedScenario,
          image_base64: customImageBase64 || undefined
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTriageResult(data.triage_response)
        loadScenarios()
      } else {
        setErrorMessage(data.message || 'Disaster injection failed')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection to triage engine failed')
    } finally {
      setIsInjecting(false)
    }
  }

  const selectedScObj = scenarios.find(s => s.id === selectedScenario)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-6 h-6 animate-pulse text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                NER-LogiX 360 // Mission Control
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live Fleet Telemetry Simulator & Tactical Disaster Injection Suite (Phase 9)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDemo}
            className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Purge all test state across 7 tables for next presentation round"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>1-Click Demo Reset</span>
          </button>

          <button
            onClick={onSwitchToDispatcher}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Fleet Command Map</span>
          </button>

          <button
            onClick={onSwitchToDriver}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Driver View</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div className="max-w-7xl mx-auto mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-300 font-bold">×</button>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-7xl mx-auto mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-300 font-bold">×</button>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          SYSTEM HEALTH & NEURAL RUNTIME STATUS BAR
      --------------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto mb-6 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-neutral-200 uppercase tracking-wider text-[11px]">System Status:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              NOMINAL & ACTIVE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {/* MySQL */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-neutral-400">MySQL :3306</span>
              <span className={`w-2 h-2 rounded-full ${systemHealth?.services?.mysql?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>

            {/* PHP API */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-neutral-400">PHP REST :8000</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            {/* OSRM Router */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-neutral-400">OSRM Engine :5001</span>
              <span className={`w-2 h-2 rounded-full ${systemHealth?.services?.osrm?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            </div>

            {/* n8n Automation */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-neutral-400">n8n Engine :5678</span>
              <span className={`w-2 h-2 rounded-full ${systemHealth?.services?.n8n?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>

            {/* DeepSeek-R1 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-amber-500/30 shadow-sm shadow-amber-500/10">
              <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-amber-300 font-bold">DeepSeek-R1 (14B)</span>
              <span className={`w-2 h-2 rounded-full ${systemHealth?.services?.ollama?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          ADMIN CONSOLE NAVIGATION TABS & SCAN ACTION
      --------------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab('risk_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === 'risk_matrix'
                ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>DeepSeek-R1 Environmental Risk Matrix</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-950/40 text-current font-mono font-bold">
              6 Corridors
            </span>
          </button>

          <button
            onClick={() => setAdminTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === 'simulator'
                ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Fleet Autopilot & Disaster Injector</span>
          </button>
        </div>

        {adminTab === 'risk_matrix' && (
          <button
            onClick={triggerRiskScan}
            disabled={isScanningRisk}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningRisk ? 'animate-spin' : ''}`} />
            <span>{isScanningRisk ? 'Deliberating Multi-Corridor Scan with DeepSeek-R1...' : '⚡ Run AI Risk Scan'}</span>
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          VIEW A: DEEPSEEK-R1 PREDICTIVE ENVIRONMENTAL RISK MATRIX
      --------------------------------------------------------------------- */}
      {adminTab === 'risk_matrix' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Northeast Strategic Corridor Predictive Intelligence (Workflow D)</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Tri-Signal Sensor Fusion: Live Open-Meteo precipitation + USGS global seismic fault feeds + Local DeepSeek-R1 Chain of Thought (CoT).
              </p>
            </div>
            <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> LOW (&lt; 2.0)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> MEDIUM (2.0 - 4.5)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> HIGH (4.5 - 7.5)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> CRITICAL (&ge; 7.5)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {systemHealth?.risk_matrix?.map((c: any) => (
              <div 
                key={c.route_id}
                className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">Corridor #{c.route_id}</span>
                      <h4 className="font-bold text-white text-sm leading-snug">{c.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      c.risk_level === 'CRITICAL' ? 'bg-rose-600 text-white animate-pulse' :
                      c.risk_level === 'HIGH' ? 'bg-orange-600 text-white' :
                      c.risk_level === 'MEDIUM' ? 'bg-amber-500 text-neutral-950 font-bold' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {c.risk_level}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 font-mono flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
                    <span>{c.origin} &rarr; {c.destination}</span>
                    <span className="text-neutral-300 font-bold">{c.distance_km} km</span>
                  </div>

                  {/* Environmental Sensor Telemetry (Rainfall, Seismic, Hazards) */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60 mb-3 text-[10px] font-mono">
                    <div>
                      <span className="text-neutral-500 block text-[9px] uppercase">24h Rain</span>
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <CloudRain className="w-2.5 h-2.5 shrink-0" />
                        {c.rainfall_24h_mm ?? 0} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px] uppercase">Seismic</span>
                      <span className="text-amber-400 font-bold truncate block" title={c.seismic_shock ?? 'None'}>
                        {c.seismic_shock ?? 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px] uppercase">Hazards</span>
                      <span className={`font-bold flex items-center gap-1 ${(c.active_hazards ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        {c.active_hazards ?? 0} active
                      </span>
                    </div>
                  </div>

                  {/* Risk Score Progress Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">AI Risk Score</span>
                      <span className="font-mono font-bold text-amber-400">{c.risk_score} / 10.0</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.risk_level === 'CRITICAL' ? 'bg-rose-500' :
                          c.risk_level === 'HIGH' ? 'bg-orange-500' :
                          c.risk_level === 'MEDIUM' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (c.risk_score / 10) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* DeepSeek-R1 Reason Box */}
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/90 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <Cpu className="w-3 h-3" />
                      <span>DeepSeek-R1 Rationale</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
                      {c.reason}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Nearby Incidents: <strong className="text-neutral-300">{c.nearby_incidents}</strong></span>
                  <span>{c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : 'Live'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Incident Triage Stream (Citizen WhatsApp & Field Reports) */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Incident Triage Stream (Citizen WhatsApp & Field Feeds)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                Live Ingestion Feed • Multi-Modal Computer Vision & CoT Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemHealth?.recent_incidents?.map((inc: any) => (
                <div 
                  key={inc.incident_id}
                  className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          inc.severity === 'critical' ? 'bg-rose-600 text-white' :
                          inc.severity === 'high' ? 'bg-orange-600 text-white' :
                          'bg-amber-600 text-white'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">
                          #{inc.incident_id} • {inc.incident_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        inc.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        inc.status === 'pending_review' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {inc.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white leading-snug">
                      {inc.location_name}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>Lat: {parseFloat(inc.lat).toFixed(4)}, Lng: {parseFloat(inc.lng).toFixed(4)}</span>
                      {inc.image_path ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Photo Verified
                        </span>
                      ) : (
                        <span className="text-neutral-500">No Photo</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Source: {inc.source}</span>
                    <span>{inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Recent'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          VIEW B: FLEET AUTOPILOT & TACTICAL DISASTER INJECTOR SUITE
      --------------------------------------------------------------------- */}
      {adminTab === 'simulator' && (
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =================================================================== */}
        {/* LEFT COLUMN: Fleet Autopilot Master Controller                      */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Fleet Autopilot Engine
                </h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isAutopilotRunning ? 'bg-emerald-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {isAutopilotRunning ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>

            {/* Play/Pause Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAutopilotRunning(!isAutopilotRunning)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isAutopilotRunning
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 shadow-amber-500/20'
                }`}
              >
                {isAutopilotRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause Fleet Autopilot</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Fleet Autopilot</span>
                  </>
                )}
              </button>

              <button
                onClick={() => triggerTick(stepSize * 2)}
                className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs transition-all cursor-pointer"
                title="Force single forward step"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Simulation Rate & Step Size Selectors */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tick Frequency</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setTickRateSec(sec)}
                      className={`flex-1 py-1 rounded text-center text-[11px] font-bold font-mono transition-all ${
                        tickRateSec === sec 
                          ? 'bg-amber-500 text-neutral-950' 
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Step Multiplier</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 4].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setStepSize(sz)}
                      className={`flex-1 py-1 rounded text-center text-[11px] font-bold font-mono transition-all ${
                        stepSize === sz 
                          ? 'bg-amber-500 text-neutral-950' 
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {sz}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pre-position Emergency Fleet on NH-6 */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Nongpoh Scenario Pre-Staging</span>
                </div>
                {nh6FleetState && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    nh6FleetState.ready_for_nongpoh_split ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {nh6FleetState.ready_for_nongpoh_split ? 'STAGED' : 'UNSTAGED'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Guarantees Trip #1 (Commercial Truck) and Trip #3 (Ambulance) are active along the Guwahati–Shillong corridor (NH-6) for the Nongpoh split test.
              </p>
              <button
                onClick={handlePreposition}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Ambulance className="w-3.5 h-3.5" />
                <span>Pre-Position Fleet on NH-6</span>
              </button>
            </div>

            {/* Active Stepped Fleet Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Active Fleet Vehicles</span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {steppedVehicles.length} units moving
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {steppedVehicles.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-center text-xs text-neutral-500">
                    No active vehicles stepped yet. Start autopilot or click refresh.
                  </div>
                ) : (
                  steppedVehicles.map(v => (
                    <div key={v.trip_id} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{v.registration_number}</span>
                          <span className={`text-[8px] px-1 rounded font-black uppercase ${
                            v.vehicle_type === 'ambulance' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {v.vehicle_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {v.speed_kmh} km/h • {v.heading}° • Waypoint {v.current_waypoint_index}/{v.total_waypoints}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {v.progress_percentage}%
                        </span>
                        <div className="w-16 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, v.progress_percentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Disaster Scenario Injector & AI Breakdown             */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tactical Disaster Injector
                </h2>
              </div>
              <span className="text-xs text-neutral-400">Workflow A Trigger</span>
            </div>

            {/* Scenario Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenario(sc.id)
                    setTriageResult(null)
                    setErrorMessage(null)
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedScenario === sc.id
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate pr-1">{sc.title}</span>
                    {sc.has_photo && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                        PHOTO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mb-2">{sc.description}</p>
                  <div className="mt-auto pt-1 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span>{sc.lat.toFixed(3)}, {sc.lng.toFixed(3)}</span>
                    <span className="text-amber-400 font-bold">Select</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Scenario Preview */}
            {selectedScObj && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-semibold text-neutral-200">Field Caption:</span>
                  <span className="font-mono text-[10px] text-neutral-500">Sender: {selectedScObj.sender}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 font-mono text-[11px]">
                  "{selectedScObj.caption}"
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Expected Behavior:</span>
                  <span className="text-amber-400 font-medium">{selectedScObj.expected_outcome}</span>
                </div>
              </div>
            )}

            {/* Custom Photo Upload & Inspection Controls */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Disaster Photo & Vision AI Verification
                  </span>
                </div>
                {customImageBase64 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Custom Photo Loaded
                  </span>
                ) : selectedScObj?.has_photo ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Preset Scenario Photo Attached
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-400">
                    No Photo (Text-Only)
                  </span>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              {customImageBase64 ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-900 border border-emerald-500/30">
                  <img
                    src={customImageBase64}
                    alt="Custom disaster upload"
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-700 shadow shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{customImageFileName}</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5">
                      ✓ Ready for Moondream visual hazard analysis & pixel verification
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomImage}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove custom image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <div className="text-left">
                    <p className="text-xs text-neutral-300 font-medium">
                      {selectedScObj?.has_photo
                        ? "Using high-res ground truth photo from scenario (or upload your own)."
                        : "Upload a real photo to test Ollama's Moondream Computer Vision engine."}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Supports JPG, PNG, WebP • Analyzes landslides, floods, road collapses, and blockage status
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-white border border-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Custom Photo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inject Button */}
            <button
              onClick={handleInject}
              disabled={isInjecting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isInjecting ? (
                <div className="flex items-center gap-3 py-0.5">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300 shrink-0" />
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-white text-xs">DeepSeek-R1 Cognitive Triage in Progress...</span>
                    <span className="text-[10px] text-amber-200/80 font-normal normal-case tracking-normal">
                      Deliberating multi-step Chain of Thought in Apple Silicon unified memory (~30–90s)
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>Inject Disaster Report (Workflow A)</span>
                </>
              )}
            </button>

            {/* Live AI Execution Breakdown */}
            {triageResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-neutral-950 border border-amber-500/40 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Multi-Agent AI Verification Breakdown
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                      triageResult.status === 'confirmed'
                        ? 'bg-emerald-600 text-white'
                        : triageResult.status === 'pending_review'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {triageResult.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Score: {Math.round(triageResult.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                {/* Primary Clean Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Geocoding & Location</span>
                    <p className="font-medium text-white">{triageResult.location_name}</p>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {triageResult.coordinates?.lat?.toFixed(4)}, {triageResult.coordinates?.lng?.toFixed(4)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Classification</span>
                    <p className="font-bold text-amber-400 uppercase">
                      {triageResult.incident_type} ({triageResult.severity})
                    </p>
                    <p className="text-[11px] text-neutral-400">Road Status: {triageResult.road_status}</p>
                  </div>
                </div>

                {/* Computer Vision Damage Assessment (moondream:latest) */}
                {triageResult.vision_assessment && triageResult.vision_assessment.blockage_status !== 'undetermined' && (
                  <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                          Computer Vision Damage Assessment (moondream:latest)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        {triageResult.vision_assessment.blockage_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block">Identified Hazard:</span>
                        <span className="font-bold text-white capitalize">{triageResult.vision_assessment.hazard_type || 'Road Obstruction'}</span>
                      </div>
                      <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block">Vehicle Passability:</span>
                        <span className={`font-bold ${triageResult.vision_assessment.vehicles_able_to_pass ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {triageResult.vision_assessment.vehicles_able_to_pass ? 'Passable' : 'Blocked (No Pass)'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-neutral-400 block">Vision Confidence:</span>
                        <span className="font-bold text-amber-400 uppercase">{triageResult.vision_assessment.confidence || 'High'}</span>
                      </div>
                    </div>

                    {triageResult.vision_assessment.description && (
                      <p className="text-[11px] text-neutral-300 italic bg-neutral-900/50 p-2 rounded border border-neutral-800/80">
                        "{triageResult.vision_assessment.description}"
                      </p>
                    )}
                  </div>
                )}

                {/* WhatsApp Driver Ack Message */}
                {triageResult.driver_ack_message && (
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Driver In-Cab WhatsApp Acknowledgment</span>
                    <p className="text-neutral-200 font-mono text-[11px]">"{triageResult.driver_ack_message}"</p>
                  </div>
                )}

                {/* Clean AI Reasoning */}
                {triageResult.clean_reasoning && (
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Reasoning Summary</span>
                    <p className="text-neutral-300 text-[11px]">{triageResult.clean_reasoning}</p>
                  </div>
                )}

                {/* Autonomous Rerouting Status */}
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Autonomous Reroute Status:</span>
                  <span className={`font-bold ${triageResult.reroute_triggered ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    {triageResult.reroute_triggered ? '⚡ DETOUR ACTIVATED (Workflow B Triggered)' : 'PAUSED (Awaiting Dispatcher Verification)'}
                  </span>
                </div>

                {/* Issue 3 Fix: Collapsible DeepSeek Chain of Thought (Raw <think> Tokens Isolated) */}
                {triageResult.raw_chain_of_thought && (
                  <div className="rounded-lg border border-neutral-800 overflow-hidden text-xs">
                    <button
                      onClick={() => setIsThinkOpen(!isThinkOpen)}
                      className="w-full p-2.5 bg-neutral-900/80 hover:bg-neutral-900 flex items-center justify-between text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          🧠 AI Cognitive Reasoning (DeepSeek-R1 Chain of Thought)
                        </span>
                      </div>
                      {isThinkOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {isThinkOpen && (
                      <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-2">
                        <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg font-sans flex items-start gap-2 leading-relaxed">
                          <span className="text-amber-400 font-bold shrink-0">💡 Model Self-Correction:</span>
                          <span>Raw model reasoning — note: model self-corrects to schema-valid values (e.g. &apos;major&apos; &rarr; &apos;critical&apos;, &apos;closed&apos; &rarr; &apos;blocked&apos;) in final output.</span>
                        </div>
                        <div className="p-3 bg-black/60 rounded-lg border border-neutral-900 font-mono text-[10px] text-neutral-400 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                          {triageResult.raw_chain_of_thought}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
export default AdminConsole
