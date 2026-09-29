"use client";
import type { ComponentProps } from "react";
import { TabsList as BaseList, TabsTrigger as BaseTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLiquidElement } from "@/lib/motion";
import { useLiquidIndicator } from "@/lib/lens";
import { useLiquidRefraction } from "@/lib/refraction";
import "./liquid.css";
export { Tabs, TabsContent } from "@/components/ui/tabs";
export function TabsList({ className, ref, ...props }: ComponentProps<typeof BaseList>) {
  const [node, mergedRef] = useLiquidElement(ref);
  useLiquidIndicator(node, {
    selected: '.liquid-tab[aria-selected="true"]',
    items: ".liquid-tab",
    scrub: true,
  });
  useLiquidRefraction(node);
  return (
    <BaseList ref={mergedRef} className={cn("liquid-surface liquid-tabs", className)} {...props} />
  );
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof BaseTrigger>) {
  return <BaseTrigger className={cn("liquid-tab", className)} {...props} />;
}
