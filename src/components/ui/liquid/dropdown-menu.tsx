"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  DropdownMenu as BaseMenu,
  DropdownMenuTrigger as BaseTrigger,
  DropdownMenuContent as BaseContent,
  DropdownMenuSub as BaseSub,
  DropdownMenuSubContent as BaseSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLiquidElement } from "@/lib/motion";
import {
  MenuMorph,
  MenuSession,
  coverPlacement,
  measureAnchor,
  sameAnchor,
  type Anchor,
} from "@/lib/menu-morph";
import "./liquid.css";
export {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

type SetAnchor = Dispatch<SetStateAction<Anchor | null>>;
type MenuContextValue = {
  session: MenuSession;
  anchor: Anchor | null;
  setAnchor: SetAnchor;
  open?: boolean;
};

// Content rendered inside a plain base menu still works; it opens beside its trigger, unmorphed.
const detached: MenuContextValue = {
  session: new MenuSession(),
  anchor: null,
  setAnchor: () => {},
};
const MenuContext = createContext<MenuContextValue>(detached);
const SubContext = createContext<boolean | undefined>(undefined);

/**
 * A menu's open state, controlled or not. Liquid parts read it in the same render as the
 * primitive, so the closing keyframes start as the menu closes; were they any later, the
 * primitive would unmount the panel at once. Extra arguments reach `onChange` untouched.
 */
function useOpenState<Change extends (open: boolean, ...details: never[]) => void>(
  controlled: boolean | undefined,
  initial: boolean | undefined,
  onChange: Change | undefined,
) {
  const [uncontrolled, setUncontrolled] = useState(initial ?? false);
  const change = useCallback(
    (next: boolean, ...details: never[]) => {
      setUncontrolled(next);
      onChange?.(next, ...details);
    },
    [onChange],
  );
  return [controlled ?? uncontrolled, change as Change] as const;
}

/** Base UI also takes logical sides; the morph measures along physical ones (LTR). */
function physicalSide(side: NonNullable<LiquidContentProps["side"]>) {
  if (side === "inline-start") return "left";
  if (side === "inline-end") return "right";
  return side;
}

/** A panel's `data-liquid-state`, known only inside a liquid menu. */
function stateOf(open: boolean | undefined) {
  if (open === undefined) return undefined;
  return open ? "open" : "closed";
}

function remeasure(element: HTMLElement, setAnchor: SetAnchor) {
  const next = measureAnchor(element);
  setAnchor((previous) => (sameAnchor(previous, next) ? previous : next));
}

export function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: ComponentProps<typeof BaseMenu>) {
  const [session] = useState(() => new MenuSession());
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [state, setOpen] = useOpenState(open, defaultOpen, onOpenChange);
  const value = useMemo(
    () => ({ session, anchor, setAnchor, open: state }),
    [session, anchor, state],
  );
  return (
    <MenuContext.Provider value={value}>
      <BaseMenu open={state} onOpenChange={setOpen} {...props} />
    </MenuContext.Provider>
  );
}

export function DropdownMenuSub({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: ComponentProps<typeof BaseSub>) {
  const [state, setOpen] = useOpenState(open, defaultOpen, onOpenChange);
  return (
    <SubContext.Provider value={state}>
      <BaseSub open={state} onOpenChange={setOpen} {...props} />
    </SubContext.Provider>
  );
}

export function DropdownMenuTrigger({ ref, ...props }: ComponentProps<typeof BaseTrigger>) {
  const { session, setAnchor } = useContext(MenuContext);
  const [node, mergedRef] = useLiquidElement(ref);
  useEffect(
    () => (node ? session.attach(node, () => remeasure(node, setAnchor)) : undefined),
    [session, setAnchor, node],
  );
  return <BaseTrigger ref={mergedRef} {...props} />;
}

function useMenuMorph(node: HTMLDivElement | null, session?: MenuSession, covering = false) {
  useEffect(() => {
    if (!node) return;
    const anchor = () =>
      session?.anchor() ?? document.getElementById(node.getAttribute("aria-labelledby") ?? "");
    const morph = new MenuMorph(node, anchor, covering);
    return () => morph.destroy();
  }, [node, session, covering]);
}

type LiquidContentProps = ComponentProps<typeof BaseContent> & {
  /** Open over the trigger and grow out of it, as iOS does. Set `false` to open beside it. */
  overlap?: boolean;
};

export function DropdownMenuContent({
  className,
  children,
  side = "bottom",
  sideOffset,
  align,
  overlap = true,
  ref,
  ...props
}: LiquidContentProps) {
  const { session, anchor, setAnchor, open } = useContext(MenuContext);
  const [node, mergedRef] = useLiquidElement(ref);
  const cover = overlap ? anchor : null;
  // Covers opens that did not come from the trigger, e.g. a controlled `open`.
  useLayoutEffect(() => {
    const trigger = session.anchor();
    if (node && overlap && trigger) remeasure(trigger, setAnchor);
  }, [node, overlap, session, setAnchor]);
  useMenuMorph(node, session, !!cover);
  useEffect(() => (node ? session.guard(node) : undefined), [node, session]);
  // Base UI also takes a function offset; it opts out of the cover and is passed through.
  const offset = typeof sideOffset === "function" ? undefined : sideOffset;
  const placement = coverPlacement(cover, physicalSide(side), { sideOffset: offset, align });
  return (
    <BaseContent
      ref={mergedRef}
      side={side}
      collisionPadding={8}
      {...placement}
      sideOffset={typeof sideOffset === "function" ? sideOffset : placement.sideOffset}
      className={cn("liquid-surface liquid-menu", className)}
      data-liquid-state={stateOf(open)}
      {...props}
    >
      <div className="liquid-menu-body">{children}</div>
    </BaseContent>
  );
}

export function DropdownMenuSubContent({
  className,
  children,
  ref,
  ...props
}: ComponentProps<typeof BaseSubContent>) {
  const open = useContext(SubContext);
  const [node, mergedRef] = useLiquidElement(ref);
  useMenuMorph(node);
  return (
    <BaseSubContent
      ref={mergedRef}
      className={cn("liquid-surface liquid-menu", className)}
      data-liquid-state={stateOf(open)}
      {...props}
    >
      <div className="liquid-menu-body">{children}</div>
    </BaseSubContent>
  );
}
