'use client'
import { useSyncExternalStore } from 'react'

// Shared clock store. A single requestAnimationFrame loop drives every mounted
// Clock, but subscribers are notified at ~20fps, not every frame. Age advances
// one year per year, so even the hero's fastest visible digit changes only a
// few times a second and a row clock's last digit every ~3s — sampling at 20fps
// is visually identical to 60fps while doing roughly a third of the render work
// and letting the page fall idle between ticks.
const THROTTLE_MS = 48

let now = Date.now()
const subs = new Set<() => void>()
let raf = 0
let lastEmit = 0

function loop(timestamp: number) {
  // Keep requesting a frame every rAF so timing stays smooth, but only advance
  // the store and notify subscribers once at least THROTTLE_MS has elapsed since
  // the last emission. `timestamp` is the rAF high-resolution time (same origin
  // as performance.now()), never Date.now(), so the cadence stays steady.
  if (timestamp - lastEmit >= THROTTLE_MS) {
    lastEmit = timestamp
    now = Date.now()
    for (const cb of subs) cb()
  }
  raf = requestAnimationFrame(loop)
}

function subscribe(cb: () => void) {
  subs.add(cb)
  if (subs.size === 1) {
    // First subscriber starts the single loop; lastEmit = 0 makes the very first
    // frame cross the throttle threshold so the clock begins ticking at once.
    lastEmit = 0
    raf = requestAnimationFrame(loop)
  }
  return () => {
    subs.delete(cb)
    if (subs.size === 0) cancelAnimationFrame(raf)
  }
}

const noop = () => () => {}

export function useNow(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribe : noop, () => now, () => 0)
}
