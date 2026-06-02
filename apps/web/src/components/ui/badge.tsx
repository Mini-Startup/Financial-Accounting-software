import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const badgeVariants = cva(
  "badge",
  {
    variants: {
      variant: {
        default: "badge--success",
        success: "badge--success",
        warning: "badge--warning",
        error: "badge--error",
        destructive: "badge--error",
        info: "badge--info",
        neutral: "badge--neutral",
      },
      dot: {
        true: "badge--dot",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      dot: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, dot, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, dot }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
