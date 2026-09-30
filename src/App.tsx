import * as React from "react"
import { useState, useEffect } from "react"
import { AuthForm, DriverData } from "@/components/ui/auth-form"
import { RouteSelector } from "@/components/ui/route-selector"
import { LiveTracker } from "@/components/ui/live-tracker"
import { DisasterInjector } from "@/components/ui/disaster-injector"
import { DispatcherDashboard } from "@/components/ui/dispatcher-dashboard"
import { AdminConsole } from "@/components/ui/admin-console"
import { Radio, Truck, Flame, Cpu } from "lucide-react"

export function App() {
  const [currentView, setCurrentView] = useState<'dispatcher' | 'driver' | 'admin'>('dispatcher')
  const [driver, setDriver] = useState<DriverData | null>(null)
  const [activeTrip, setActiveTrip] = useState<any | null>(null)
  const [isInjectorOpen, setIsInjectorOpen] = useState(false)

  // 1. URL Routing & Persistent View Resolution (Fix 11 & Phase 9)
  useEffect(() => {
    const resolveViewFromUrl = () => {
      const search = window.location.search
      const hash = window.location.hash

      if (search.includes('view=admin') || hash.includes('admin')) {
        setCurrentView('admin')
      } else if (search.includes('view=driver') || hash.includes('track') || hash.includes('driver')) {
        setCurrentView('driver')
        const trackMatch = hash.match(/track\/(\d+)/)
        if (trackMatch) {
          const tid = parseInt(trackMatch[1], 10)
          setActiveTrip((prev: any) => (prev?.trip_id === tid ? prev : { trip_id: tid }))
          const savedDriver = localStorage.getItem('nerlogix_driver')
          if (!savedDriver) {
            const defaultDriver: DriverData = {
              driver_id: 1,
              full_name: 'Rajesh Kumar (Fleet Unit)',
              phone_number: '+919123803476',
              license_number: 'AS-01-2023-8871',
              vehicle: {
                vehicle_id: 1,
                registration_number: 'AS-01-GC-4421',
                vehicle_type: 'truck',
                cargo_type: 'Medical & Relief Supply',
                status: 'IN_TRANSIT'
              }
            }
            setDriver(defaultDriver)
            localStorage.setItem('nerlogix_driver', JSON.stringify(defaultDriver))
          }
        }
      } else if (search.includes('view=dispatcher') || hash.includes('dispatcher')) {
        setCurrentView('dispatcher')
      } else {
        // Check saved preference or default to dispatcher
        const savedView = localStorage.getItem('nerlogix_view') as 'dispatcher' | 'driver' | 'admin'
        if (savedView) {
          setCurrentView(savedView)
        }
      }
    }

    resolveViewFromUrl()
    window.addEventListener('hashchange', resolveViewFromUrl)
    window.addEventListener('popstate', resolveViewFromUrl)
    return () => {
      window.removeEventListener('hashchange', resolveViewFromUrl)
      window.removeEventListener('popstate', resolveViewFromUrl)
    }
  }, [])

  // Sync view changes to URL hash and localStorage
  const switchView = (view: 'dispatcher' | 'driver' | 'admin', tripId?: number) => {
    setCurrentView(view)
    localStorage.setItem('nerlogix_view', view)
    if (view === 'dispatcher') {
      window.location.hash = '/dispatcher'
    } else if (view === 'admin') {
      window.location.hash = '/admin'
    } else {
      if (tripId) {
        window.location.hash = `/track/${tripId}`
        if (!activeTrip || activeTrip.trip_id !== tripId) {
          setActiveTrip({ trip_id: tripId })
        }
        if (!driver) {
          const defaultDriver: DriverData = {
            driver_id: 1,
            full_name: 'Rajesh Kumar (Fleet Unit)',
            phone_number: '+919123803476',
            license_number: 'AS-01-2023-8871',
            vehicle: {
              vehicle_id: 1,
              registration_number: 'AS-01-GC-4421',
              vehicle_type: 'truck',
              cargo_type: 'Medical & Relief Supply',
              status: 'IN_TRANSIT'
            }
          }
          setDriver(defaultDriver)
          localStorage.setItem('nerlogix_driver', JSON.stringify(defaultDriver))
        }
      } else {
        window.location.hash = '/driver'
      }
    }
  }

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedDriver = localStorage.getItem('nerlogix_driver')
      const savedTrip = localStorage.getItem('nerlogix_trip')
      if (savedDriver) {
        const parsedDriver = JSON.parse(savedDriver)
        setDriver(parsedDriver)
        if (parsedDriver.active_trip) {
          setActiveTrip(parsedDriver.active_trip)
        }
      }
      if (savedTrip) {
        setActiveTrip(JSON.parse(savedTrip))
      }
    } catch (e) {
      console.error('Failed to parse local storage session', e)
    }
  }, [])

  const handleAuthSuccess = (driverData: DriverData) => {
    setDriver(driverData)
    localStorage.setItem('nerlogix_driver', JSON.stringify(driverData))
    if (driverData.active_trip) {
      setActiveTrip(driverData.active_trip)
      localStorage.setItem('nerlogix_trip', JSON.stringify(driverData.active_trip))
    }
    switchView('driver')
  }

  const handleLogout = () => {
    setDriver(null)
    setActiveTrip(null)
    localStorage.removeItem('nerlogix_driver')
    localStorage.removeItem('nerlogix_trip')
  }

  const handleTripStarted = (tripData: any) => {
    setActiveTrip(tripData)
    localStorage.setItem('nerlogix_trip', JSON.stringify(tripData))
  }

  const handleEndTrip = () => {
    setActiveTrip(null)
    localStorage.removeItem('nerlogix_trip')
  }

  return (
    <>
      {/* PERSISTENT TOP TACTICAL VIEW SWITCHER */}
      <div className="fixed top-3 right-4 z-50 flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs font-mono font-bold">
        <button
          onClick={() => switchView('dispatcher')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            currentView === 'dispatcher'
              ? 'bg-amber-500 text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Switch to Regional Fleet Command Center"
        >
          <Radio size={14} className={currentView === 'dispatcher' ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">Fleet Command</span>
        </button>

        <button
          onClick={() => switchView('driver')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            currentView === 'driver'
              ? 'bg-amber-500 text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Switch to Driver In-Cab Cockpit HUD"
        >
          <Truck size={14} />
          <span className="hidden sm:inline">Driver Cockpit</span>
        </button>

        <button
          onClick={() => switchView('admin')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            currentView === 'admin'
              ? 'bg-amber-500 text-zinc-950 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Switch to Executive Mission Control & Autopilot Simulator"
        >
          <Cpu size={14} className={currentView === 'admin' ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">Admin Mission Control</span>
        </button>
      </div>

      {/* DISPATCHER COMMAND VIEW */}
      {currentView === 'dispatcher' && (
        <DispatcherDashboard
          onSwitchToDriver={(tripId) => switchView('driver', tripId)}
          onOpenInjector={() => setIsInjectorOpen(true)}
          onOpenAdmin={() => switchView('admin')}
        />
      )}

      {/* ADMIN MISSION CONTROL VIEW */}
      {currentView === 'admin' && (
        <AdminConsole
          onSwitchToDispatcher={() => switchView('dispatcher')}
          onSwitchToDriver={() => switchView('driver')}
        />
      )}

      {/* DRIVER IN-CAB VIEW */}
      {currentView === 'driver' && (
        <>
          {!driver && (
            <div className="relative min-h-screen bg-zinc-950 flex flex-col justify-center">
              <AuthForm onAuthSuccess={handleAuthSuccess} />
            </div>
          )}

          {driver && activeTrip && (
            <LiveTracker 
              tripId={activeTrip.trip_id} 
              driver={driver} 
              onBack={handleEndTrip}
              onSwitchToDispatcher={() => switchView('dispatcher')}
            />
          )}

          {driver && !activeTrip && (
            <RouteSelector 
              driver={driver} 
              onLogout={handleLogout} 
              onTripStarted={handleTripStarted} 
            />
          )}
        </>
      )}

      {/* Persistent Tactical Demo Disaster Injector Floating Action Button */}
      <button
        onClick={() => setIsInjectorOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-xl shadow-amber-500/20 backdrop-blur border border-amber-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Trigger Demo Disasters into Workflow A"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        <span>🚨 Disaster Injector (Demo)</span>
      </button>

      <DisasterInjector 
        isOpen={isInjectorOpen} 
        onClose={() => setIsInjectorOpen(false)} 
      />
    </>
  )
}

export default App
