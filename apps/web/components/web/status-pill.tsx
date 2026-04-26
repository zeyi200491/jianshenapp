type StatusPillProps = {
  label: string;
  value: string;
};

export function StatusPill({ label, value }: StatusPillProps) {
  return (
    <div className="rounded-full border border-forest/10 bg-parchment px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-moss">{label}</p>
      <p className="mt-1 text-sm font-medium text-forest">{value}</p>
    </div>
  );
}

