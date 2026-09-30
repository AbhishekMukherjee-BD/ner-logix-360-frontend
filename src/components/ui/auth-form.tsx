"use client"

import * as React from "react"
import { useState } from "react"
import { 
  ChevronLeft, 
  Truck, 
  ShieldAlert, 
  Lock, 
  Phone, 
  User, 
  FileText, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Radio
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface DriverData {
  driver_id: number
  full_name: string
  phone_number: string
  license_number: string
  vehicle?: {
    vehicle_id: number
    registration_number: string
    vehicle_type: 'truck' | 'ambulance' | 'relief_convoy'
    cargo_type: string
    status: string
  } | null
  active_trip?: any
}

interface AuthFormProps {
  onAuthSuccess: (driver: DriverData) => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Login form state
  const [loginPhone, setLoginPhone] = useState('+919123803476')
  const [loginPassword, setLoginPassword] = useState('nerlogix2026')

  // Register form state
  const [regFullName, setRegFullName] = useState('')
  const [regPhone, setRegPhone] = useState('+91')
  const [regLicense, setRegLicense] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPlate, setRegPlate] = useState('')
  const [regVehicleType, setRegVehicleType] = useState<'truck' | 'ambulance' | 'relief_convoy'>('truck')
  const [regCargo, setRegCargo] = useState('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: loginPhone.trim(),
          password: loginPassword
        })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Authentication failed.')
      }

      setSuccessMsg('Authentication verified. Loading operational dashboard...')
      setTimeout(() => {
        onAuthSuccess(data.driver)
      }, 700)
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error connecting to local API.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          phone_number: regPhone.trim(),
          license_number: regLicense.trim(),
          password: regPassword,
          registration_number: regPlate.trim().toUpperCase(),
          vehicle_type: regVehicleType,
          cargo_type: regCargo.trim()
        })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.')
      }

      setSuccessMsg('Account created successfully! Redirecting to command portal...')
      setTimeout(() => {
        onAuthSuccess(data.driver)
      }, 800)
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center py-12 px-4 selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden">
      <BackgroundDecoration />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl mx-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/80"
      >
        <Logo />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium uppercase tracking-wider mb-2">
            <Radio size={13} className="animate-pulse text-amber-400" />
            MDoNER Tactical Logistics Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Driver Mission Sign In' : 'Register Vehicle & Crew'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === 'login'
              ? 'Access real-time North East route safety & turn-by-turn guidance'
              : 'Register your vehicle to receive automated hazard & reroute dispatches'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800 mb-6 text-sm">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null) }}
            className={`py-2 px-4 rounded-lg font-medium transition-all ${
              mode === 'login'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Driver Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null) }}
            className={`py-2 px-4 rounded-lg font-medium transition-all ${
              mode === 'register'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            New Fleet Onboard
          </button>
        </div>

        {/* Alert feedback */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                WhatsApp Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="+919123803476"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-mono text-sm"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Must match your emergency dispatch WhatsApp number</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <span className="text-[11px] text-amber-500/80 font-mono">Default: nerlogix2026</span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all text-sm"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Authenticating Command Link...' : 'Sign In & Select Route'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Tenzing Norbu"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  WhatsApp Phone
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+919434011234"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Driving License No.
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="SK-01-2021-0099"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-2">
                Vehicle Assignment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    value={regPlate}
                    onChange={(e) => setRegPlate(e.target.value)}
                    placeholder="AS-01-EC-9988"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Vehicle Classification</label>
                  <select
                    value={regVehicleType}
                    onChange={(e: any) => setRegVehicleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="truck">Heavy Commercial Freight (Truck)</option>
                    <option value="ambulance">Emergency Medical Ambulance</option>
                    <option value="relief_convoy">NDRF / SDRF Relief Convoy</option>
                  </select>
                </div>
              </div>

              <div className="mt-2.5">
                <label className="block text-xs text-zinc-400 mb-1">Payload / Cargo Description</label>
                <div className="relative">
                  <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={regCargo}
                    onChange={(e) => setRegCargo(e.target.value)}
                    placeholder="e.g. Life-saving insulin, Oxygen canisters, Grain supplies"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/70 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-3">
              {loading ? 'Registering Vehicle in Fleet...' : 'Complete Registration & Enter'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
          Designed for PS 26002 • Ministry of Development of North Eastern Region (MDoNER)
        </div>
      </motion.div>
    </div>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => (
  <button
    className={`relative z-0 flex items-center justify-center gap-2 rounded-lg 
    bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-5 py-2.5 font-semibold text-zinc-950 
    shadow-lg shadow-amber-500/20 transition-all duration-300 hover:scale-[1.01] hover:shadow-amber-500/30 
    active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
)

const Logo: React.FC = () => (
  <div className="mb-4 flex items-center justify-center gap-3">
    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-md shadow-amber-500/30">
      <Truck size={24} />
    </div>
    <div>
      <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
        NER-LogiX <span className="text-amber-400 font-extrabold">360</span>
      </div>
      <div className="text-[10px] text-zinc-400 tracking-wider uppercase font-mono">
        North Eastern Logistics Intelligence
      </div>
    </div>
  </div>
)

const BackgroundDecoration: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-25"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='1.5' stroke='rgb(245 158 11 / 0.35)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 30%, rgba(9,9,11,0.2) 0%, rgba(9,9,11,0.95) 75%)",
        }}
      />
    </div>
  )
}

export default AuthForm
