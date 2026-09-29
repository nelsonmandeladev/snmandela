"use client";

import { useEffect } from "react";
import { listen } from "@/lib/motion";

const steps: Record<"horizontal" | "vertical", Partial<Record<string, number>>> = {
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
  vertical: { ArrowDown: 1, ArrowUp: -1 },
};

/**
 * Where a key moves focus among `count` items from the one at `index`, or null for other keys.
 * Arrows along the orientation step and wrap, mirrored right to left; Home and End jump.
 */
export function rovingIndex(
  key: string,
  index: number,
  count: number,
  vertical: boolean,
  rtl = false,
) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = steps[vertical ? "vertical" : "horizontal"][key];
  if (!step) return null;
  const direction = rtl && !vertical ? -step : step;
  return (index + direction + count) % count;
}

const modified = (event: KeyboardEvent) =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

/**
 * One tab stop over a set of controls, as a toolbar has: Tab reaches the last focused item and
 * arrow keys move between items. Items are looked up on every change, so they can come and go.
 * Disabled items are skipped, and the inert copies inside a lens are never items.
 */
export class RovingFocus {
  private current: HTMLElement | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly root: HTMLElement,
    private readonly selector: string,
  ) {
    const changes = new MutationObserver(() => this.sync());
    changes.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
    this.cleanups.push(
      () => changes.disconnect(),
      listen(root, { keydown: this.keydown, focusin: this.focusin }),
    );
    this.sync();
  }

  destroy() {
    this.cleanups.forEach((cleanup) => cleanup());
    for (const item of this.items()) item.removeAttribute("tabindex");
  }

  private items() {
    return [...this.root.querySelectorAll<HTMLElement>(this.selector)].filter(
      (item) => !item.matches(":disabled") && !item.closest(".liquid-lens"),
    );
  }

  // Exactly one item takes Tab: the last one focused, or else the first.
  private sync() {
    const items = this.items();
    if (!this.current || !items.includes(this.current)) this.current = items[0] ?? null;
    for (const item of items) item.tabIndex = item === this.current ? 0 : -1;
  }

  private axis() {
    const vertical = this.root.getAttribute("aria-orientation") === "vertical";
    const rtl = this.root.closest("[dir]")?.getAttribute("dir") === "rtl";
    return [vertical, rtl] as const;
  }

  private focusin = (event: FocusEvent) => {
    const item = this.items().find((candidate) => candidate === event.target);
    if (!item) return;
    this.current = item;
    this.sync();
  };

  private keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || modified(event)) return;
    const items = this.items();
    const index = items.findIndex((item) => item === event.target);
    if (index === -1) return;
    const next = rovingIndex(event.key, index, items.length, ...this.axis());
    if (next === null) return;
    event.preventDefault();
    items[next].focus();
  };
}

/** Give `root` a single tab stop over the items matching `selector`. */
export function useRovingFocus(root: HTMLElement | null, selector: string) {
  useEffect(() => {
    if (!root) return;
    const focus = new RovingFocus(root, selector);
    return () => focus.destroy();
  }, [root, selector]);
}
