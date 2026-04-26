type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-[28px] border border-black/8 bg-white/85 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.16em] text-black/45">{label}</p>
      <p className="mt-4 font-serif text-4xl text-ink">{value}</p>
      <p className="mt-3 text-sm leading-6 text-black/55">{hint}</p>
    </div>
  );
}

