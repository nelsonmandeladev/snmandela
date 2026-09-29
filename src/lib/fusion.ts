import { listen } from "@/lib/motion";

// The neck that forms where two separate glass surfaces flow into each other: the tab bar
// bulging into its search button, or a closing menu drawn back into its trigger.

export type Point = [number, number];
/** A round end of a surface: center x, center y, radius. */
export type Cap = [number, number, number];
type Rect = Pick<DOMRect, "left" | "top" | "width" | "height">;

const HALF_PI = Math.PI / 2;
const at = ([x, y]: Point, angle: number, length: number): Point => [
  x + length * Math.cos(angle),
  y + length * Math.sin(angle),
];

/**
 * The rounded corner (or end) of a surface nearest `toward`: a circle of the surface's corner
 * radius, as close to `toward` as the surface allows. A capsule's ends are circles as tall as
 * it is; a panel's flat edge is met by a circle the size of its corners, just inside it.
 */
export function capOf(rect: Rect, toward: Point, corner = Infinity): Cap {
  const radius = Math.max(0, Math.min(corner, rect.width / 2, rect.height / 2));
  const clamp = (value: number, start: number, size: number) =>
    Math.max(start + radius, Math.min(start + size - radius, value));
  return [clamp(toward[0], rect.left, rect.width), clamp(toward[1], rect.top, rect.height), radius];
}

/** Left, top, right, bottom of two caps together. */
export function capBounds([ax, ay, ra]: Cap, [bx, by, rb]: Cap) {
  return [
    Math.min(ax - ra, bx - rb),
    Math.min(ay - ra, by - rb),
    Math.max(ax + ra, bx + rb),
    Math.max(ay + ra, by + rb),
  ] as const;
}

/**
 * Spread of the neck, clamped to 0–1. It narrows as one circle sinks into the other, since a
 * deep overlap leaves only a sliver of neck and the drop reads as merging, and it is 0 once
 * one circle contains the other.
 */
export function spreadAt(d: number, ra: number, rb: number, spread: number) {
  const inner = Math.abs(ra - rb);
  const depth = d >= ra + rb ? 1 : (d - inner) / Math.max(1e-6, ra + rb - inner);
  return Math.max(0, Math.min(1, spread)) * Math.max(0, Math.min(1, depth * 1.4));
}

export type Neck = {
  /** Closed outline of the neck, for a clip path. */
  outline: string;
  /** Its two free edges, where the glass rim catches the light. */
  rims: string;
};

/**
 * The neck between two circles, after the classic metaball construction: two curves leave the
 * first circle, meet the second tangentially, and close along each circle's near side, so the
 * neck fills only the space between the surfaces and never tints them twice. `spread` (0–1)
 * sets how far round each circle the neck reaches; 0 is no neck. Coordinates are written
 * relative to `origin`. Returns null when the circles are too far apart or one contains the other.
 */
export function neckBetween(a: Cap, b: Cap, spread: number, origin: Point = [0, 0]): Neck | null {
  const [ax, ay, ra] = a;
  const [bx, by, rb] = b;
  const d = Math.hypot(bx - ax, by - ay);
  const overlap = d < ra + rb;
  const v = spreadAt(d, ra, rb, spread);
  if (v < 0.01 || !ra || !rb || d > ra + rb * 2.5) return null;
  const ua = overlap ? Math.acos((ra * ra + d * d - rb * rb) / (2 * ra * d)) : 0;
  const ub = overlap ? Math.acos((rb * rb + d * d - ra * ra) / (2 * rb * d)) : 0;
  const toward = Math.atan2(by - ay, bx - ax);
  const maxSpread = Math.acos((ra - rb) / d);
  const halfA = ua + (maxSpread - ua) * v;
  const halfB = ub + (Math.PI - ub - maxSpread) * v;
  const p1 = at([ax, ay], toward + halfA, ra);
  const p2 = at([ax, ay], toward - halfA, ra);
  const p3 = at([bx, by], toward + Math.PI - halfB, rb);
  const p4 = at([bx, by], toward + Math.PI + halfB, rb);
  const reach = Math.min(v * 2.4, Math.hypot(p3[0] - p1[0], p3[1] - p1[1]) / (ra + rb));
  const handle = reach * Math.min(1, (d * 2) / (ra + rb));
  const h1 = at(p1, toward + halfA - HALF_PI, ra * handle);
  const h2 = at(p2, toward - halfA + HALF_PI, ra * handle);
  const h3 = at(p3, toward + Math.PI - halfB + HALF_PI, rb * handle);
  const h4 = at(p4, toward + Math.PI + halfB - HALF_PI, rb * handle);
  const pt = ([x, y]: Point) => `${(x - origin[0]).toFixed(2)} ${(y - origin[1]).toFixed(2)}`;
  // Along each circle's near side, in the direction of increasing angle (clockwise on screen).
  const arc = (r: number, half: number, to: Point) =>
    `A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${half * 2 > Math.PI ? 1 : 0} 1 ${pt(to)}`;
  const lower = `M ${pt(p1)} C ${pt(h1)} ${pt(h3)} ${pt(p3)}`;
  const upper = `C ${pt(h4)} ${pt(h2)} ${pt(p2)}`;
  return {
    outline: `${lower} ${arc(rb, halfB, p4)} ${upper} ${arc(ra, halfA, p1)} Z`,
    // Overlapping, the edges run over the surfaces' own rims.
    rims: overlap ? "" : `${lower} M ${pt(p4)} ${upper}`,
  };
}

