"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { navItems } from "@/lib/site"

export function MobileNav({ className }: { className?: string }) {
  const t = useTranslations("Nav")
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              "extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 !p-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
              className
            )}
          />
        }
      >
        <div className="relative flex h-8 w-4 items-center justify-center">
          <div className="relative size-4">
            <span
              className={cn(
                "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                open ? "top-[0.4rem] -rotate-45" : "top-1"
              )}
            />
            <span
              className={cn(
                "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                open ? "top-[0.4rem] rotate-45" : "top-2.5"
              )}
            />
          </div>
          <span className="sr-only">{t("menu")}</span>
        </div>
        <span className="flex h-8 items-center text-lg leading-none font-medium">
          {t("menu")}
        </span>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>
            <Logo className="h-4" />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <div className="text-sm font-medium text-muted-foreground">
            {t("menu")}
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-2xl font-medium"
            >
              {t("home")}
            </Link>
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                onClick={() => setOpen(false)}
                className="text-2xl font-medium"
              >
                {t(item)}
              </a>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
