'use client';

import { ProgressBar } from '@/components/web/dashboard-shell';

type SignalButtonsProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

type CompletionRateControlProps = {
  label: string;
  value: number | null;
  tone?: 'meal' | 'training';
  name: string;
  onChange: (next: string) => void;
};

const completionQuickValues = [0, 25, 50, 75, 100];

export function SignalButtons({ label, value, onChange }: SignalButtonsProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#183550]">{label}</p>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(String(item))}
            className={`grid h-11 w-11 place-items-center rounded-full text-sm font-semibold ${
              value === String(item) ? 'bg-[#0f7ea5] text-white' : 'bg-[#edf4fa] text-[#5f768d]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompletionRateControl({
  label,
  value,
  tone,
  name,
  onChange,
}: CompletionRateControlProps) {
  const sliderClassName = tone === 'training' ? 'w-full accent-[#0f7ea5]' : 'w-full';
  const progressTone = tone === 'training' ? 'teal' : undefined;

  return (
    <div className="grid gap-4">
      <input
        name={`${name}Range`}
        type="range"
        min="0"
        max="100"
        autoComplete="off"
        value={value ?? 0}
        onChange={(event) => onChange(event.target.value)}
        className={sliderClassName}
      />
      <ProgressBar value={value ?? 0} tone={progressTone} className="mt-0" />
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm text-[#5c7287]">
          {label}
          <input
            name={name}
            type="number"
            min="0"
            max="100"
            step="1"
            autoComplete="off"
            inputMode="numeric"
            value={value === null ? '' : value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3 text-lg text-[#17324d] outline-none transition focus:border-[#0f7ea5] focus:bg-white"
            aria-label={label}
          />
        </label>
        <div className="grid gap-2">
          <span className="text-sm text-[#5c7287]">快捷值</span>
          <div className="flex flex-wrap gap-2">
            {completionQuickValues.map((item) => {
              const active = value === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChange(String(item))}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#0f7ea5] text-white shadow-[0_10px_24px_rgba(15,126,165,0.24)]'
                      : 'bg-[#edf4fa] text-[#5f768d] hover:bg-[#dcebf5] hover:text-[#17324d]'
                  }`}
                  aria-pressed={active}
                >
                  {item}%
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