const svgNS = "http://www.w3.org/2000/svg";

/**
 * A computed `border-*-radius` in px for a box, including the `calc(a% + bpx)` values that
 * animations produce and separate horizontal and vertical radii. Returns the smaller radius.
 */
export function parseRadius(value: string, width: number, height: number) {
  const parts = value.match(/calc\([^)]*\)|\S+/g) ?? [];
  if (!parts.length) return 0;
  const pair = parts.length > 1 ? parts.slice(0, 2) : [parts[0], parts[0]];
  const [rx, ry] = pair.map((part = "", axis) => {
    let total = 0;
    for (const [, sign, number, unit] of part.matchAll(/([+-]\s*)?(\d*\.?\d+(?:e-?\d+)?)(px|%)/g)) {
      const size = unit === "%" ? (Number(number) / 100) * (axis ? height : width) : Number(number);
      total += sign?.trim() === "-" ? -size : size;
    }
    return total;
  });
  return Math.max(0, Math.min(rx, ry));
}

/** An element's corner radius as drawn: its computed radius, scaled with any transform. */
function drawnRadius(element: HTMLElement, box: Rect) {
  const width = element.offsetWidth || box.width;
  const height = element.offsetHeight || box.height;
  const radius = parseRadius(getComputedStyle(element).borderTopLeftRadius, width, height);
  return radius * Math.min(box.width / (width || 1), box.height / (height || 1));
}

/**
 * Draws the neck between two surfaces as a glass element clipped to the neck's outline. The
 * element lives in `container` (positioned), or in a fixed layer over the viewport when the
 * surfaces are in different stacking contexts, such as a portaled menu and its trigger.
 */
export class LiquidFusion {
  readonly element = document.createElement("span");
  private readonly rim = document.createElementNS(svgNS, "path");

  constructor(
    private readonly a: HTMLElement,
    private readonly b: HTMLElement,
    private readonly container: HTMLElement | null = null,
  ) {
    this.element.className = "liquid-fusion";
    this.element.setAttribute("aria-hidden", "true");
    this.element.hidden = true;
    if (!container) this.element.dataset.layer = "fixed";
    const svg = document.createElementNS(svgNS, "svg");
    svg.append(this.rim);
    this.element.append(svg);
    (container ?? document.body).append(this.element);
  }

  /** Match the glass of `source`: its fill and its blur. A refraction map fits only its owner. */
  paint(source: HTMLElement) {
    const style = getComputedStyle(source);
    const backdrop = (style.backdropFilter || "none").replace(/url\([^)]*\)\s*/g, "").trim();
    this.element.style.backgroundColor = style.backgroundColor;
    this.element.style.setProperty("backdrop-filter", backdrop || "none");
    this.element.style.setProperty("-webkit-backdrop-filter", backdrop || "none");
  }

  /** Redraw at `strength` (0–1). Returns whether a neck is showing. */
  draw(strength: number, opacity = 1) {
    const boxA = this.a.getBoundingClientRect();
    const boxB = this.b.getBoundingClientRect();
    const centerB: Point = [boxB.left + boxB.width / 2, boxB.top + boxB.height / 2];
    const capA = capOf(boxA, centerB, drawnRadius(this.a, boxA));
    const capB = capOf(boxB, [capA[0], capA[1]], drawnRadius(this.b, boxB));
    const [left, top, right, bottom] = capBounds(capA, capB);
    const neck = strength > 0 ? neckBetween(capA, capB, strength, [left, top]) : null;
    this.element.hidden = !neck;
    if (!neck) return false;
    const [x, y] = this.origin();
    Object.assign(this.element.style, {
      left: `${left - x}px`,
      top: `${top - y}px`,
      width: `${right - left}px`,
      height: `${bottom - top}px`,
      opacity: String(opacity),
      clipPath: `path("${neck.outline}")`,
    });
    this.rim.setAttribute("d", neck.rims);
    return true;
  }

  destroy() {
    this.element.remove();
  }

  private origin(): Point {
    if (!this.container) return [0, 0];
    const box = this.container.getBoundingClientRect();
    return [box.left + this.container.clientLeft, box.top + this.container.clientTop];
  }
}

export type FusionSample = { strength: number; opacity?: number; hold?: boolean };

/**
 * Redraws a fusion every frame while `sample` reports a neck, a hold, or a press on one of
 * the surfaces, then stops. `wake` restarts it.
 */
export class FusionLoop {
  private frame = 0;
  private held = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly fusion: LiquidFusion,
    private readonly sample: () => FusionSample,
  ) {}

  /** Draw while a press that began inside one of these elements lasts. */
  wakeOn(...elements: HTMLElement[]) {
    const release = () => {
      this.held = false;
    };
    const press = () => {
      this.held = true;
      this.wake();
    };
    for (const element of elements) {
      this.cleanups.push(listen(element, { pointerdown: press }, { passive: true }));
    }
    this.cleanups.push(
      listen(window, { pointerup: release, pointercancel: release, blur: release }),
    );
    return this;
  }

  wake = () => {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.cleanups.forEach((cleanup) => cleanup());
    this.fusion.destroy();
  }

  private tick = () => {
    this.frame = 0;
    const { strength, opacity = 1, hold = false } = this.sample();
    const showing = this.fusion.draw(strength, opacity);
    if (showing || hold || this.held) this.wake();
  };
}
