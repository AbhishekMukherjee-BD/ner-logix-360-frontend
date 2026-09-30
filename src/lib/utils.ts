import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return []
  const trimmed = encoded.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => [parseFloat(p[0]), parseFloat(p[1])])
      }
    } catch {
      // Fall through to standard algorithm
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
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng

    points.push([lat * 1e-5, lng * 1e-5])
  }
  return points
}

export function arePolylinesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  const trimA = a.trim()
  const trimB = b.trim()
  if (trimA === trimB) return true
  if (trimA.length !== trimB.length) return false
  return trimA.slice(0, 40) === trimB.slice(0, 40) && trimA.slice(-40) === trimB.slice(-40)
}
