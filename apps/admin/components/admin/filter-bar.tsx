"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-field";

export type FilterField = {
  key: string;
  label: string;
  type: "search" | "select";
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

export function FilterBar({
  fields,
  values,
  onChange,
  onReset,
}: {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-black/8 bg-white/90 p-5 shadow-panel">
      <div className="grid gap-4 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">{field.label}</p>
            {field.type === "search" ? (
              <Input
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            ) : (
              <Select value={values[field.key] ?? ""} onChange={(event) => onChange(field.key, event.target.value)}>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onReset}>
          重置筛选
        </Button>
      </div>
    </div>
  );
}

