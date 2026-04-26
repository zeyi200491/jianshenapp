"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-ink text-sand hover:bg-[#25302d]",
        variant === "secondary" && "bg-white text-ink ring-1 ring-black/10 hover:bg-sand",
        variant === "ghost" && "bg-transparent text-ink hover:bg-white/60",
        variant === "danger" && "bg-[#8c3a2c] text-white hover:bg-[#733022]",
        props.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      {...props}
    />
  );
}
