import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/utils/cn"
import { useDebouncedAction } from "@/hooks/useDebouncedAction"

const buttonVariants = cva(
  "btn cursor-pointer select-none transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
  {
    variants: {
      variant: {
        default: "btn--primary",
        destructive: "btn--destructive",
        outline: "btn--secondary",
        secondary: "btn--secondary",
        ghost: "btn--ghost",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        sm: "btn--sm",
        lg: "btn--lg",
        icon: "btn--icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
  debounceMs?: number
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      debounceMs = 400,
      disabled,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const [debouncedClick, isActionPending] = useDebouncedAction(
      async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
          await onClick(e);
        }
      },
      debounceMs
    );

    const isBusy = isLoading || isActionPending;
    const isDisabled = disabled || isBusy;

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        onClick={onClick ? debouncedClick : undefined}
        {...props}
      >
        {isBusy ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
