import { routing } from "@/i18n/routing"
import { experience, projects, siteConfig, skills } from "@/lib/site"

import en from "../../messages/en.json"

/** Absolute URL of a locale's home page: `/` for the default locale, `/fr` otherwise. */
export function localeUrl(locale: string) {
  const path = locale === routing.defaultLocale ? "/" : `/${locale}`
  return new URL(path, siteConfig.url).href
}

/** hreflang map shared by page metadata and the sitemap. */
export function languageAlternates() {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l)])),
    "x-default": localeUrl(routing.defaultLocale),
  }
}

/** schema.org data for the home page: the person, their profile page and the site. */
export function personJsonLd(locale: string, description: string) {
  const url = localeUrl(locale)
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        alternateName: siteConfig.handle,
        url: siteConfig.url,
        inLanguage: routing.locales,
      },
      {
        "@type": "ProfilePage",
        "@id": `${url}#profile`,
        url,
        inLanguage: locale,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: { "@id": `${siteConfig.url}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${siteConfig.url}/#person`,
        name: siteConfig.name,
        alternateName: siteConfig.handle,
        jobTitle: siteConfig.jobTitle,
        description,
        url: siteConfig.url,
        image: new URL("/icon.png", siteConfig.url).href,
        email: `mailto:${siteConfig.email}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Yaoundé",
          addressCountry: "CM",
        },
        knowsLanguage: ["fr", "en"],
        knowsAbout: skills,
        sameAs: Object.values(siteConfig.links),
      },
    ],
  }
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so it cannot close the tag. */
export function jsonLdScript(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

// Plain-text map of the site for AI agents, following https://llmstxt.org.
export function llmsText() {
  const t = en
  return [
    `# ${siteConfig.name}`,
    "",
    `> ${t.Metadata.description}`,
    "",
    t.Hero.bio,
    "",
    `The site is available in English (${localeUrl("en")}) and French (${localeUrl("fr")}). Every section below is an anchor on the home page.`,
    "",
    "## Sections",
    "",
    `- [About](${localeUrl("en")}#about): name, role and short bio.`,
    `- [Stack](${localeUrl("en")}#skills): tools and technologies.`,
    `- [Projects](${localeUrl("en")}#projects): selected work with links.`,
    `- [Experience](${localeUrl("en")}#experience): roles, companies and dates.`,
    `- [Contact](${localeUrl("en")}#contact): email and social profiles.`,
    "",
    "## Projects",
    "",
    ...projects.map((p) => {
      const status =
        p.status === "openSource"
          ? " (open source)"
          : p.status === "building"
            ? ` (in development: ${t.Projects.status.buildingNote})`
            : ""
      const description = t.Projects[p.id as keyof typeof t.Projects] as string
      return `- [${p.title}](${p.href})${status}: ${description} Stack: ${p.tags.join(", ")}.`
    }),
    "",
    "## Experience",
    "",
    ...experience.map((job) => {
      const entry = t.Experience[job.id as "gara"]
      return `- ${entry.role} at ${job.company} (${entry.period}): ${entry.summary}`
    }),
    "",
    "## Skills",
    "",
    skills.join(", "),
    "",
    "## Contact",
    "",
    `- Email: ${siteConfig.email}`,
    `- GitHub: ${siteConfig.links.github}`,
    `- LinkedIn: ${siteConfig.links.linkedin}`,
    `- X: ${siteConfig.links.x}`,
    "",
  ].join("\n")
}
