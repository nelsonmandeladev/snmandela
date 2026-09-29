# snmandela

The personal portfolio of Sonfack Nelson Mandela, creative product developer. Live at **[snmandela.com](https://snmandela.com)**.

A single, compact page in English and French, styled after [ui.shadcn.com](https://ui.shadcn.com).

## Stack

- [Next.js 16](https://nextjs.org) (App Router) and TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (Base UI)
- [next-intl](https://next-intl.dev) for English and French
- [next-themes](https://github.com/pacocoursey/next-themes) for light and dark mode

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The French version is at `/fr`.

| Command         | What it does               |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Build for production       |
| `npm run start` | Serve the production build |
| `npm run lint`  | Run ESLint                 |

## Editing the content

| What                                     | Where                                  |
| ---------------------------------------- | -------------------------------------- |
| Name, links, skills, projects, companies | `src/lib/site.ts`                      |
| All text, in both languages              | `messages/en.json`, `messages/fr.json` |
| Project and company logos                | `public/logos/`                        |
| Brand logo and colors                    | `public/brand/`, `src/app/globals.css` |

Each project and job in `site.ts` has an `id`; its translated text lives under the same key in the message files.

## SEO and agents

- `robots.txt` and `sitemap.xml` (with English/French alternates)
- A social preview image per language: `src/app/[locale]/opengraph-image.tsx`
- schema.org `Person` data on the home page
- [`/llms.txt`](https://snmandela.com/llms.txt), a plain-text summary of the site for AI agents

## Using this as a template

You're welcome to fork it for your own portfolio. Please replace my name, content, logos and brand assets with your own.

## Contributing

Found a bug or a typo? Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code released under the [MIT License](LICENSE). The personal content (text, logo, and project and company logos) is not covered by the license.
