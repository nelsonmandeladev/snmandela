import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site"

// The wordmark is an alpha mask filled with the current text color, so it
// follows the theme; the dot is drawn in CSS with the brand blue.
// Dot position is measured from public/brand/wordmark.png (1614×225).
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-block aspect-[1614/225] h-5", className)}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-current mask-[url(/brand/wordmark.png)] mask-size-[100%_100%] mask-no-repeat"
      />
      <span
        aria-hidden
        className="absolute top-[71.556%] left-[96.283%] h-[28.444%] w-[3.717%] rounded-full bg-brand"
      />
      <span className="sr-only">{siteConfig.name}</span>
    </span>
  )
}
