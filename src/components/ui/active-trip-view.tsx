"use client"

import * as React from "react"
import { 
  Truck, 
  Navigation, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  ArrowLeft,
  Activity,
  Compass
} from "lucide-react"
import { motion } from "framer-motion"

interface ActiveTripViewProps {
  trip: any
  driver: any
  onEndTrip: () => void
}

export const ActiveTripView: React.FC<ActiveTripViewProps> = ({ trip, driver, onEndTrip }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Active Trip Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Mission Active • Trip #{trip.trip_id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {trip.route_name || 'Active Highway Corridor'}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-zinc-500 uppercase font-mono block">Driver</span>
            <span className="text-sm font-semibold text-zinc-200">{driver.full_name}</span>
          </div>
        </div>

        {/* Live Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Vehicle Plate</div>
            <div className="text-base font-bold text-white font-mono">
              {driver.vehicle?.registration_number || 'TRUCK-01'}
            </div>
            <div className="text-[11px] text-amber-400 capitalize mt-0.5">
              {driver.vehicle?.vehicle_type?.replace('_', ' ') || 'Freight'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Telemetry Status</div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <Radio size={16} className="animate-pulse text-emerald-400" />
              <span>ONLINE</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Phase 4 Ready</div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-500 uppercase font-mono mb-1">Assigned Cargo</div>
            <div className="text-xs font-semibold text-zinc-200 truncate">
              {driver.vehicle?.cargo_type || 'Essential Relief'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">High-Priority Transit</div>
          </div>
        </div>

        {/* Route Tracking Notice */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-3">
          <Compass size={18} className="shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong className="text-amber-200 block mb-0.5">Continuous Satellite Link Ready</strong>
            Your vehicle has been marked as <strong>active</strong> in the central MDoNER dispatch registry. Any rockfalls, floods, or landslides reported along this corridor will be broadcast directly to this console for immediate automated rerouting.
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end border-t border-zinc-800/80">
          <button
            onClick={onEndTrip}
            className="px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
          >
            Switch / Choose Another Route
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default ActiveTripView
