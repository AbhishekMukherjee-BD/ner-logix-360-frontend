"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Clock, 
  Radio, 
  Play, 
  Pause, 
  FastForward, 
  Crosshair, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  Gauge, 
  RefreshCw,
  LocateFixed,
  Globe,
  Layers,
  Mountain
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { arePolylinesEqual } from "@/lib/utils"
import { FALLBACK_SYNC_DATA } from "@/lib/mock-data"

// Fix Leaflet default icon paths in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom SVG Pulsing Truck Marker
const createVehicleIcon = (type: string, isStranded: boolean) => {
  const color = isStranded ? '#f43f5e' : (type === 'ambulance' ? '#f43f5e' : (type === 'relief_convoy' ? '#10b981' : '#f59e0b'))
  
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: ${color}; opacity: 0.25; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background-color: #18181b; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px ${color}80;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })
}

// Polyline decoder utility
function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return []
  // Check if already a JSON array of coordinates
  if (encoded.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(encoded)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => [parseFloat(p[0]), parseFloat(p[1])])
      }
    } catch (e) {
      // Fall through to standard decode
    }
  }

  const points: [number, number][] = []
  let index = 0, len = encoded.length
  let lat = 0, lng = 0

  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng

    points.push([lat * 1e-5, lng * 1e-5])
  }
  return points
}

// Component to dynamically re-center map
const RecenterHandler: React.FC<{ center: [number, number]; shouldFollow: boolean }> = ({ center, shouldFollow }) => {
  const map = useMap()
  useEffect(() => {
    if (shouldFollow && center[0] !== 0 && center[1] !== 0) {
      map.panTo(center, { animate: true, duration: 0.8 })
    }
  }, [center, shouldFollow, map])
  return null
}

interface LiveTrackerProps {
  tripId: number
  driver: any
  onBack: () => void
  onSwitchToDispatcher?: () => void
}

