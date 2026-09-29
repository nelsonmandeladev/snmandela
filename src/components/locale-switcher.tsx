"use client"

import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"

/** The other locale, and a function that switches to it on the current page. */
export function useLocaleSwitch() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const next = locale === "en" ? "fr" : "en"
  return { next, switchLocale: () => router.replace(pathname, { locale: next }) }
}

export function LocaleSwitcher() {
  const t = useTranslations("Nav")
  const { next, switchLocale } = useLocaleSwitch()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-mono text-xs uppercase"
      title={t("language")}
      onClick={switchLocale}
    >
      {next}
      <span className="sr-only">{t("language")}</span>
    </Button>
  )
}
