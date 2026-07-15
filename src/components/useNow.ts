'use client'
import { useSyncExternalStore } from 'react'

let now = Date.now()
const subs = new Set<() => void>()
let raf = 0

function loop() {
  now = Date.now()
  for (const cb of subs) cb()
  raf = requestAnimationFrame(loop)
}

function subscribe(cb: () => void) {
  subs.add(cb)
  if (subs.size === 1) raf = requestAnimationFrame(loop)
  return () => {
    subs.delete(cb)
    if (subs.size === 0) cancelAnimationFrame(raf)
  }
}

const noop = () => () => {}

export function useNow(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribe : noop, () => now, () => 0)
}
