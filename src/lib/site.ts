// Non-translatable data. Translated copy lives in /messages/{en,fr}.json,
// keyed by the `id` fields below.
export const siteConfig = {
  name: "Sonfack Nelson Mandela",
  handle: "snmandela",
  jobTitle: "Creative Product Developer",
  twitter: "@sn_mandela",
  url: "https://snmandela.com",
  email: "sonfacknelsonmandela@gmail.com",
  repository: "https://github.com/nelsonmandeladev/snmandela",
  links: {
    github: "https://github.com/nelsonmandeladev",
    linkedin: "https://linkedin.com/in/snmdev",
    x: "https://x.com/sn_mandela",
  },
}

export const navItems = ["about", "projects", "experience", "contact"] as const

export const skills = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "NestJS",
  "Tailwind CSS",
  "shadcn/ui",
  "Motion",
  "GSAP",
  "PostgreSQL",
  "MongoDB",
  "Convex",
  "Prisma",
  "Drizzle",
  "Docker",
  "AWS",
  "Playwright",
]

type Logo = {
  logo?: string
  // Light logos on transparent backgrounds: invert in light mode to stay visible.
  invert?: boolean
}

export type Project = Logo & {
  id: string
  title: string
  href: string
  tags: string[]
  status?: "openSource" | "building"
}

export type Job = Logo & {
  id: string
  company: string
  href?: string
}

export const projects: Project[] = [
  {
    id: "liquidcn",
    logo: "/logos/liquidcn.svg",
    title: "liquidcn",
    href: "https://liquidcn.snmandela.com",
    tags: ["React", "shadcn/ui", "Tailwind CSS", "Registry"],
    status: "openSource",
  },
  {
    id: "ugiii",
    logo: "/logos/ugiii.svg",
    title: "UGIII",
    href: "https://ugiii.com",
    tags: ["Next.js", "Convex", "next-intl", "shadcn/ui"],
    status: "building",
  },
  {
    id: "roliii",
    logo: "/logos/roliii.png",
    title: "Roliii",
    href: "https://roliii.com",
    tags: ["Next.js", "Convex", "Gemini", "Claude", "Polar"],
  },
  {
    id: "paykko",
    logo: "/logos/paykko.png",
    title: "Paykko",
    href: "https://paykko.com",
    tags: ["Next.js", "shadcn/ui", "GSAP", "SEO"],
  },
  {
    id: "oloroun",
    logo: "/logos/oloroun.png",
    invert: true,
    title: "Oloroun",
    href: "https://oloroun.com",
    tags: ["Next.js", "Electron", "TanStack Query", "AWS Cognito"],
  },
  {
    id: "cartevo",
    logo: "/logos/cartevo.png",
    title: "Cartevo",
    href: "https://cartevo.co",
    tags: ["Next.js", "REST", "KYC/KYB"],
  },
  {
    id: "adsquid",
    logo: "/logos/adsquid.png",
    title: "Adsquid",
    href: "https://adsquid.fr",
    tags: ["Next.js", "NestJS", "GraphQL", "PostgreSQL"],
  },
]

export const experience: Job[] = [
  {
    id: "gara",
    company: "GARA",
    href: "https://www.gara.store",
    logo: "/logos/gara.png",
  },
  {
    id: "afreeserv",
    company: "A.FREE.SERV",
    href: "https://afreeserv.com",
    logo: "/logos/afreeserv.png",
    invert: true,
  },
  {
    id: "kevmax",
    company: "KEVMAX SARL",
    href: "https://kevmax.com",
    logo: "/logos/kevmax.png",
  },
  { id: "abyster", company: "Abyster Consulting" },
]
