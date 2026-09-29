"use client";

import { useEffect } from "react";
import {
  createLiquidSpring,
  listen,
  liquidViscosity,
  motionReduced,
  observeMotion,
} from "@/lib/motion";
import {
  activate,
  boxWithin,
  followBox,
  inactive,
  lensFrame,
  lensMask,
  mirror,
  nearestBox,
  pointerWithin,
  watched,
  type Box,
} from "@/lib/lens-parts";

export type LensOptions = {
  /** Matches the selected item by its ARIA state, e.g. `.liquid-tab[aria-selected="true"]`. */
  selected: string;
  /** Matches every item the lens can land on. */
  items: string;
  /** Let a press drag the lens across items and select where it is released. */
  scrub?: boolean;
};

/**
 * One continuous glass lens. It lifts while pressed or travelling, magnifies and tints what is
 * beneath it, then lands and frosts over the selection. The lens shows an inert, aria-hidden
 * copy of the list; the real items stay untouched for the primitive and assistive technology.
 */
export class LiquidLens {
  private readonly lens = document.createElement("span");
  private readonly optics = document.createElement("span");
  private readonly spring;
  private readonly masked = new Set<HTMLElement>();
  private readonly cleanups: (() => void)[] = [];
  private readonly resize = new ResizeObserver(() => this.measure());
  private elements: HTMLElement[] = [];
  private boxes = new Map<HTMLElement, Box>();
  private current: HTMLElement | null = null;
  private goal: Box = [0, 0, 0, 0];
  private follow: Box | null = null;
  private press: { id: number; x: number; y: number; dragging: boolean } | null = null;
  private travelling = false;
  private initialized = false;
  private reduced = false;
  private vertical = false;
  private border = [0, 0];

