export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value?: string): Date {
  const source = value ?? new Date().toISOString().slice(0, 10);
  return new Date(`${source}T00:00:00.000Z`);
}

export function getWeekStartDate(date: Date): Date {
  const cloned = new Date(date.toISOString());
  const day = cloned.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  cloned.setUTCDate(cloned.getUTCDate() + diff);
  cloned.setUTCHours(0, 0, 0, 0);
  return cloned;
}

export function getWeekEndDate(weekStartDate: Date): Date {
  const end = new Date(weekStartDate.toISOString());
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(0, 0, 0, 0);
  return end;
}
