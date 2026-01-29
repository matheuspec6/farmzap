import * as React from "react"
import { cn } from "@/lib/utils"

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive"
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "bg-background text-foreground border-border",
  destructive: "text-destructive border-destructive/50 bg-destructive/10",
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn("relative w-full rounded-lg border p-4", variantClasses[variant], className)}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
AlertDescription.displayName = "AlertDescription"

const AlertAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("absolute right-4 top-4", className)} {...props} />
  )
)
AlertAction.displayName = "AlertAction"

export { Alert, AlertTitle, AlertDescription, AlertAction }
