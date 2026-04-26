import type { ReactNode } from "react";

type FeatureCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function FeatureCard({ eyebrow, title, description, children }: FeatureCardProps) {
  return (
    <article className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.28em] text-moss">{eyebrow}</p>
      <h3 className="mt-3 font-serif text-2xl text-forest">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