  constructor(
    private readonly node: HTMLElement,
    private readonly options: LensOptions,
  ) {
    this.lens.className = "liquid-lens";
    this.lens.setAttribute("aria-hidden", "true");
    this.lens.setAttribute("inert", "");
    this.lens.append(this.optics);
    node.append(this.lens);
    this.spring = createLiquidSpring([0, 0, 0, 0, 0], (values, velocity) =>
      this.render(values, velocity),
    );
    const mutations = new MutationObserver((records) => this.mutated(records));
    mutations.observe(node, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...watched, "class", "disabled", "aria-disabled"],
    });
    this.cleanups.push(
      () => mutations.disconnect(),
      () => this.resize.disconnect(),
      observeMotion(node, () => this.motionChanged()),
      listen(node, { pointerdown: this.down }, { passive: true }),
    );
    this.refresh();
    this.measure();
  }

  destroy() {
    this.spring.stop();
    this.endPress();
    this.unmask();
    this.cleanups.forEach((cleanup) => cleanup());
    this.lens.remove();
    delete this.node.dataset.liquidIndicator;
    delete this.node.dataset.liquidLens;
    this.node.style.removeProperty("--liquid-lift");
  }

  private render([x, y, w, h, lift]: number[], velocity: number[]) {
    this.landIfArrived(x, y);
    const speed = this.reduced ? 0 : velocity[this.vertical ? 1 : 0];
    const frame = lensFrame([x, y, w, h], lift, speed, this.vertical);
    const [left, top, width, height] = frame;
    const lifted = Math.max(0, lift);
    const [bx, by] = this.border;
    this.lens.style.width = `${width}px`;
    this.lens.style.height = `${height}px`;
    this.lens.style.transform = `translate(${left}px, ${top}px)`;
    this.optics.style.transformOrigin = `${x + w / 2 + bx}px ${y + h / 2 + by}px`;
    this.optics.style.transform = `translate(${-left - bx}px, ${-top - by}px) scale(${1 + 0.12 * lifted})`;
    this.node.style.setProperty("--liquid-lift", lifted.toFixed(3));
    const resting = this.isResting([x, y, w, h], lifted);
    this.node.dataset.liquidLens = resting ? "rest" : "active";
    if (resting) this.unmask();
    else this.mask(frame);
  }

  private landIfArrived(x: number, y: number) {
    if (!this.travelling || this.press) return;
    const reach = Math.max(6, this.goal[this.vertical ? 3 : 2] * 0.15);
    if (Math.hypot(x - this.goal[0], y - this.goal[1]) >= reach) return;
    this.travelling = false;
    this.commit();
  }

  private isResting(box: Box, lifted: number) {
    if (this.press || this.travelling || lifted >= 0.005) return false;
    return box.every((value, i) => Math.abs(value - this.goal[i]) < 0.5);
  }

  private commit(immediate = false) {
    const lifted = !this.reduced && (this.press !== null || this.travelling) ? 1 : 0;
    const feel = liquidViscosity(this.node);
    this.spring.to([...(this.follow ?? this.goal), lifted], immediate || this.reduced, feel);
  }

  // Hide the real items where the lens sits, so only the magnified copy shows through it.
  private mask(frame: Box) {
    for (const element of this.elements) {
      const image = lensMask(this.boxes.get(element) ?? [0, 0, 0, 0], frame, this.vertical);
      if (image) {
        element.style.setProperty("mask-image", image);
        element.style.setProperty("-webkit-mask-image", image);
        this.masked.add(element);
      } else if (this.masked.delete(element)) this.clearMask(element);
    }
  }

  private unmask() {
    this.masked.forEach((element) => this.clearMask(element));
    this.masked.clear();
  }

  private clearMask(element: HTMLElement) {
    element.style.removeProperty("mask-image");
    element.style.removeProperty("-webkit-mask-image");
  }

  private mutated(records: MutationRecord[]) {
    const relevant = records.filter((record) => !this.lens.contains(record.target));
    if (!relevant.length) return;
    this.refresh();
    this.measure();
  }

  private refresh() {
    const { node, lens, optics } = this;
    this.elements = [...node.querySelectorAll<HTMLElement>(this.options.items)].filter(
      (element) => !lens.contains(element),
    );
    this.resize.disconnect();
    [node, ...this.elements].forEach((element) => this.resize.observe(element));
    mirror(node, lens, optics);
  }

  private measure() {
    const { node } = this;
    this.reduced = motionReduced(node);
    const orientation = node.getAttribute("aria-orientation") ?? node.dataset.orientation;
    this.vertical = orientation === "vertical";
    this.border = [node.clientLeft, node.clientTop];
    this.boxes = new Map(this.elements.map((element) => [element, boxWithin(element, node)]));
    this.optics.style.width = `${node.offsetWidth}px`;
    this.optics.style.height = `${node.offsetHeight}px`;
    const next = this.elements.find((element) => element.matches(this.options.selected));
    if (next) this.place(next);
    else this.hide();
  }

  private place(next: HTMLElement) {
    const geometry = this.boxes.get(next)!;
    const moved = this.initialized && next !== this.current;
    const resized = geometry.some((value, i) => value !== this.goal[i]);
    if (this.initialized && !moved && !resized) return;
    this.goal = geometry;
    this.current = next;
    this.node.dataset.liquidIndicator = "true";
    if (!this.initialized || this.reduced) {
      this.travelling = false;
      this.commit(true);
    } else if (moved) {
      this.travelling = true;
      this.commit();
    } else this.commit(!this.press);
    this.initialized = true;
  }

  private hide() {
    this.current = null;
    this.initialized = false;
    this.travelling = false;
    delete this.node.dataset.liquidIndicator;
    delete this.node.dataset.liquidLens;
    this.unmask();
  }

  private motionChanged() {
    this.reduced = motionReduced(this.node);
    if (this.initialized) this.commit(true);
  }

  private enabled() {
    return this.elements.filter((element) => !element.matches(inactive));
  }

  private nearest(position: number) {
    const candidates = this.enabled();
    const boxes = candidates.map((element) => this.boxes.get(element)!);
    return candidates[nearestBox(boxes, position, this.vertical)] ?? null;
  }

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.reduced || !this.current) return;
    const item = event.target instanceof Element ? event.target.closest(this.options.items) : null;
    if (!(item instanceof HTMLElement) || !this.elements.includes(item) || item.matches(inactive))
      return;
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    this.node.dataset.liquidPressed = "true";
    this.stopTracking = listen(window, {
      pointermove: this.move,
      pointerup: this.up,
      pointercancel: this.up,
    });
    this.commit();
  };

  private stopTracking = () => {};

  private move = (event: PointerEvent) => {
    const { press } = this;
    if (!this.options.scrub || !press || event.pointerId !== press.id) return;
    const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (!press.dragging && distance < 6) return;
    press.dragging = true;
    const position = pointerWithin(event, this.node, this.border, this.vertical);
    const under = this.nearest(position);
    if (!under) return;
    const boxes = this.enabled().map((element) => this.boxes.get(element)!);
    this.follow = followBox(boxes, this.boxes.get(under)!, position, this.vertical);
    this.commit();
  };

  private up = (event: PointerEvent) => {
    if (!this.press || event.pointerId !== this.press.id) return;
    const landing = this.landingFor(event);
    this.endPress();
    if (landing && landing !== this.current) activate(landing, this.node);
    this.commit();
  };

  private landingFor(event: PointerEvent) {
    const { follow, vertical } = this;
    if (!this.press?.dragging || !follow || event.type !== "pointerup") return null;
    const axis = vertical ? 1 : 0;
    return this.nearest(follow[axis] + follow[axis + 2] / 2);
  }

  private endPress() {
    this.press = null;
    this.follow = null;
    delete this.node.dataset.liquidPressed;
    this.stopTracking();
  }
}

/** Attach a lens to a tab list or toolbar. */
export function useLiquidIndicator(node: HTMLElement | null, options: LensOptions) {
  const { selected, items, scrub } = options;
  useEffect(() => {
    if (!node) return;
    const lens = new LiquidLens(node, { selected, items, scrub });
    return () => lens.destroy();
  }, [node, selected, items, scrub]);
}
