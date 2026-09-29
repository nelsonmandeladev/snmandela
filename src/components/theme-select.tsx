"use client"

import { useLayoutEffect, useSyncExternalStore } from "react"
import { DropletIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import * as Menu from "@/components/ui/dropdown-menu"
import { Button as LiquidButton } from "@/components/ui/liquid/button"
import * as LiquidMenu from "@/components/ui/liquid/dropdown-menu"
import { setLiquidMode, useLiquidMode } from "@/lib/liquid-mode"

const options = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "liquid", icon: DropletIcon },
] as const

const subscribe = () => () => {}

function ContrastIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  )
}

/**
 * Light, dark, or liquid glass over whichever of the two was active.
 * `trigger` replaces the default icon button, e.g. with a toolbar button.
 */
export function ThemeSelect({ trigger }: { trigger?: React.ReactElement }) {
  const t = useTranslations("Theme")
  const { resolvedTheme, setTheme } = useTheme()
  const liquid = useLiquidMode()
  // The theme is only known on the client.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  const current = liquid ? "liquid" : resolvedTheme
  const selected = mounted
    ? options.find((option) => option.value === current)
    : undefined

  // Layout re-renders (switching locale, dev Strict Mode) reset <html>'s class; restore
  // the glass before paint.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("liquid", liquid)
  })

  // Liquid mode showcases liquidcn; light and dark keep the plain shadcn menu.
  const Ui = liquid
    ? { ...LiquidMenu, Button: LiquidButton }
    : { ...Menu, Button }

  return (
    <Ui.DropdownMenu>
      <Ui.DropdownMenuTrigger
        title={t("label")}
        render={
          trigger ?? <Ui.Button variant="ghost" size="icon" className="size-8" />
        }
      >
        {selected ? (
          <selected.icon key={selected.value} className="size-4.5" />
        ) : (
          <ContrastIcon className="size-4.5" />
        )}
        <span className="sr-only">{t("label")}</span>
      </Ui.DropdownMenuTrigger>
      <Ui.DropdownMenuContent align="end" className="min-w-36">
        <Ui.DropdownMenuRadioGroup
          value={current}
          onValueChange={(value: string) => {
            if (value === "liquid") return setLiquidMode(true)
            setLiquidMode(false)
            setTheme(value)
          }}
        >
          {options.map(({ value, icon: Icon }) => (
            <Ui.DropdownMenuRadioItem key={value} value={value} closeOnClick>
              <Icon />
              {t(value)}
            </Ui.DropdownMenuRadioItem>
          ))}
        </Ui.DropdownMenuRadioGroup>
      </Ui.DropdownMenuContent>
    </Ui.DropdownMenu>
  )
}
