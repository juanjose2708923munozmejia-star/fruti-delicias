import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  order_number: number;
  status: string;
  pickup_date: string;
  pickup_time: string;
  assigned_pickup_time: string | null;
  payment_method: string;
  payment_status: string;
  total: number;
  ready_at: string | null;
  fulfillment: string;
};

/** Estado del pedido para el cliente. Solo se entrega con el enlace privado (token) del pedido. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!UUID.test(token)) return NextResponse.json({ ok: false, error: "Enlace no válido." }, { status: 404 });
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("order_number, status, pickup_date, pickup_time, assigned_pickup_time, payment_method, payment_status, total, ready_at, fulfillment")
      .eq("review_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, error: "No encontramos ese pedido." }, { status: 404 });
    const o = data as Row;
    return NextResponse.json(
      {
        ok: true,
        order: {
          number: o.order_number,
          status: o.status,
          pickupDate: o.pickup_date,
          pickupTime: o.pickup_time.slice(0, 5),
          assignedTime: o.assigned_pickup_time ? o.assigned_pickup_time.slice(0, 5) : null,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          total: o.total,
          readyAt: o.ready_at,
          fulfillment: o.fulfillment,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("seguimiento", e);
    return NextResponse.json({ ok: false, error: "Lo sentimos, ocurrió un problema. Intenta nuevamente." }, { status: 500 });
  }
}
