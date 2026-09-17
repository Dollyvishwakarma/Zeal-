import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white hover:shadow-lg hover:shadow-[#9D7DC5]/30 hover:scale-[1.02] focus:ring-[#9D7DC5] before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        secondary: "bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white border border-[#E1C5E7] dark:border-gray-700 hover:border-[#9D7DC5] hover:shadow-md hover:scale-[1.02] focus:ring-[#E1C5E7]",
        outline: "border-2 border-[#9D7DC5] text-[#9D7DC5] hover:bg-[#F4E8F7] hover:scale-[1.02] focus:ring-[#9D7DC5]",
        ghost: "text-[#5E4B8B] hover:bg-[#F4E8F7] hover:scale-[1.02] focus:ring-[#F4E8F7]",
        danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] focus:ring-red-500",
        success: "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02] focus:ring-green-500",
        cta: "relative px-8 py-3.5 text-base font-bold bg-gradient-to-r from-[#9D7DC5] via-[#7A5A9E] to-[#533AFD] text-white shadow-[0_4px_20px_rgba(83,58,253,0.4)] hover:shadow-[0_6px_30px_rgba(83,58,253,0.6)] hover:scale-[1.03] active:scale-[0.97] focus:ring-[#9D7DC5] before:absolute before:inset-0 before:bg-white/15 before:opacity-0 hover:before:opacity-100 before:transition-opacity after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:to-white/10 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
        icon: "p-2 w-10 h-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
