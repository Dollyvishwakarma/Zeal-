import * as React from "react";
import { cn } from "./utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const id = React.useId();
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#5E4B8B]">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={cn(
            "w-full rounded-xl border border-[#E1C5E7] bg-white px-4 py-3 text-[#5E4B8B] placeholder:text-[#B8A1D9] focus:border-[#9D7DC5] focus:ring-2 focus:ring-[#9D7DC5] focus:ring-offset-2 transition-all outline-none disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
