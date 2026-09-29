"use client";

import { useEffect } from "react";

// Refraction of the page behind the glass. The rim of a glass surface is a curved bezel, so it
// bends what is behind it: near the edge, the backdrop is drawn from further inside. An SVG
// displacement map encodes that bend and `backdrop-filter: url(#…)` applies it to the backdrop.
// Only Chromium renders SVG filters in `backdrop-filter`, so elsewhere the glass keeps its blur.

/** Width of the bending rim in px, capped by the corner radius. */
export const bezelFor = (radius: number) => Math.max(4, Math.min(radius, 18));
/** Deepest displacement at the very edge, in px. */
export const refractionDepth = (bezel: number) => Math.round(bezel * 0.6);

/**
 * Distance of a point from the edge of a rounded rectangle (positive inside) and the edge's
 * outward normal there.
 */
export function edgeOf(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  const dx = x - width / 2;
  const dy = y - height / 2;
  const qx = Math.abs(dx) - (width / 2 - r);
  const qy = Math.abs(dy) - (height / 2 - r);
  if (qx > 0 && qy > 0) {
    const length = Math.hypot(qx, qy);
    return {
      distance: r - length,
      nx: (Math.sign(dx) * qx) / length,
      ny: (Math.sign(dy) * qy) / length,
    };
  }
  if (qx > qy) return { distance: r - qx, nx: Math.sign(dx) || 1, ny: 0 };
  return { distance: r - qy, nx: 0, ny: Math.sign(dy) || 1 };
}

/**
 * RGBA displacement map for a rounded rectangle: red and green are x and y offsets around 128.
 * Inside the bezel, points are displaced inward along the normal, most strongly at the edge
 * and easing to nothing where the bezel meets the flat face.
 */
export function displacementMap(width: number, height: number, radius: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const bezel = bezelFor(Math.min(radius, w / 2, h / 2));
  const data = new Uint8ClampedArray(w * h * 4).fill(128);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i + 3] = 255;
      const { distance, nx, ny } = edgeOf(x + 0.5, y + 0.5, w, h, radius);
      if (distance >= bezel) continue;
      const t = 1 - Math.max(0, distance) / bezel;
      const strength = t * t * 127;
      data[i] = 128 - nx * strength;
      data[i + 1] = 128 - ny * strength;
    }
  }
  return { data, width: w, height: h, scale: refractionDepth(bezel) * 2 };
}

type UAData = { brands?: { brand: string }[] };

/** SVG filters in `backdrop-filter` render only in Chromium; elsewhere they drop the blur too. */
export function refractionSupported() {
  if (typeof CSS === "undefined" || typeof navigator === "undefined") return false;
  const brands = (navigator as Navigator & { userAgentData?: UAData }).userAgentData?.brands;
  return (
    !!brands?.some(({ brand }) => brand === "Chromium") &&
    CSS.supports("backdrop-filter", "url(#liquid) blur(1px)")
  );
}

const svgNS = "http://www.w3.org/2000/svg";
let count = 0;

function definitions() {
  const existing = document.getElementById("liquid-refraction-defs");
  if (existing) return existing;
  const svg = document.createElementNS(svgNS, "svg");
  svg.id = "liquid-refraction-defs";
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  document.body.append(svg);
  return svg;
}

function element(name: string, attributes: Record<string, string>) {
  const node = document.createElementNS(svgNS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

/** Bends the backdrop at the rim of one glass surface. Does nothing where unsupported. */
export class LiquidRefraction {
  private readonly id = `liquid-refraction-${++count}`;
  private readonly filter = element("filter", {
    x: "0",
    y: "0",
    filterUnits: "userSpaceOnUse",
    primitiveUnits: "userSpaceOnUse",
    "color-interpolation-filters": "sRGB",
  });
  private readonly map = element("feImage", {
    x: "0",
    y: "0",
    preserveAspectRatio: "none",
    result: "map",
  });
  private readonly bend = element("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "map",
    xChannelSelector: "R",
    yChannelSelector: "G",
  });
  private readonly resize = new ResizeObserver(() => this.resized());
  private timer = 0;
  private drawn = "";

  constructor(private readonly node: HTMLElement) {
    this.filter.id = this.id;
    this.filter.append(this.map, this.bend);
    definitions().append(this.filter);
    this.resize.observe(node);
    this.resized();
    this.redraw();
    node.style.setProperty("--liquid-refraction", `url(#${this.id})`);
    node.dataset.liquidRefraction = "";
  }

  destroy() {
    clearTimeout(this.timer);
    this.resize.disconnect();
    this.filter.remove();
    const defs = document.getElementById("liquid-refraction-defs");
    if (defs && !defs.childElementCount) defs.remove();
    this.node.style.removeProperty("--liquid-refraction");
    delete this.node.dataset.liquidRefraction;
  }

  // The last map stretches to the new size at once; a fresh one follows when resizing pauses.
  private resized() {
    const { offsetWidth: width, offsetHeight: height } = this.node;
    for (const target of [this.filter, this.map]) {
      target.setAttribute("width", String(width));
      target.setAttribute("height", String(height));
    }
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.redraw(), 120);
  }

  private redraw() {
    const { offsetWidth: width, offsetHeight: height } = this.node;
    const radius = parseFloat(getComputedStyle(this.node).borderTopLeftRadius) || 0;
    const key = `${width}x${height}@${radius}`;
    if (!width || !height || key === this.drawn) return;
    const map = displacementMap(width, height, radius);
    const canvas = document.createElement("canvas");
    canvas.width = map.width;
    canvas.height = map.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.putImageData(new ImageData(map.data, map.width, map.height), 0, 0);
    this.map.setAttribute("href", canvas.toDataURL());
    this.bend.setAttribute("scale", String(map.scale));
    this.drawn = key;
  }
}

/** Refract the backdrop at the rim of a glass surface, in browsers that can. */
export function useLiquidRefraction(node: HTMLElement | null) {
  useEffect(() => {
    if (!node || !refractionSupported()) return;
    const refraction = new LiquidRefraction(node);
    return () => refraction.destroy();
  }, [node]);
}
