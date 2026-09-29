"use client";

import { useCallback, useState, type Ref } from "react";

export type LiquidSpring = ReturnType<typeof createLiquidSpring>;

/** A small, interruptible spring. Values stay outside React's render cycle. */
export function createLiquidSpring(
  initial: number[],
  render: (values: number[], velocity: number[]) => void,
) {
  let values = [...initial];
  let target = [...initial];
  const velocity = initial.map(() => 0);
  let frame = 0;
  let previous = 0;
  let viscosity = 0.5;
  const atRest = () =>
    values.every((value, i) => value === target[i]) && velocity.every((speed) => speed === 0);
  const start = () => {
    if (frame) return;
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  };

  function step(dt: number) {
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    const stiffness = 440 - viscosity * 180;
    const damping = 23 + viscosity * 15;
    for (let n = 0; n < steps; n++) {
      values.forEach((value, i) => {
        velocity[i] += (stiffness * (target[i] - value) - damping * velocity[i]) * h;
        values[i] += velocity[i] * h;
      });
    }
  }

  function tick(time: number) {
    // A frame's timestamp can precede the input event that scheduled it. Integrating a
    // negative step would run the spring backwards; a small step still answers the touch.
    step(time > previous ? Math.min((time - previous) / 1000, 0.032) : 1 / 120);
    previous = time;
    const settled = values.every(
      (value, i) => Math.abs(target[i] - value) < 0.001 && Math.abs(velocity[i]) < 0.01,
    );
    if (settled) {
      values = [...target];
      velocity.fill(0);
    }
    frame = 0;
    render(values, velocity);
    // render may retarget the spring, e.g. when a travelling lens lands.
    if (!atRest()) start();
  }

  return {
    to(next: number[], immediate = false, feel = 0.5) {
      target = [...next];
      viscosity = Math.max(0, Math.min(1, feel));
      if (!immediate) {
        if (!atRest()) start();
        return;
      }
      cancelAnimationFrame(frame);
      frame = 0;
      values = [...target];
      velocity.fill(0);
      render(values, velocity);
    },
    /** Add velocity without moving the target, for a pop or a nudge. */
    kick(impulse: number[]) {
      impulse.forEach((speed, i) => {
        velocity[i] += speed;
      });
      start();
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}

/** iOS-style rubber band: follows the finger at first, then resists. */
export function rubberBand(distance: number, limit: number) {
  return Math.sign(distance) * limit * (1 - 1 / ((Math.abs(distance) * 0.55) / limit + 1));
}

export function motionReduced(node: HTMLElement) {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !!node.closest('[data-reduced-motion="true"]')
  );
}

export function liquidViscosity(node: HTMLElement) {
  const value = parseFloat(getComputedStyle(node).getPropertyValue("--liquid-viscosity"));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}

// Listen to OS preferences and explicit opt-outs, including ancestors of portals.
export function observeMotion(node: HTMLElement, update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  const observer = new MutationObserver(update);
  for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
    observer.observe(ancestor, { attributes: true, attributeFilter: ["data-reduced-motion"] });
  }
  return () => {
    media.removeEventListener("change", update);
    observer.disconnect();
  };
}

/** Add listeners and get one function that removes them all. */
export function listen(
  target: EventTarget,
  handlers: Record<string, (event: never) => void>,
  options?: AddEventListenerOptions,
) {
  const entries = Object.entries(handlers) as [string, EventListener][];
  entries.forEach(([type, handler]) => target.addEventListener(type, handler, options));
  return () =>
    entries.forEach(([type, handler]) => target.removeEventListener(type, handler, options));
}

/** Hand an element to a forwarded ref of either kind; returns the matching cleanup. */
export function assignRef<T>(ref: Ref<T> | undefined, element: T | null): () => void {
  if (typeof ref === "function") {
    const cleanup = ref(element);
    return () => {
      if (typeof cleanup === "function") cleanup();
      else ref(null);
    };
  }
  if (!ref) return () => {};
  ref.current = element;
  return () => {
    ref.current = null;
  };
}

/**
 * Compose forwarded refs, including React 19 ref cleanups. React calls a ref's cleanup instead
 * of passing it null, so the cleanup clears the node: effects on it then end when the element
 * goes, even if the component stays, as a menu panel does when Radix unmounts it on close.
 */
export function useLiquidElement<T extends HTMLElement>(forwardedRef?: Ref<T>) {
  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback(
    (element: T | null) => {
      setNode(element);
      const release = assignRef(forwardedRef, element);
      return () => {
        setNode(null);
        release();
      };
    },
    [forwardedRef],
  );
  return [node, ref] as const;
}
