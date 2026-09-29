"use client"

import { useSyncExternalStore } from "react"

import { LIQUID_MODE_KEY as KEY } from "@/lib/liquid-mode-script"

/**
 * Liquid mode is a glass layer over the light or dark theme, so it lives beside
 * next-themes rather than in it: a `liquid` class on <html>, kept in localStorage.
 */
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) === "on"
  } catch {
    return false
  }
}

function apply(on: boolean) {
  document.documentElement.classList.toggle("liquid", on)
}

export function setLiquidMode(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "on")
    else localStorage.removeItem(KEY)
  } catch {}
  apply(on)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    apply(read())
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Whether liquid mode is on. False on the server and during hydration. */
export function useLiquidMode() {
  return useSyncExternalStore(subscribe, read, () => false)
}

