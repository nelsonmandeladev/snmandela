"use client";
import { createContext, useContext, useMemo, type ComponentProps } from "react";
import { Button } from "@/components/ui/liquid/button";
import { cn } from "@/lib/utils";
import { useBarFusion } from "@/lib/bar";
import { useLiquidIndicator } from "@/lib/lens";
import { useLiquidElement } from "@/lib/motion";
import { useLiquidRefraction } from "@/lib/refraction";
import { useRovingFocus } from "@/lib/roving";
import "./liquid.css";

type Orientation = "horizontal" | "vertical";
type ToolbarState = { orientation: Orientation; grouped: boolean };

const ToolbarContext = createContext<ToolbarState>({ orientation: "horizontal", grouped: false });

export type ToolbarProps = ComponentProps<"div"> & {
  /** Lays the toolbar out in a row or a column; arrow keys follow. */
  orientation?: Orientation;
};

/**
 * A floating toolbar, as in iOS 26: groups of buttons on a capsule of glass each, and round
 * buttons of their own beside them. One tab stop; arrow keys, Home, and End move between buttons.
 */
export function Toolbar({ orientation = "horizontal", className, ref, ...props }: ToolbarProps) {
  const [node, mergedRef] = useLiquidElement(ref);
  useRovingFocus(node, ".liquid-toolbar-button");
  const value = useMemo(() => ({ orientation, grouped: false }), [orientation]);
  return (
    <ToolbarContext.Provider value={value}>
      <div
        ref={mergedRef}
        role="toolbar"
        aria-orientation={orientation}
        className={cn("liquid-toolbar", className)}
        {...props}
      />
    </ToolbarContext.Provider>
  );
}

/** A capsule of glass around related buttons. The lens follows the one with `aria-pressed`. */
export function ToolbarGroup({ className, ref, ...props }: ComponentProps<"div">) {
  const { orientation } = useContext(ToolbarContext);
  const [node, mergedRef] = useLiquidElement(ref);
  useLiquidIndicator(node, {
    selected: '.liquid-toolbar-button[aria-pressed="true"]',
    items: ".liquid-toolbar-button",
  });
  useLiquidRefraction(node);
  const value = useMemo(() => ({ orientation, grouped: true }), [orientation]);
  return (
    <ToolbarContext.Provider value={value}>
      <div
        ref={mergedRef}
        data-orientation={orientation}
        className={cn("liquid-surface liquid-toolbar-group", className)}
        {...props}
      />
    </ToolbarContext.Provider>
  );
}

/**
 * A liquid `Button`. Inside a `ToolbarGroup` it sits on the group's glass; directly inside the
 * `Toolbar` it is a round glass button of its own, which fuses with the group beside it.
 */
export function ToolbarButton({
  className,
  variant,
  size = "icon",
  ref,
  ...props
}: ComponentProps<typeof Button>) {
  const { grouped } = useContext(ToolbarContext);
  const [node, mergedRef] = useLiquidElement(ref);
  const own = grouped ? null : node;
  useLiquidRefraction(own);
  useBarFusion(own, ".liquid-toolbar-group");
  return (
    <Button
      ref={mergedRef}
      variant={variant ?? (grouped ? "ghost" : "default")}
      size={size}
      className={cn("liquid-toolbar-button", className)}
      {...props}
    />
  );
}

/** A line between buttons, across the toolbar's direction. */
export function ToolbarSeparator({ className, ...props }: ComponentProps<"div">) {
  const { orientation } = useContext(ToolbarContext);
  return (
    <div
      role="separator"
      aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
      className={cn("liquid-toolbar-separator", className)}
      {...props}
    />
  );
}
