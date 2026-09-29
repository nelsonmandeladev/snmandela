import { ArrowUpRightIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { use } from "react"

import { CopyEmailButton } from "@/components/copy-email-button"
import { Icons } from "@/components/icons"
import { LogoTile } from "@/components/logo-tile"
import { ThemedButton } from "@/components/themed-button"
import { Badge } from "@/components/ui/badge"
import { jsonLdScript, personJsonLd } from "@/lib/seo"
import { experience, projects, siteConfig, skills } from "@/lib/site"

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-dashed">
      <div className="container-wrapper">
        <div className="container py-10">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params)
  setRequestLocale(locale)

  const t = useTranslations()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            personJsonLd(locale, t("Metadata.description"))
          ),
        }}
      />
      {/* Hero — mirrors shadcn.com's PageHeader */}
      <section id="about">
        <div className="container-wrapper">
          <div className="container flex flex-col items-start gap-2 py-10 md:py-14">
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
              {siteConfig.name}
            </h1>
            <p className="text-sm font-medium md:text-base">{t("Hero.role")}</p>
            <p className="max-w-xl text-sm text-balance text-muted-foreground md:text-base">
              {t("Hero.bio")}
            </p>
            <div className="flex items-center gap-2 pt-2 **:data-[slot=button]:shadow-none">
              <ThemedButton
                size="sm"
                liquidVariant="prominent"
                nativeButton={false}
                render={<a href="#projects" />}
              >
                {t("Hero.viewProjects")}
              </ThemedButton>
              <ThemedButton
                size="sm"
                variant="ghost"
                liquidVariant="default"
                nativeButton={false}
                render={<a href="#contact" />}
              >
                {t("Hero.contact")}
              </ThemedButton>
            </div>
          </div>
        </div>
      </section>

      <Section
        id="skills"
        title={t("Stack.title")}
        description={t("Stack.description")}
      >
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        id="projects"
        title={t("Projects.title")}
        description={t("Projects.description")}
      >
        <div className="flex flex-col">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.href}
              target="_blank"
              rel="noreferrer"
              className="group/project flex gap-4 border-b border-dashed py-5 first:pt-0 last:border-0"
            >
              <LogoTile
                src={project.logo}
                name={project.title}
                invert={project.invert}
              />
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="flex items-center gap-1 font-medium">
                    {project.title}
                    <ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover/project:translate-x-0.5 group-hover/project:-translate-y-0.5" />
                  </span>
                  {project.status === "openSource" && (
                    <Badge variant="outline">
                      {t("Projects.status.openSource")}
                    </Badge>
                  )}
                  {project.status === "building" && (
                    <>
                      <Badge variant="secondary">
                        <span className="size-1.5 animate-pulse rounded-full bg-foreground" />
                        {t("Projects.status.building")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("Projects.status.buildingNote")}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(`Projects.${project.id}`)}
                </p>
                <div className="text-xs text-muted-foreground">
                  {project.tags.join(" · ")}
                </div>
              </div>
            </a>
          ))}
        </div>
      </Section>

      <Section
        id="experience"
        title={t("Experience.title")}
        description={t("Experience.description")}
      >
        <div className="flex flex-col">
          {experience.map((job) => (
            <div
              key={job.id}
              className="flex gap-4 border-b border-dashed py-5 first:pt-0 last:border-0"
            >
              <LogoTile src={job.logo} name={job.company} invert={job.invert} />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-col justify-between gap-x-4 sm:flex-row sm:items-baseline">
                  <div className="font-medium">
                    {t(`Experience.${job.id}.role`)}{" "}
                    <span className="text-muted-foreground">
                      ·{" "}
                      {job.href ? (
                        <a
                          href={job.href}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground hover:underline hover:underline-offset-4"
                        >
                          {job.company}
                        </a>
                      ) : (
                        job.company
                      )}
                    </span>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t(`Experience.${job.id}.period`)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(`Experience.${job.id}.summary`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="contact"
        title={t("Contact.title")}
        description={t("Contact.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <CopyEmailButton email={siteConfig.email} />
          <ThemedButton
            variant="outline"
            liquidVariant="default"
            size="icon"
            nativeButton={false}
            render={
              <a href={siteConfig.links.github} target="_blank" rel="noreferrer" />
            }
          >
            <Icons.gitHub />
            <span className="sr-only">GitHub</span>
          </ThemedButton>
          <ThemedButton
            variant="outline"
            liquidVariant="default"
            size="icon"
            nativeButton={false}
            render={
              <a href={siteConfig.links.linkedin} target="_blank" rel="noreferrer" />
            }
          >
            <Icons.linkedIn />
            <span className="sr-only">LinkedIn</span>
          </ThemedButton>
          <ThemedButton
            variant="outline"
            liquidVariant="default"
            size="icon"
            nativeButton={false}
            render={<a href={siteConfig.links.x} target="_blank" rel="noreferrer" />}
          >
            <Icons.x />
            <span className="sr-only">X</span>
          </ThemedButton>
        </div>
      </Section>
    </>
  )
}
