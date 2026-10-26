const TZ = "America/Bogota";

/** Fecha (YYYY-MM-DD) y minutos desde medianoche, en hora de Colombia. */
export function bogotaNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** "12:30" -> "12:30 PM" */
export function formatTime12(time: string): string {
  const [hh, mm] = time.split(":");
  const hour = Number(hh);
  return `${hour % 12 || 12}:${mm} ${hour >= 12 ? "PM" : "AM"}`;
}

export function formatLongDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${dateStr}T00:00:00Z`),
  );
}

export function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${dateStr}T00:00:00Z`),
  );
}

/** 123 -> "#000123" */
export function orderNumberLabel(n: number): string {
  return `#${String(n).padStart(6, "0")}`;
}
