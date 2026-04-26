import Link from "next/link";

import { Button } from "@/components/ui/button";

type HeaderAction = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  description,
  actions = [],
}: {
  title: string;
  description: string;
  actions?: HeaderAction[];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-black/45">CampusFit AI Admin</p>
          <h1 className="font-serif text-3xl text-ink">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-black/60">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href}>
                <Button>{action.label}</Button>
              </Link>
            ) : (
              <Button key={action.label}>{action.label}</Button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

