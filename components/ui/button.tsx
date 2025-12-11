// components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition active:scale-[.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
        secondary: "bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-700",
        outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400",
        ghost: "bg-transparent hover:bg-slate-50 text-slate-700",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",

        // 🎨 เพิ่มธีมสีใช้งานบ่อย
        success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
        warning: "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400",
        info: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
