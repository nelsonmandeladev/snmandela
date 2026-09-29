import { FusionLoop, LiquidFusion, type FusionSample } from "@/lib/fusion";
import { listen, motionReduced } from "@/lib/motion";

export type Anchor = { width: number; height: number; align: "start" | "center" | "end" };
export type Press = { id: number; x: number; y: number; moved: boolean };
type Rect = Pick<DOMRect, "left" | "top" | "width" | "height">;

/** Like iOS, a menu hugs the screen edge its trigger is nearest to. */
export function measureAnchor(element: HTMLElement, viewportWidth = window.innerWidth): Anchor {
  const box = element.getBoundingClientRect();
  const center = box.left + box.width / 2;
  const third = viewportWidth / 3;
  const align = center < third ? "start" : center > third * 2 ? "end" : "center";
  return { width: element.offsetWidth, height: element.offsetHeight, align };
}

export function sameAnchor(a: Anchor | null, b: Anchor) {
  return !!a && a.width === b.width && a.height === b.height && a.align === b.align;
}

/** Corner radius in px, from a computed `border-*-radius` value. */
export function radiusOf(value: string, box: Rect) {
  const raw = value.endsWith("%")
    ? (parseFloat(value) / 100) * Math.min(box.width, box.height)
    : parseFloat(value) || 0;
  return Math.min(raw, box.width / 2, box.height / 2);
}

/**
 * CSS variables for the morph between a trigger and its menu panel: the trigger's own shape,
 * then a round droplet part way between the two, then the panel.
 */
export function morphVariables(from: Rect, panel: Rect, radius: number) {
  const { width, height } = panel;
  const sx = Math.max(0.05, Math.min(1, from.width / width));
  const sy = Math.max(0.05, Math.min(1, from.height / height));
  const dx = from.left + from.width / 2 - (panel.left + width / 2);
  const dy = from.top + from.height / 2 - (panel.top + height / 2);
  const droplet = Math.max(from.width, from.height, Math.sqrt(width * height) * 0.6);
  const diameter = Math.min(Math.max(width, height), droplet);
  return {
    x: `${dx}px`,
    y: `${dy}px`,
    "scale-x": String(sx),
    "scale-y": String(sy),
    // Unscaled radii that render as the trigger's own corners at the trigger's size.
    radius: `${radius / sx}px / ${radius / sy}px`,
    "mid-x": `${dx * 0.45}px`,
    "mid-y": `${dy * 0.45}px`,
    "mid-scale-x": String(Math.min(1, diameter / width)),
    "mid-scale-y": String(Math.min(1, diameter / height)),
  };
}

const FOLD_MS = 320;
const smooth = (from: number, to: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
};

/**
 * The neck between a folding menu and its trigger at `t` (0–1 of the fold): it forms as the
 * droplet pulls away from the panel's place, thins, and is gone once the drop has landed.
 */
export function foldNeck(t: number, opacity = 1): FusionSample {
  const strength = 0.5 * smooth(0.12, 0.42, t) * (1 - smooth(0.78, 1, t));
  return { strength, opacity, hold: t < 1 };
}

/** Progress of the running fold keyframes, so the neck keeps pace with them at any speed. */
function foldProgress(node: HTMLElement) {
  const fold = node
    .getAnimations?.()
    .find((animation) => (animation as CSSAnimation).animationName === "liquid-menu-fold");
  return fold?.effect?.getComputedTiming().progress ?? null;
}

/**
 * Drives the unfold and fold of one menu surface relative to its anchor element. The surface's
 * `data-liquid-state` says when it closes; the liquid menu sets it with the primitive's state.
 */
