 "use client"
 
 import * as React from "react"
 import * as DialogPrimitive from "@radix-ui/react-dialog"
 import { cn } from "@/lib/utils"
 
 const AlertDialog = DialogPrimitive.Root
 
 const AlertDialogTrigger = DialogPrimitive.Trigger
 
 const AlertDialogPortal = DialogPrimitive.Portal
 
 const AlertDialogOverlay = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Overlay>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
 >(({ className, ...props }, ref) => (
   <DialogPrimitive.Overlay
     ref={ref}
     className={cn("fixed inset-0 z-50 bg-black/80", className)}
     {...props}
   />
 ))
 AlertDialogOverlay.displayName = DialogPrimitive.Overlay.displayName
 
 const AlertDialogContent = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Content>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
 >(({ className, ...props }, ref) => (
   <AlertDialogPortal>
     <AlertDialogOverlay />
     <DialogPrimitive.Content
       ref={ref}
       className={cn(
         "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg",
         className
       )}
       {...props}
     />
   </AlertDialogPortal>
 ))
 AlertDialogContent.displayName = DialogPrimitive.Content.displayName
 
 const AlertDialogHeader = ({
   className,
   ...props
 }: React.HTMLAttributes<HTMLDivElement>) => (
   <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
 )
 AlertDialogHeader.displayName = "AlertDialogHeader"
 
 const AlertDialogFooter = ({
   className,
   ...props
 }: React.HTMLAttributes<HTMLDivElement>) => (
   <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
 )
 AlertDialogFooter.displayName = "AlertDialogFooter"
 
 const AlertDialogTitle = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Title>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
 >(({ className, ...props }, ref) => (
   <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
 ))
 AlertDialogTitle.displayName = DialogPrimitive.Title.displayName
 
 const AlertDialogDescription = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Description>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
 >(({ className, ...props }, ref) => (
   <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
 ))
 AlertDialogDescription.displayName = DialogPrimitive.Description.displayName
 
 const AlertDialogCancel = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Close>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
 >(({ className, ...props }, ref) => (
   <DialogPrimitive.Close
     ref={ref}
     className={cn(
       "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
       className
     )}
     {...props}
   />
 ))
 AlertDialogCancel.displayName = "AlertDialogCancel"
 
 const AlertDialogAction = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Close>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
 >(({ className, ...props }, ref) => (
   <DialogPrimitive.Close
     ref={ref}
     className={cn(
       "inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
       className
     )}
     {...props}
   />
 ))
 AlertDialogAction.displayName = "AlertDialogAction"
 
 export {
   AlertDialog,
   AlertDialogTrigger,
   AlertDialogPortal,
   AlertDialogOverlay,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogFooter,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogCancel,
   AlertDialogAction,
 }
