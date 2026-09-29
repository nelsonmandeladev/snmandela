import { useTranslations } from "next-intl"

import { Icons } from "@/components/icons"
import { Logo } from "@/components/logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/navigation"
import { navItems, siteConfig } from "@/lib/site"

export function SiteHeader() {
  const t = useTranslations("Nav")

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container-wrapper">
        <div className="container flex h-14 items-center gap-2 **:data-[slot=separator]:h-4!">
          <MobileNav className="flex md:hidden" />
          <Link href="/" className="mr-2 hidden items-center md:flex">
            <Logo className="h-4" />
          </Link>
          <nav
            aria-label={t("main")}
            className="hidden items-center gap-0.5 md:flex"
          >
            {navItems.map((item) => (
              <Button
                key={item}
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<a href={`#${item}`} />}
              >
                {t(item)}
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              nativeButton={false}
              render={
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <Icons.gitHub />
              <span className="sr-only">GitHub</span>
            </Button>
            <Separator orientation="vertical" className="mx-1 data-vertical:self-center" />
            <LocaleSwitcher />
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
