import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"
import { getTranslations } from "next-intl/server"

import { routing } from "@/i18n/routing"
import { siteConfig } from "@/lib/site"

export const alt = `${siteConfig.name} — ${siteConfig.jobTitle}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// Wordmark (public/brand/wordmark.png) is 1614×225; the dot's box is measured
// from it, same as components/logo.tsx.
const logoWidth = 640
const logoHeight = (logoWidth * 225) / 1614

/** The card shown when the site is shared: the logo and the tagline. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata" })
  const wordmark = await readFile(
    join(process.cwd(), "public/brand/wordmark.png")
  )
  const src = `data:image/png;base64,${wordmark.toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        background: "#0a0a0a",
      }}
    >
      <div
        style={{ display: "flex", position: "relative", width: logoWidth, height: logoHeight }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={logoWidth} height={logoHeight} alt="" />
        <div
          style={{
            position: "absolute",
            left: logoWidth * 0.96283,
            top: logoHeight * 0.71556,
            width: logoWidth * 0.03717,
            height: logoHeight * 0.28444,
            borderRadius: 9999,
            background: "#142cfc",
          }}
        />
      </div>
      <div style={{ fontSize: 40, color: "#a1a1a1", letterSpacing: "-0.01em" }}>
        {t("tagline")}
      </div>
    </div>,
    size
  )
}