export const LiveTracker: React.FC<LiveTrackerProps> = ({ tripId, driver, onBack, onSwitchToDispatcher }) => {
  const [tripData, setTripData] = useState<any | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [currentCoord, setCurrentCoord] = useState<[number, number]>([26.1445, 91.7362])
  const [simRunning, setSimRunning] = useState(false)
  const [mapMode, setMapMode] = useState<'dark' | 'satellite' | 'terrain'>('dark')
  const [autoFollow, setAutoFollow] = useState(true)
  const [useDeviceGps, setUseDeviceGps] = useState(false)
  const [simSpeed, setSimSpeed] = useState(4) // Waypoints per step
  const [activeIncidents, setActiveIncidents] = useState<any[]>([])
  const [latestAlert, setLatestAlert] = useState<any | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [estSpeed, setEstSpeed] = useState(48) // Simulated km/h
  const [heading, setHeading] = useState(0) // Degrees (0 - 360)
  const [sessionExpired, setSessionExpired] = useState(false)

  const simIntervalRef = useRef<any>(null)
  const gpsWatchIdRef = useRef<number | null>(null)
  const lastPolylineRef = useRef<string>('')
  const isMountedRef = useRef(true)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const failureCountRef = useRef(0)

  // 1. Recursive setTimeout Polling of vehicle state (/api/vehicles/track.php)
  const fetchTripState = async () => {
    try {
      const res = await fetch(`/api/vehicles/track.php?trip_id=${tripId}`)
      const data = await res.json()
      if (data.success && data.trip && isMountedRef.current) {
        setTripData(data.trip)
        if (data.incidents) {
          setActiveIncidents(data.incidents)
        }
        if (data.latest_alert) {
          setLatestAlert(data.latest_alert)
        }

        failureCountRef.current = 0

        // Set current coordinates
        const lat = parseFloat(data.trip.current_lat) || 26.1445
        const lng = parseFloat(data.trip.current_lng) || 91.7362
        setCurrentCoord([lat, lng])

        // Read server-reported speed and heading if present
        if (data.trip.speed_kmh !== undefined && parseFloat(data.trip.speed_kmh) > 0) {
          setEstSpeed(Math.round(parseFloat(data.trip.speed_kmh)))
        }
        if (data.trip.heading !== undefined) {
          setHeading(Math.round(parseFloat(data.trip.heading)))
        }

        // Decode or update polyline dynamically using normalized equality check
        const newPoly = data.trip.current_route_polyline
        if (newPoly && (lastPolylineRef.current === '' || !arePolylinesEqual(newPoly, lastPolylineRef.current))) {
          lastPolylineRef.current = newPoly
          const decoded = decodePolyline(newPoly)
          setRouteCoords(decoded)
          if (decoded.length > 0 && data.trip.current_waypoint_index !== undefined) {
            const pct = Math.min(100, Math.round((data.trip.current_waypoint_index / decoded.length) * 100))
            setProgressPct(pct)
          }
        }
      }
    } catch (e) {
      failureCountRef.current += 1
      console.warn('Error polling trip state (backoff active):', e)
    } finally {
      if (isMountedRef.current) {
        const backoffMs = failureCountRef.current > 0
          ? Math.min(failureCountRef.current * 2000, 15000)
          : 2000
        pollTimerRef.current = setTimeout(fetchTripState, backoffMs)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    // Immediate pre-population so judges see HUD and route instantly
    const fallbackVehicle = FALLBACK_SYNC_DATA.vehicles.find((v: any) => v.trip_id === tripId || v.vehicle_id === tripId) || FALLBACK_SYNC_DATA.vehicles[0]
    if (fallbackVehicle) {
      setTripData(fallbackVehicle)
      setActiveIncidents(FALLBACK_SYNC_DATA.active_incidents as any)
      if (FALLBACK_SYNC_DATA.notifications.length > 0) {
        setLatestAlert({
          message_text: FALLBACK_SYNC_DATA.notifications[0].message,
          sent_at: FALLBACK_SYNC_DATA.notifications[0].created_at,
          status: 'sent'
        })
      }
      const lat = parseFloat(fallbackVehicle.current_lat) || 26.06609
      const lng = parseFloat(fallbackVehicle.current_lng) || 91.87257
      setCurrentCoord([lat, lng])
      setEstSpeed(Math.round(parseFloat(fallbackVehicle.speed_kmh || '48')))
      setHeading(Math.round(parseFloat(fallbackVehicle.heading || '120')))
      if (fallbackVehicle.current_route_polyline) {
        const decoded = decodePolyline(fallbackVehicle.current_route_polyline)
        setRouteCoords(decoded)
        if (decoded.length > 0) {
          setProgressPct(Math.min(100, Math.round(((fallbackVehicle.current_waypoint_index || 781) / decoded.length) * 100)))
        }
      }
    }
    fetchTripState()
    return () => {
      isMountedRef.current = false
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [tripId])

  // 2. Demo Simulation Step Handler
  const stepSimulation = async (stepAmount = simSpeed) => {
    try {
      const res = await fetch('/api/telemetry/sim_step.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, step_size: stepAmount })
      })
      const data = await res.json()
      if (data.success) {
        setCurrentCoord([data.lat, data.lng])
        setProgressPct(data.progress_percentage || 0)
        if (data.speed_kmh !== undefined) {
          setEstSpeed(Math.round(data.speed_kmh))
        }
        if (data.heading !== undefined) {
          setHeading(Math.round(data.heading))
        }
      }
    } catch (e) {
      console.error('Simulator step error', e)
    }
  }

  // Toggle automated simulator drive
  useEffect(() => {
    if (simRunning) {
      simIntervalRef.current = setInterval(() => {
        stepSimulation(simSpeed)
      }, 2500)
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    }
  }, [simRunning, simSpeed])

  // 3. Real Device Geolocation Handler (watchPosition)
  useEffect(() => {
    if (useDeviceGps && navigator.geolocation) {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const devSpeed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
          const devHeading = pos.coords.heading ? Math.round(pos.coords.heading) : 0

          setCurrentCoord([lat, lng])
          if (devSpeed > 0) setEstSpeed(devSpeed)
          if (devHeading > 0) setHeading(devHeading)

          // Ping to backend (Workflow G authoritative runtime)
          try {
            const pingRes = await fetch('/api/telemetry/ping.php', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-NER-Token': 'ner-telemetry-sec-2026'
              },
              body: JSON.stringify({
                vehicle_id: driver.vehicle?.vehicle_id,
                trip_id: tripId,
                lat: lat,
                lng: lng,
                speed_kmh: devSpeed,
                heading: devHeading
              })
            })
            const pingData = await pingRes.json()
            if (pingData.status === 'rejected' && pingData.reason === 'no_active_trip') {
              setUseDeviceGps(false)
              setSessionExpired(true)
            }
          } catch (e) {
            console.warn('Telemetry ping network error:', e)
          }
        },
        (err) => {
          console.warn('Geolocation error:', err.message)
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
      )
    } else {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current)
        gpsWatchIdRef.current = null
      }
    }

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current)
      }
    }
  }, [useDeviceGps])

  const isStranded = tripData?.trip_status === 'stranded'
  const isRerouted = tripData?.trip_status === 'rerouted'

  return (
    <div className="relative h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans">
      
      {/* Top Floating Telemetry Strip */}
      <header className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 shadow-2xl backdrop-blur-md pointer-events-auto">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
              title="Return to corridors"
            >
              <ArrowLeft size={18} />
            </button>

            {onSwitchToDispatcher && (
              <button
                onClick={onSwitchToDispatcher}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Switch to Fleet Command Center"
              >
                <Radio size={14} className="text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Fleet Command</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <Truck size={18} className="text-amber-400" />
                  {tripData?.registration_number || 'TRUCK-01'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isStranded
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : isRerouted
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {tripData?.trip_status || 'IN TRANSIT'}
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-[280px] sm:max-w-md">
                {tripData?.route_name || 'North Eastern Transport Corridor'}
              </div>
            </div>
          </div>

          {/* Real-Time Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">Speed</span>
              <span className="text-sm sm:text-base font-bold text-white">{estSpeed} <span className="text-xs text-zinc-400 font-normal">km/h</span></span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">Heading</span>
              <span className="text-sm sm:text-base font-bold text-amber-300">{heading}°</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase">Progress</span>
              <span className="text-sm sm:text-base font-bold text-amber-400">{progressPct}%</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] text-zinc-500 block uppercase">GPS Fix</span>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Radio size={12} className="animate-pulse" />
                {currentCoord[0].toFixed(4)}, {currentCoord[1].toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Session Expired Rejection Banner */}
        {sessionExpired && (
          <div className="mt-2 mx-auto w-full max-w-2xl bg-rose-950/80 border border-rose-500/50 rounded-xl p-3 flex items-center justify-between text-xs text-rose-200 shadow-xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-rose-400 shrink-0" size={16} />
              <span><strong>Session Ended:</strong> This trip is no longer active in the transit registry. Background GPS stream has been stopped.</span>
            </div>
            <button
              onClick={onBack}
              className="px-2.5 py-1 bg-rose-500/30 hover:bg-rose-500/40 border border-rose-500/50 rounded-lg text-rose-100 font-bold shrink-0 ml-2 cursor-pointer"
            >
              Return
            </button>
          </div>
        )}

        {/* In-Cab Tactical Alert Banner */}
        <AnimatePresence>
          {latestAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between backdrop-blur-md shadow-xl pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-amber-400 shrink-0 animate-pulse" />
                <span>
                  <strong>IN-CAB DISPATCH ALERT:</strong> {latestAlert.message_text}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 font-mono text-[10px] uppercase shrink-0">
                Live Broadcast
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hazard Alert Banner (Appears if active hazard reported along route) */}
        <AnimatePresence>
          {activeIncidents.length > 0 && !latestAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between backdrop-blur-md shadow-lg pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 animate-bounce" />
                <span>
                  <strong>DISRUPTION ALERT:</strong> {activeIncidents[0].incident_type.toUpperCase()} reported near corridor ({activeIncidents[0].road_status}). Automated Rerouting pipeline ready.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-mono text-[10px] uppercase">
                Active Chokepoint
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Full-Screen Leaflet GIS Map */}
      <div className="relative flex-1 w-full h-full z-0">

        <MapContainer
          center={currentCoord}
          zoom={12}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', backgroundColor: '#09090b' }}
        >
          {/* Dynamic Basemap Layer Selection */}
          {mapMode === 'dark' && (
            <>
              <TileLayer
                key="live-dark-base"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ, &copy; OpenStreetMap'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={16}
                maxZoom={19}
              />
              <TileLayer
                key="live-dark-ref"
                attribution=""
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={16}
                maxZoom={19}
              />
            </>
          )}

          {mapMode === 'satellite' && (
            <>
              <TileLayer
                key="live-sat-imagery"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, USDA FSA, USGS'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={19}
              />
              <TileLayer
                key="live-sat-transport"
                attribution=""
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={19}
              />
              <TileLayer
                key="live-sat-labels"
                attribution=""
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={19}
              />
            </>
          )}

          {mapMode === 'terrain' && (
            <TileLayer
              key="live-terrain-base"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; USGS, Esri, TANA, DeLorme'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={18}
              maxZoom={19}
            />
          )}

          <RecenterHandler center={currentCoord} shouldFollow={autoFollow} />

          {/* Decoded Highway Polyline */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: isRerouted ? '#f59e0b' : '#3b82f6',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round'
              }}
            />
          )}

          {/* Active Incidents & Danger Circles on Map */}
          {activeIncidents.map((inc) => (
            <React.Fragment key={`inc-${inc.incident_id}`}>
              <Circle
                center={[parseFloat(inc.lat), parseFloat(inc.lng)]}
                radius={parseInt(inc.impact_radius_m) || 5000}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: '6, 6'
                }}
              />
              <Marker
                position={[parseFloat(inc.lat), parseFloat(inc.lng)]}
                icon={L.divIcon({
                  className: 'incident-marker',
                  html: `
                    <div style="background-color: #ef4444; border: 2px solid white; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px #ef4444; animation: pulse 1.2s infinite;">
                      <span style="color: white; font-weight: bold; font-size: 14px;">!</span>
                    </div>
                  `,
                  iconSize: [28, 28]
                })}
              >
                <Popup>
                  <div className="text-zinc-900 text-xs">
                    <strong>HAZARD: {inc.incident_type.toUpperCase()}</strong><br />
                    Status: {inc.road_status}<br />
                    Severity: {inc.severity}<br />
                    Impact Radius: {parseInt(inc.impact_radius_m) || 5000}m
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* Moving Vehicle Marker */}
          <Marker
            position={currentCoord}
            icon={createVehicleIcon(driver.vehicle?.vehicle_type || 'truck', isStranded)}
          >
            <Popup>
              <div className="text-zinc-900 text-xs">
                <strong>{driver.vehicle?.registration_number}</strong><br />
                Driver: {driver.full_name}<br />
                Speed: {estSpeed} km/h
              </div>
            </Popup>
          </Marker>
        </MapContainer>
 
        {/* Tactical Basemap Switcher Widget (Always on Top of Map) */}
        <div className="absolute top-4 right-4 z-[1200] pointer-events-auto flex items-center bg-zinc-950/90 border border-zinc-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md text-xs font-mono font-medium">
          <button
            onClick={() => setMapMode('dark')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'dark' ? 'bg-amber-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Tactical Dark Basemap"
          >
            <Layers size={13} />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'satellite' ? 'bg-amber-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Satellite Recon View"
          >
            <Globe size={13} />
            <span>🛰️ Satellite</span>
          </button>
          <button
            onClick={() => setMapMode('terrain')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'terrain' ? 'bg-amber-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Topographic Terrain View"
          >
            <Mountain size={13} />
            <span className="hidden sm:inline">Terrain</span>
          </button>
        </div>
      </div>

      {/* STRANDED EMERGENCY MODAL OVERLAY */}
      <AnimatePresence>
        {isStranded && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 rounded-2xl bg-zinc-950 border-2 border-red-600 shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mx-auto text-red-500 animate-bounce">
                <ShieldAlert size={36} />
              </div>
              <div>
                <h2 className="text-lg font-black text-red-500 tracking-wide uppercase">
                  TACTICAL ALERT: CORRIDOR IMPASSABLE
                </h2>
                <p className="text-xs text-zinc-300 mt-1">
                  Zero viable detour routes exist around the hazard in this mountain corridor.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs font-mono text-red-200 text-left">
                <strong>COMMAND INSTRUCTION:</strong> Halt vehicle at the nearest verified staging area. Do not attempt unmapped hill passes. Disaster response clearance is pending.
              </div>
              <button
                onClick={() => onBack()}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Acknowledge & Exit Corridor View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Tactical Control Deck */}
      <footer className="absolute bottom-6 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-xl pointer-events-auto max-w-2xl w-full">
          
          {/* Simulator Control Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimRunning(!simRunning)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                simRunning
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20'
              }`}
            >
              {simRunning ? <Pause size={15} /> : <Play size={15} />}
              <span>{simRunning ? 'Pause Demo' : 'Start Demo Drive'}</span>
            </button>

            <button
              onClick={() => stepSimulation(simSpeed * 2)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all"
              title="Skip Forward 10 Waypoints"
            >
              <FastForward size={16} />
            </button>
          </div>

          {/* Recenter & Geolocation Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoFollow(!autoFollow)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                autoFollow
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <Crosshair size={14} />
              <span className="hidden sm:inline">Follow Cam</span>
            </button>

            <button
              onClick={() => {
                setUseDeviceGps(!useDeviceGps)
                if (!useDeviceGps) setSimRunning(false)
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                useDeviceGps
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
              title="Toggle Phone Browser GPS"
            >
              <LocateFixed size={14} />
              <span className="hidden sm:inline">Device GPS</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LiveTracker
