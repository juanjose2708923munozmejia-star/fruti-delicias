import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, bogotaNow, toMinutes, weekdayOf } from "@/lib/colombia";

export type Slot = { time: string; remaining: number };
export type DayAvailability = { date: string; slots: Slot[] };
export type Limits = { min_lead_minutes: number; max_days_ahead: number };

type SlotRow = { weekday: number; slot_time: string; max_orders: number };

/**
 * Días y horas en que se puede recoger, con cupos restantes.
 * Respeta: franjas activas por día de la semana, fechas bloqueadas, cupos por hora,
 * anticipación mínima y máximo de días hacia adelante. Todo en hora de Colombia.
 */
export async function getAvailability(admin: SupabaseClient, limits: Limits): Promise<DayAvailability[]> {
  const now = bogotaNow();
  const from = now.date;
  const to = addDays(from, limits.max_days_ahead);

  const [slotsRes, blockedRes, ordersRes] = await Promise.all([
    admin.from("time_slots").select("weekday, slot_time, max_orders").eq("is_active", true),
    admin.from("blocked_dates").select("day").gte("day", from).lte("day", to),
    admin
      .from("orders")
      .select("pickup_date, pickup_time")
      .gte("pickup_date", from)
      .lte("pickup_date", to)
      .neq("status", "cancelado"),
  ]);
  if (slotsRes.error || blockedRes.error || ordersRes.error) throw new Error("No se pudo leer la disponibilidad");

  const slotRows = (slotsRes.data ?? []) as SlotRow[];
  const blocked = new Set(((blockedRes.data ?? []) as { day: string }[]).map((b) => b.day));
  const taken = new Map<string, number>();
  for (const o of (ordersRes.data ?? []) as { pickup_date: string; pickup_time: string }[]) {
    const key = `${o.pickup_date}|${o.pickup_time.slice(0, 5)}`;
    taken.set(key, (taken.get(key) ?? 0) + 1);
  }

  const days: DayAvailability[] = [];
  for (let i = 0; i <= limits.max_days_ahead; i++) {
    const date = addDays(from, i);
    if (blocked.has(date)) continue;
    const wd = weekdayOf(date);
    const slots: Slot[] = slotRows
      .filter((s) => s.weekday === wd)
      .map((s) => {
        const time = s.slot_time.slice(0, 5);
        return { time, remaining: s.max_orders - (taken.get(`${date}|${time}`) ?? 0) };
      })
      .filter((s) => s.remaining > 0)
      .filter((s) => date !== now.date || toMinutes(s.time) >= now.minutes + limits.min_lead_minutes)
      .sort((a, b) => a.time.localeCompare(b.time));
    if (slots.length > 0) days.push({ date, slots });
  }
  return days;
}
