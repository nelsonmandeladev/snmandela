import { useTranslations } from "next-intl"

import { siteConfig } from "@/lib/site"

export function SiteFooter() {
  const t = useTranslations("Footer")

  return (
    <footer className="border-t border-dashed">
      <div className="container-wrapper">
        <div className="container flex items-center justify-between py-5">
          <div className="w-full text-xs leading-loose text-muted-foreground">
            {t.rich("builtBy", {
              name: () => (
                <a
                  href={siteConfig.links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  {siteConfig.name}
                </a>
              ),
              github: (chunks) => (
                <a
                  href={siteConfig.repository}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
