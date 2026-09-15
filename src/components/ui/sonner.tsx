"use client";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-foreground-muted",
          actionButton: "group-[.toast]:bg-navy group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-surface-muted group-[.toast]:text-foreground-muted",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