export class MenuMorph {
  private frame = 0;
  private neck: FusionLoop | null = null;
  private readonly covered: HTMLElement | null;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly node: HTMLElement,
    private readonly anchor: () => HTMLElement | null,
    covering: boolean,
  ) {
    // Wait for the primitive to place the panel and resolve collisions before measuring it.
    this.frame = requestAnimationFrame(() => {
      this.frame = requestAnimationFrame(() => {
        this.measure();
        node.dataset.liquidMorph = "ready";
      });
    });
    this.covered = covering ? anchor() : null;
    if (this.covered) this.covered.dataset.liquidCovered = "";
    const closing = new MutationObserver(() => {
      if (node.dataset.liquidState !== "closed") return;
      this.measure();
      this.fold();
    });
    closing.observe(node, { attributes: true, attributeFilter: ["data-liquid-state"] });
    this.cleanups.push(
      () => closing.disconnect(),
      listen(window, { resize: this.measure }),
      listen(window, { scroll: this.measure }, { capture: true }),
    );
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.neck?.destroy();
    this.cleanups.forEach((cleanup) => cleanup());
    const closed = this.node.dataset.liquidState === "closed";
    delete this.node.dataset.liquidMorph;
    if (this.covered) delete this.covered.dataset.liquidCovered;
    if (closed) landIn(this.anchor());
  }

  // The drop is drawn back into its trigger through a narrowing neck.
  private fold() {
    const anchor = this.anchor();
    if (!anchor || this.neck || motionReduced(this.node)) return;
    const fusion = new LiquidFusion(this.node, anchor);
    fusion.paint(this.node);
    const start = performance.now();
    const progress = () => foldProgress(this.node) ?? (performance.now() - start) / FOLD_MS;
    const opacity = () => Number(getComputedStyle(this.node).opacity) || 0;
    this.neck = new FusionLoop(fusion, () => foldNeck(progress(), opacity()));
    this.neck.wake();
  }

  private measure = () => {
    const anchor = this.anchor();
    // The primitive positions a wrapper around the panel, which may itself still be springing.
    const wrapper = this.node.parentElement?.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = this.node;
    if (!anchor || !wrapper || !width || !height) return;
    const from = anchor.getBoundingClientRect();
    const radius = radiusOf(getComputedStyle(anchor).borderTopLeftRadius, from);
    const panel = { left: wrapper.left, top: wrapper.top, width, height };
    for (const [name, value] of Object.entries(morphVariables(from, panel, radius))) {
      this.node.style.setProperty(`--liquid-menu-${name}`, value);
    }
  };
}

/** The droplet lands in its trigger with a small bulge. */
function landIn(anchor: HTMLElement | null) {
  if (!anchor || motionReduced(anchor)) return;
  anchor.animate?.(
    [
      { scale: "1" },
      { scale: "1.1 1.14", offset: 0.35 },
      { scale: ".97 .95", offset: 0.7 },
      { scale: "1" },
    ],
    { duration: 420, easing: "ease-out" },
  );
}

/** Placement that covers the trigger, unless the consumer chose their own offset or alignment. */
export function coverPlacement(
  anchor: Anchor | null,
  side: "top" | "right" | "bottom" | "left",
  chosen: { sideOffset?: number; align?: Anchor["align"] },
) {
  const across = side === "left" || side === "right";
  const cover = anchor ? -(across ? anchor.width : anchor.height) : 10;
  const align = anchor && !across ? anchor.align : "center";
  return { sideOffset: chosen.sideOffset ?? cover, align: chosen.align ?? align };
}

/**
 * State shared by one menu's trigger and content: which element opened it, and the press that
 * did. Radix opens on pointerdown, so the release lands on whatever the menu put under it.
 */
export class MenuSession {
  private press: Press | null = null;
  private trigger: HTMLElement | null = null;

  anchor() {
    return this.trigger;
  }

  /** Track presses on the trigger. `onPress` runs before Radix opens the menu. */
  attach(node: HTMLElement, onPress: () => void) {
    this.trigger = node;
    let stop = () => {};
    const track = (event: PointerEvent) => {
      const press = this.press;
      if (press?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press.moved = true;
    };
    const release = (event: PointerEvent) => {
      const pressed = this.press;
      if (pressed?.id !== event.pointerId) return;
      stop();
      // Keep the guard for the click that follows a touch release, then drop it.
      setTimeout(() => {
        if (this.press === pressed) this.press = null;
      }, 600);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      onPress();
      this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      stop();
      const handlers = { pointermove: track, pointerup: release, pointercancel: release };
      stop = listen(window, handlers, { capture: true });
    };
    const key = (event: KeyboardEvent) => {
      if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
      this.press = null;
      onPress();
    };
    const unlisten = listen(node, { pointerdown: down, keydown: key });
    return () => {
      unlisten();
      stop();
      if (this.trigger === node) this.trigger = null;
    };
  }

  /**
   * Radix selects an item on pointerup even when the press began on the trigger. A menu that
   * opens over its trigger would then pick whatever landed under a still finger or cursor.
   * Pressing the trigger and dragging onto an item still selects it, as on iOS. Base UI selects
   * on mouseup rather than pointerup, so that release is held back too.
   */
  guard(content: HTMLElement) {
    const still = (event: MouseEvent) => {
      const press = this.press;
      if (!press || press.moved) return;
      if (event instanceof PointerEvent && event.pointerId !== press.id) return;
      event.stopPropagation();
      if (event.type !== "click") return;
      event.preventDefault();
      this.press = null;
    };
    // A fresh press inside the menu is a deliberate choice.
    const fresh = () => {
      this.press = null;
    };
    const handlers = { pointerdown: fresh, pointerup: still, mouseup: still, click: still };
    return listen(content, handlers, { capture: true });
  }
}
