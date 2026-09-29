import Image from "next/image"

import { cn } from "@/lib/utils"

// Black & white logo in a small square tile, falling back to a monogram.
export function LogoTile({
  src,
  name,
  invert,
  className,
}: {
  src?: string
  name: string
  invert?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={36}
          height={36}
          unoptimized={src.endsWith(".svg")}
          className={cn(
            "size-full object-contain grayscale",
            invert && "invert dark:invert-0"
          )}
        />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">
          {name.charAt(0)}
        </span>
      )}
    </div>
  )
}
