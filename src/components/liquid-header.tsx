"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Icons } from "@/components/icons"
import { useLocaleSwitch } from "@/components/locale-switcher"
import { Logo } from "@/components/logo"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeSelect } from "@/components/theme-select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/liquid/tabs"
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
} from "@/components/ui/liquid/toolbar"
import { Link } from "@/i18n/navigation"
import { useLiquidMode } from "@/lib/liquid-mode"
import { navItems, siteConfig } from "@/lib/site"

type Section = (typeof navItems)[number]

// A section is current once its top passes under the header.
const HEADER_OFFSET = 120

/**
 * The section in view, and a function that scrolls to one. While a chosen section scrolls
 * into view, the sections passed on the way do not pull the lens back.
 */
function useSectionSpy() {
  const [active, setActive] = React.useState<Section>(navItems[0])
  const travelling = React.useRef(false)

  React.useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (travelling.current) return
        const { scrollY, innerHeight } = window
        const bottom =
          scrollY + innerHeight >= document.documentElement.scrollHeight - 2
        let current: Section = navItems[0]
        for (const id of navItems) {
          const top = document.getElementById(id)?.getBoundingClientRect().top
          if (top !== undefined && top <= HEADER_OFFSET) current = id
        }
        setActive(bottom ? navItems[navItems.length - 1] : current)
      })
    }
    const arrive = () => {
      travelling.current = false
      update()
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("scrollend", arrive)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("scrollend", arrive)
    }
  }, [])

  const go = React.useCallback((id: Section) => {
    const section = document.getElementById(id)
    if (!section) return
    setActive(id)
    travelling.current = true
    // Browsers without `scrollend` still hand the lens back to the spy.
    setTimeout(() => (travelling.current = false), 1200)
    section.scrollIntoView()
    history.replaceState(null, "", `#${id}`)
  }, [])

  return [active, go] as const
}

/** The header in liquid mode: logo and tabs on one capsule, then a toolbar. */
export function LiquidHeader() {
  const t = useTranslations("Nav")
  const { next, switchLocale } = useLocaleSwitch()
  const [active, go] = useSectionSpy()

  return (
    <div className="container flex items-center justify-center gap-3 py-3">
      <div className="liquid-surface liquid-nav max-md:flex-1">
        <MobileNav className="flex px-3 md:hidden" />
        <Link href="/" className="hidden items-center px-4 md:flex">
          <Logo className="h-4" />
        </Link>
        <Tabs
          value={active}
          onValueChange={(value) => go(value as Section)}
          className="hidden md:flex"
        >
          <TabsList aria-label={t("main")} className="liquid-nav-tabs">
            {navItems.map((item) => (
              <TabsTrigger key={item} value={item}>
                {t(item)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Toolbar aria-label={t("settings")} className="liquid-nav-tools">
        <ToolbarGroup>
          <ThemeSelect trigger={<ToolbarButton />} />
          <ToolbarButton
            title={t("language")}
            className="font-mono text-xs uppercase"
            onClick={switchLocale}
          >
            {next}
            <span className="sr-only">{t("language")}</span>
          </ToolbarButton>
          <ToolbarButton
            nativeButton={false}
            render={
              <a href={siteConfig.links.github} target="_blank" rel="noreferrer" />
            }
          >
            <Icons.gitHub />
            <span className="sr-only">GitHub</span>
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
    </div>
  )
}

/**
 * Renders the liquid header in liquid mode and the classic one otherwise. Before hydration,
 * CSS hides the classic header on liquid pages, so it never flashes.
 */
export function HeaderSwitch({ children }: { children: React.ReactNode }) {
  return useLiquidMode() ? (
    <LiquidHeader />
  ) : (
    <div data-header="classic">{children}</div>
  )
}
