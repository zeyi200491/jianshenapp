export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStartDateString(date = new Date()) {
  const cloned = new Date(date.toISOString());
  const day = cloned.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  cloned.setUTCDate(cloned.getUTCDate() + diff);
  cloned.setUTCHours(0, 0, 0, 0);
  return cloned.toISOString().slice(0, 10);
}

export function shiftDateString(dateString: string, days: number) {
  const cloned = new Date(`${dateString}T00:00:00.000Z`);
  cloned.setUTCDate(cloned.getUTCDate() + days);
  return cloned.toISOString().slice(0, 10);
}

export function shiftWeekStartDateString(dateString: string, weeks: number) {
  return shiftDateString(dateString, weeks * 7);
}