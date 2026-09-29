"use client";

import { useEffect } from "react";
import { FusionLoop, LiquidFusion } from "@/lib/fusion";
import { listen, motionReduced } from "@/lib/motion";

const numberOf = (element: HTMLElement | null, property: string) =>
  parseFloat(element?.style.getPropertyValue(property) ?? "") || 0;

/**
 * How strongly a bar's capsule and the round button beside it fuse: pressing the button swells
 * it into the capsule, and lifting the lens on the capsule swells the capsule into the button.
 */
export function fusionStrength(buttonPress: number, capsuleLift: number) {
  return Math.max(0, Math.min(1, Math.max(buttonPress * 0.5, capsuleLift * 0.32)));
}

/**
 * The shell the tab bar and the toolbar share: a glass capsule of items with a round glass
 * button beside it. While either is pressed, a neck of glass joins them, as in iOS 26.
 * `paused` holds the neck back, as the tab bar does while it morphs into search.
 */
export class BarFusion {
  private readonly loop: FusionLoop;
  private readonly stop: () => void;

  constructor(
    root: HTMLElement,
    capsule: HTMLElement,
    button: HTMLElement,
    paused: () => boolean = () => false,
  ) {
    const fusion = new LiquidFusion(capsule, button, root);
    const lens = () =>
      capsule.matches("[data-liquid-indicator]")
        ? capsule
        : capsule.querySelector<HTMLElement>("[data-liquid-indicator]");
    const strength = () => {
      if (motionReduced(root) || paused()) return 0;
      return fusionStrength(numberOf(button, "--liquid-press"), numberOf(lens(), "--liquid-lift"));
    };
    // Repaint before each press, so the neck follows theme and material changes.
    this.stop = listen(root, { pointerdown: () => fusion.paint(capsule) }, { capture: true });
    this.loop = new FusionLoop(fusion, () => ({ strength: strength() })).wakeOn(capsule, button);
  }

  destroy() {
    this.stop();
    this.loop.destroy();
  }
}

/** Fuse a round button with the capsule matching `capsule` beside it, before or after. */
export function useBarFusion(button: HTMLElement | null, capsule: string) {
  useEffect(() => {
    const root = button?.parentElement;
    if (!button || !root) return;
    const beside = [button.previousElementSibling, button.nextElementSibling].find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.matches(capsule),
    );
    if (!beside) return;
    const fusion = new BarFusion(root, beside, button);
    return () => fusion.destroy();
  }, [button, capsule]);
}
