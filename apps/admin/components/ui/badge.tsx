import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneMap = {
  active: "bg-[#dff4e7] text-[#256b49]",
  draft: "bg-[#f7ecd2] text-[#8b6a1a]",
  inactive: "bg-[#efe7e1] text-[#7d5746]",
  open: "bg-[#fde9e4] text-[#a14e3a]",
  reviewed: "bg-[#e7f0fb] text-[#2a5ea8]",
  closed: "bg-[#e7efe8] text-[#4d5f55]",
  positive: "bg-[#dff4e7] text-[#256b49]",
  neutral: "bg-[#f2efe7] text-[#6b5e49]",
  negative: "bg-[#fde9e4] text-[#a14e3a]",
} as const;

type BadgeTone = keyof typeof toneMap;

export function Badge({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone: BadgeTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", toneMap[tone], className)}>
      {children}
    </span>
  );
}


