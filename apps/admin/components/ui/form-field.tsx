import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type WrapperProps = {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function FormFieldWrapper({ label, error, hint, children }: WrapperProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-ink">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-black/50">{hint}</span> : null}
      {error ? <span className="text-xs text-[#a14e3a]">{error}</span> : null}
    </label>
  );
}

type BaseInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function Input({ className, error, ...props }: BaseInputProps) {
  return (
    <input
      className={cn(
        "h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-black/35 focus:border-olive",
        error && "border-[#a14e3a]",
        className,
      )}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-black/35 focus:border-olive",
        error && "border-[#a14e3a]",
        className,
      )}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
};

export function Select({ className, error, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-olive",
        error && "border-[#a14e3a]",
        className,
      )}
      {...props}
    />
  );
}


