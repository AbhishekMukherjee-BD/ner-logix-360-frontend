import * as React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AlertTriangle, 
  Flame, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Camera, 
  Languages, 
  Cpu, 
  Sparkles, 
  RotateCw,
  Eye,
  Send,
  Radio,
  X
} from "lucide-react"
import { FALLBACK_SCENARIOS } from "@/lib/mock-data"

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

interface DisasterInjectorProps {
  isOpen: boolean
  onClose: () => void
  onIncidentCreated?: (incident: any) => void
}

export function DisasterInjector({ isOpen, onClose, onIncidentCreated }: DisasterInjectorProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS as any)
  const [selectedScenario, setSelectedScenario] = useState<string>('sonapur_landslide')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetch('/api/incidents/inject_demo.php')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.scenarios) {
            setScenarios(data.scenarios)
          }
        })
        .catch(err => console.error('Failed to load scenarios', err))
    }
  }, [isOpen])

  const handleInject = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/incidents/inject_demo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_key: selectedScenario })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setResult(data)
        if (onIncidentCreated) {
          onIncidentCreated(data.triage_response)
        }
      } else {
        setError(data.message || (typeof data.triage_response === 'string' ? data.triage_response : 'Disaster injection failed'))
      }
    } catch (err: any) {
      setError(err.message || 'Connection to triage engine failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const activeScenarioObj = scenarios.find(s => s.id === selectedScenario)
  const triage = result?.triage_response

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-950 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 p-6 text-neutral-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Flame className="w-6 h-6 animate-pulse text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-neutral-100">
                    Tactical Disaster Injector
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    Workflow A Demo Tool
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Simulate field incident reports into the multi-agent AI verification engine
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scenario Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedScenario(sc.id)
                  setResult(null)
                  setError(null)
                }}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 ${
                  selectedScenario === sc.id
                    ? 'bg-amber-500/10 border-amber-500 text-amber-100 shadow-sm shadow-amber-500/20'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold truncate pr-2">
                    {sc.title}
                  </span>
                  {sc.has_photo && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                      <Camera className="w-3 h-3" /> Photo
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2 mb-2">
                  {sc.description}
                </p>
                <div className="mt-auto flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60">
                  <span className="font-mono">Lat: {sc.lat.toFixed(4)}, Lng: {sc.lng.toFixed(4)}</span>
                  <span className="text-amber-400/80 font-medium">Select</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Scenario Preview Card */}
          {activeScenarioObj && (
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">Scenario Payload Details:</span>
                <span className="font-mono text-[11px] text-neutral-500">Sender: {activeScenarioObj.sender}</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300">
                <div className="text-neutral-500 mb-1">Original Field Caption:</div>
                <p className="text-neutral-200">"{activeScenarioObj.caption}"</p>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Expected Outcome:</span>
                <span className="text-amber-400 font-medium">{activeScenarioObj.expected_outcome}</span>
              </div>
            </div>
          )}

          {/* Trigger Button */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInject}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-neutral-950" />
                  <span>Processing Through Ollama Pipeline...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-neutral-950" />
                  <span>Inject Disaster Report (Workflow A)</span>
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Execution Failed</p>
                <p className="text-neutral-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Multi-Agent AI Pipeline Verification Results */}
          {triage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-neutral-900/70 border border-amber-500/30 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-neutral-100">
                    Multi-Agent AI Verification Breakdown
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    triage.status === 'confirmed' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : triage.status === 'pending_review'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {triage.status}
                  </span>
                  {triage.is_duplicate && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Duplicate (Count: {triage.report_count})
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Geocoding & Reporter */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-400 font-semibold">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Tactical Geocoding (Offline)</span>
                  </div>
                  <p className="text-neutral-200 font-medium">{triage.location_name}</p>
                  <p className="text-[11px] text-neutral-500">
                    Reported by: <span className="text-neutral-300">{triage.reporting_party}</span>
                  </p>
                </div>

                {/* AI Classification & Confidence */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-400 font-semibold">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>DeepSeek-R1 Fusion & Reasoning</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-200 font-bold uppercase">
                      {triage.incident_type} ({triage.severity})
                    </span>
                    <span className="text-neutral-500">|</span>
                    <span className="text-amber-400 font-mono font-semibold">
                      Score: {(triage.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">{triage.action_summary}</p>
                </div>

                {/* Vision Model Assessment */}
                {triage.vision_assessment && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between text-neutral-400 font-semibold">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span>Ollama Vision Assessment (llama3.2-vision:latest)</span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">
                        Blockage: <strong className="text-neutral-200">{triage.vision_assessment.blockage_status}</strong>
                      </span>
                    </div>
                    <p className="text-neutral-300 text-[11px]">
                      {triage.vision_assessment.description}
                    </p>
                    {triage.image_saved_path && (
                      <p className="text-[10px] text-neutral-500 font-mono">
                        Saved to Disk: {triage.image_saved_path}
                      </p>
                    )}
                  </div>
                )}

                {/* Multilingual Driver Acknowledgment */}
                {triage.driver_ack_message && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2 text-neutral-400 font-semibold">
                      <Languages className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp Field Acknowledgment (Qwen Localized)</span>
                    </div>
                    <div className="p-2.5 rounded bg-neutral-900/80 border border-neutral-800 text-neutral-200 text-xs font-mono">
                      "{triage.driver_ack_message}"
                    </div>
                  </div>
                )}
              </div>

              {/* Action Banner */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Autonomous Reroute Engine:</span>
                <span className={`font-bold ${
                  triage.reroute_triggered 
                    ? 'text-emerald-400' 
                    : 'text-neutral-400'
                }`}>
                  {triage.reroute_triggered ? '⚡ INITIATED (Workflow B Triggered)' : 'PAUSED (Awaiting Dispatcher Review)'}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
export default DisasterInjector
