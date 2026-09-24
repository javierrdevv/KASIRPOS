import { cn } from "@/lib/utils";
import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const fieldError =
  "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        fieldError,
        "border-warm-200 hover:border-warm-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        fieldError,
        "border-warm-200 hover:border-warm-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
        className
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldError,
        "border-warm-200 hover:border-warm-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}