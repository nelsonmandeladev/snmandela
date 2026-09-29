"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ThemedButton } from "@/components/themed-button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CopyEmailButton({ email }: { email: string }) {
  const t = useTranslations("Contact")
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    // Controlled: only opens after a copy, never on hover.
    <Tooltip open={copied}>
      <TooltipTrigger
        render={
          <ThemedButton
            aria-label={t("copyEmail")}
            onClick={async () => {
              await navigator.clipboard.writeText(email)
              setCopied(true)
            }}
          />
        }
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {email}
      </TooltipTrigger>
      <TooltipContent role="status">{t("copied")}</TooltipContent>
    </Tooltip>
  )
}
