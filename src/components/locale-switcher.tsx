"use client"

import { useLocale, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"

export function LocaleSwitcher() {
  const t = useTranslations("Nav")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const next = locale === "en" ? "fr" : "en"

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-mono text-xs uppercase"
      title={t("language")}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {next}
      <span className="sr-only">{t("language")}</span>
    </Button>
  )
}
