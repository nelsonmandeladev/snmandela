import { rubberBand } from "@/lib/motion";

// Geometry and DOM helpers for the lens in lens.ts.

/** x, y, width, height in a list's padding-box coordinates. */
export type Box = [number, number, number, number];

/** Items the lens cannot land on. */
export const inactive = ':disabled, [aria-disabled="true"]';

/** Attributes that move or reshape the lens: ARIA state, which every primitive sets, and layout. */
export const watched = [
  "aria-selected",
  "aria-pressed",
  "aria-current",
  "aria-orientation",
  "data-orientation",
  "dir",
];

/** Layout position of `element` inside `root`, unaffected by CSS transforms. */
export function boxWithin(element: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  for (let at: HTMLElement | null = element; at && at !== root;) {
    x += at.offsetLeft;
    y += at.offsetTop;
    const parent = at.offsetParent as HTMLElement | null;
    if (!parent || !root.contains(parent)) break;
    if (parent !== root) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    at = parent;
  }
  return [x, y, element.offsetWidth, element.offsetHeight];
}

/**
 * Visual frame of the lens for a spring state. Lifting grows it, more across the list than
 * along it; speed stretches it along the direction of travel.
 */
export function lensFrame(box: Box, lift: number, speed: number, vertical: boolean): Box {
  const [x, y, w, h] = box;
  const lifted = Math.max(0, lift);
  const stretch = Math.min(0.24, Math.abs(speed) / 5200);
  const along = (1 + 0.16 * lifted) * (1 + stretch);
  const across = (1 + 0.34 * lifted) * (1 - stretch * 0.3);
  const width = w * (vertical ? across : along);
  const height = h * (vertical ? along : across);
  return [x + w / 2 - width / 2, y + h / 2 - height / 2, width, height];
}

/** A mask that hides the part of an item under the lens, or null when they do not overlap. */
export function lensMask(item: Box, frame: Box, vertical: boolean) {
  const axis = vertical ? 1 : 0;
  const start = frame[axis] - item[axis];
  const end = start + frame[axis + 2];
  if (end <= 0 || start >= item[axis + 2]) return null;
  const soft = Math.min(8, (end - start) / 4);
  return `linear-gradient(${vertical ? 180 : 90}deg, #000 ${start}px, transparent ${start + soft}px, transparent ${end - soft}px, #000 ${end}px)`;
}

/** Index of the box whose center is nearest `position` along the list's axis. */
export function nearestBox(boxes: Box[], position: number, vertical: boolean) {
  const axis = vertical ? 1 : 0;
  let best = -1;
  let distance = Infinity;
  boxes.forEach((box, i) => {
    const gap = Math.abs(box[axis] + box[axis + 2] / 2 - position);
    if (gap < distance) {
      distance = gap;
      best = i;
    }
  });
  return best;
}

/** Lens box centered on the finger, rubber-banded past the first and last items. */
export function followBox(boxes: Box[], under: Box, position: number, vertical: boolean): Box {
  const axis = vertical ? 1 : 0;
  const size = under[axis + 2];
  const min = Math.min(...boxes.map((box) => box[axis]));
  const max = Math.max(...boxes.map((box) => box[axis] + box[axis + 2])) - size;
  let start = position - size / 2;
  if (start < min) start = min - rubberBand(min - start, 14);
  else if (start > max) start = max + rubberBand(start - max, 14);
  const next: Box = [...under];
  next[axis] = start;
  return next;
}

/** Pointer position along the list's axis, in padding-box coordinates, undoing its scale. */
export function pointerWithin(
  event: PointerEvent,
  list: HTMLElement,
  border: number[],
  vertical: boolean,
) {
  const bounds = list.getBoundingClientRect();
  if (vertical)
    return (event.clientY - bounds.top) / (bounds.height / (list.offsetHeight || 1)) - border[1];
  return (event.clientX - bounds.left) / (bounds.width / (list.offsetWidth || 1)) - border[0];
}

// The list's own styling hooks: direction and data attributes, but not the lens's state.
const mirrored = (name: string) =>
  name === "dir" || (name.startsWith("data-") && !name.startsWith("data-liquid-"));

/**
 * Refresh the optics: an inert copy of the list, minus the lens itself. It carries the list's
 * classes and styling attributes, so the base component's own styles lay it out the same way.
 */
export function mirror(list: HTMLElement, lens: HTMLElement, optics: HTMLElement) {
  optics.className = `${list.className} liquid-lens-optics`;
  for (const { name } of [...optics.attributes]) {
    if (mirrored(name) && !list.hasAttribute(name)) optics.removeAttribute(name);
  }
  for (const { name, value } of [...list.attributes]) {
    if (mirrored(name)) optics.setAttribute(name, value);
  }
  const children = [...list.children].filter((child) => child !== lens);
  optics.replaceChildren(...children.map(copyOf));
}

/** An inert copy of a list child for the lens: no ids, no lens masks. */
function copyOf(child: Element) {
  const copy = child.cloneNode(true) as HTMLElement;
  for (const element of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    element.removeAttribute("id");
    element.style?.removeProperty("mask-image");
    element.style?.removeProperty("-webkit-mask-image");
  }
  return copy;
}

/**
 * Select an item the way a press would. Primitives differ in which event selects: Radix tabs
 * select on mousedown, others on click, so both are sent. Focus keeps the roving tab stop in
 * sync.
 */
export function activate(element: HTMLElement, list: HTMLElement) {
  element.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
  );
  element.click();
  if (list.contains(document.activeElement)) element.focus({ preventScroll: true });
}
