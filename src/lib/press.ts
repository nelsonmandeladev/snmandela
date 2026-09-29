"use client";

import { useEffect } from "react";
import {
  createLiquidSpring,
  listen,
  liquidViscosity,
  motionReduced,
  observeMotion,
  rubberBand,
} from "@/lib/motion";

const properties = [
  "--liquid-x",
  "--liquid-y",
  "--liquid-scale-x",
  "--liquid-scale-y",
  "--liquid-press",
];
const units = ["px", "px", "", "", ""];
// offset x/y, scale x/y, press
const rest = [0, 0, 1, 1, 0];
const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));
// Typing and caret placement in a field inside the glass are not presses of the glass.
const inField = (event: Event) =>
  event.target instanceof Element && !!event.target.closest("input, textarea, [contenteditable]");

/** Small controls grow more than large ones, as on iOS. */
export function swellFor(width: number, height: number) {
  return 1 + Math.max(0.04, Math.min(0.18, 8 / Math.sqrt(Math.max(1, width * height))));
}

/** Scale that swells the glass and stretches it along a rubber-banded drag. */
export function pressedShape(width: number, height: number, drag: number[]) {
  const swell = swellFor(width, height);
  const dx = rubberBand(drag[0], 10);
  const dy = rubberBand(drag[1], 7);
  const sx = Math.abs(dx) / Math.max(1, width);
  const sy = Math.abs(dy) / Math.max(1, height);
  return [dx, dy, swell * (1 + sx * 0.6 - sy * 0.25), swell * (1 + sy * 0.6 - sx * 0.25)];
}

/**
 * Hover attraction, and a press that swells the glass toward the finger and whitens it.
 * Native listeners decorate the element without replacing the primitive's or consumer handlers.
 */
export class LiquidPress {
  private hover: number[] | null = null;
  private press: { id: number; x: number; y: number } | null = null;
  private drag = [0, 0];
  private keyboard = false;
  private readonly spring;
  private readonly cleanups: (() => void)[] = [];

  constructor(private readonly node: HTMLElement) {
    this.spring = createLiquidSpring(rest, (values) =>
      values.forEach((value, i) => node.style.setProperty(properties[i], `${value}${units[i]}`)),
    );
    const disabledObserver = new MutationObserver(() => this.update());
    disabledObserver.observe(node, {
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled"],
    });
    this.cleanups.push(
      () => disabledObserver.disconnect(),
      observeMotion(node, () => this.update()),
      listen(node, { pointermove: this.hoverMove, pointerdown: this.down }, { passive: true }),
      listen(node, {
        pointerleave: this.leave,
        keydown: this.keyDown,
        keyup: this.keyUp,
        blur: this.reset,
      }),
      listen(window, { blur: this.reset }),
    );
  }

  /** A springy pop, used when the content morphs. */
  pop() {
    this.spring.kick([0, 0, 2.4, 2.4, 0]);
  }

  destroy() {
    this.spring.stop();
    this.stopTracking();
    this.cleanups.forEach((cleanup) => cleanup());
    properties.forEach((property) => this.node.style.removeProperty(property));
  }

  private disabled() {
    return this.node.matches(':disabled, [aria-disabled="true"]');
  }

  private target() {
    if (this.press || this.keyboard) {
      const shape = pressedShape(this.node.offsetWidth, this.node.offsetHeight, this.drag);
      return [...shape, 1];
    }
    if (this.hover) return [this.hover[0] * 2, this.hover[1] * 1.5, 1.012, 1.018, 0];
    return rest;
  }

  private update() {
    const still = motionReduced(this.node) || this.disabled();
    this.spring.to(still ? rest : this.target(), still, liquidViscosity(this.node));
  }

  private hoverMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const box = this.node.getBoundingClientRect();
    this.hover = [
      clampUnit(((event.clientX - box.left) / box.width) * 2 - 1),
      clampUnit(((event.clientY - box.top) / box.height) * 2 - 1),
    ];
    if (!this.press) this.update();
  };

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.disabled() || inField(event)) return;
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.drag = [0, 0];
    this.stopTracking();
    this.stopTracking = listen(window, {
      pointermove: this.track,
      pointerup: this.release,
      pointercancel: this.release,
    });
    this.update();
  };

  private stopTracking = () => {};

  private track = (event: PointerEvent) => {
    if (!this.press || event.pointerId !== this.press.id) return;
    this.drag = [event.clientX - this.press.x, event.clientY - this.press.y];
    this.update();
  };

  private release = (event?: Event) => {
    if (event instanceof PointerEvent && this.press && event.pointerId !== this.press.id) return;
    this.press = null;
    this.drag = [0, 0];
    this.stopTracking();
    this.update();
  };

  private leave = () => {
    this.hover = null;
    if (!this.press) this.update();
  };

  private keyDown = (event: KeyboardEvent) => {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.repeat || this.disabled() || inField(event)) return;
    this.keyboard = true;
    this.update();
  };

  private keyUp = (event: KeyboardEvent) => {
    if (event.key !== " " && event.key !== "Enter") return;
    this.keyboard = false;
    this.update();
  };

  private reset = () => {
    this.keyboard = false;
    this.hover = null;
    this.release();
  };
}

/** Content morph: springs the width from the old size and lets the new content condense in. */
export class LiquidMorph {
  private width: number;
  private morphing = false;
  private flip = false;
  private readonly sizer;
  private readonly content: MutationObserver;
  private readonly sizes: ResizeObserver;

  constructor(
    private readonly node: HTMLElement,
    private readonly pop: () => void,
  ) {
    this.width = node.offsetWidth;
    this.sizer = createLiquidSpring([this.width], ([value]) => this.resize(value));
    this.content = new MutationObserver(() => this.morph());
    this.content.observe(node, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-liquid-variant", "aria-pressed"],
    });
    this.sizes = new ResizeObserver(() => {
      if (!this.morphing) this.width = node.offsetWidth;
    });
    this.sizes.observe(node);
  }

  destroy() {
    this.sizer.stop();
    this.content.disconnect();
    this.sizes.disconnect();
    if (this.morphing) this.node.style.removeProperty("width");
    delete this.node.dataset.liquidMorph;
    delete this.node.dataset.liquidMorphing;
  }

  private resize(value: number) {
    if (!this.morphing) return;
    this.node.style.width = `${value}px`;
    if (value !== this.width) return;
    this.morphing = false;
    this.node.style.removeProperty("width");
    delete this.node.dataset.liquidMorphing;
  }

  private morph() {
    const from = this.morphing ? this.node.offsetWidth : this.width;
    if (this.morphing) {
      this.sizer.stop();
      this.morphing = false;
      this.node.style.removeProperty("width");
    }
    // A consumer-owned inline width wins.
    if (this.node.style.width) return;
    this.width = this.node.offsetWidth;
    if (motionReduced(this.node) || this.node.matches(":disabled, [aria-disabled='true']")) return;
    this.flip = !this.flip;
    this.node.dataset.liquidMorph = this.flip ? "a" : "b";
    this.pop();
    if (Math.abs(this.width - from) < 1) return;
    this.morphing = true;
    this.node.dataset.liquidMorphing = "";
    this.sizer.to([from], true);
    this.sizer.to([this.width], false, liquidViscosity(this.node));
  }
}

/** Press, hover attraction, and content morph for one glass control. */
export function useLiquidInteraction(node: HTMLElement | null) {
  useEffect(() => {
    if (!node) return;
    const press = new LiquidPress(node);
    const morph = new LiquidMorph(node, () => press.pop());
    return () => {
      morph.destroy();
      press.destroy();
    };
  }, [node]);
}
