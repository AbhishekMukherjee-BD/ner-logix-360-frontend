"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  MapPin, 
  Clock, 
  Navigation, 
  ArrowRight, 
  LogOut, 
  ShieldCheck, 
  AlertOctagon,
  RefreshCw,
  Zap,
  Info
} from "lucide-react"
import { motion } from "framer-motion"
import { DriverData } from "./auth-form"

export interface RouteItem {
  route_id: number
  name: string
  origin_name: string
  origin_lat: number
  origin_lng: number
  destination_name: string
  destination_lat: number
  destination_lng: number
  distance_km: number
  est_duration_min: number
  risk_level: 'LOW' | 'MODERATE' | 'CRITICAL'
  risk_score: number
  badge_color: 'emerald' | 'amber' | 'rose'
  badge_text: string
  active_incidents_count: number
  advisory: string
  polyline: string
}

interface RouteSelectorProps {
  driver: DriverData
  onLogout: () => void
  onTripStarted: (trip: any) => void
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ driver, onLogout, onTripStarted }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [startingRouteId, setStartingRouteId] = useState<number | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchRoutes = async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/routes/list.php')
      const data = await res.json()
      if (data.success && Array.isArray(data.routes)) {
        setRoutes(data.routes)
        if (!selectedRouteId && data.routes.length > 0) {
          setSelectedRouteId(data.routes[0].route_id)
        }
      } else {
        throw new Error(data.message || 'Could not fetch routes.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching corridor risk data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  const handleStartTrip = async (routeId: number) => {
    if (!driver.vehicle?.vehicle_id) {
      setErrorMsg('No vehicle linked to driver profile.')
      return
    }

    setStartingRouteId(routeId)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/trips/start.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: driver.vehicle.vehicle_id,
          route_id: routeId
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start trip.')
      }

      onTripStarted(data.trip)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize trip on local engine.')
      setStartingRouteId(null)
    }
  }

  const vehicleTypeColors: Record<string, string> = {
    truck: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    ambulance: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    relief_convoy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Top Header & Driver Status Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Truck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{driver.full_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                  {driver.phone_number}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
                <span>Vehicle: <strong className="text-zinc-200 font-mono">{driver.vehicle?.registration_number || 'Unassigned'}</strong></span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase ${vehicleTypeColors[driver.vehicle?.vehicle_type || 'truck']}`}>
                  {driver.vehicle?.vehicle_type?.replace('_', ' ') || 'Commercial Freight'}
                </span>
                {driver.vehicle?.cargo_type && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 truncate max-w-[200px]">Cargo: {driver.vehicle.cargo_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={fetchRoutes}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Refresh corridor risk analysis"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-amber-400" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 text-zinc-400 text-xs font-medium flex items-center gap-1.5 border border-zinc-800 transition-all"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Action Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Navigation size={20} className="text-amber-400" />
              Available Transport Corridors
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live hazard scoring calculated along turn-by-turn road polylines via OSRM & local AI
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>6/6 Corridors Monitored</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corridors Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto" />
            <div className="text-sm font-medium text-zinc-300">Computing terrain & corridor risk matrix...</div>
            <div className="text-xs text-zinc-500 font-mono">Evaluating live incidents against OSRM polylines</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => {
              const isSelected = selectedRouteId === route.route_id
              const isStarting = startingRouteId === route.route_id

              return (
                <motion.div
                  key={route.route_id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedRouteId(route.route_id)}
                  className={`cursor-pointer rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'bg-zinc-900 border-amber-500/60 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700'
                  }`}
                >
                  {/* Top Bar: Name & Risk Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {route.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-mono">
                          <span>{route.origin_name}</span>
                          <ArrowRight size={12} className="text-zinc-500" />
                          <span>{route.destination_name}</span>
                        </div>
                      </div>

                      {/* Dynamic Risk Badge */}
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                        route.risk_level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : route.risk_level === 'MODERATE'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {route.risk_level === 'CRITICAL' ? (
                          <AlertOctagon size={13} className="text-rose-400" />
                        ) : route.risk_level === 'MODERATE' ? (
                          <AlertTriangle size={13} className="text-amber-400" />
                        ) : (
                          <ShieldCheck size={13} className="text-emerald-400" />
                        )}
                        <span>{route.badge_text}</span>
                      </span>
                    </div>

                    {/* Metric Badges */}
                    <div className="grid grid-cols-2 gap-2 my-4 py-2.5 px-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs font-mono">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Navigation size={14} className="text-amber-400" />
                        <span><strong>{route.distance_km}</strong> km</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Clock size={14} className="text-amber-400" />
                        <span><strong>{route.est_duration_min}</strong> mins</span>
                      </div>
                    </div>

                    {/* Real-Time Advisory Note */}
                    <div className="text-xs p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800 text-zinc-400 flex items-start gap-2">
                      <Info size={14} className="shrink-0 text-amber-400/80 mt-0.5" />
                      <span className="line-clamp-2">{route.advisory}</span>
                    </div>
                  </div>

                  {/* Start Trip Button */}
                  <div className="mt-5 pt-3 border-t border-zinc-800/70 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">
                      Risk Index: <strong className="text-zinc-300">{route.risk_score} / 10</strong>
                    </span>

                    <button
                      type="button"
                      disabled={isStarting}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartTrip(route.route_id)
                      }}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <Zap size={14} />
                      <span>{isStarting ? 'Initiating...' : 'Start Trip'}</span>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

export default RouteSelector
