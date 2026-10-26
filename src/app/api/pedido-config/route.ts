import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC = "Lo sentimos, ocurrió un problema. Intenta nuevamente.";

type SettingsRow = {
  orders_enabled: boolean;
  min_lead_minutes: number;
  max_days_ahead: number;
  max_items_per_order: number;
  nequi_number: string | null;
  nequi_holder: string | null;
  cash_enabled: boolean;
  nequi_enabled: boolean;
  pickup_instructions: string | null;
  address: string | null;
  business_name: string;
  contact_whatsapp: string | null;
};

/** Datos que necesita la pantalla de pedido: formas de pago y días/horas disponibles. */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select(
        "orders_enabled, min_lead_minutes, max_days_ahead, max_items_per_order, nequi_number, nequi_holder, cash_enabled, nequi_enabled, pickup_instructions, address, business_name, contact_whatsapp",
      )
      .eq("id", 1)
      .single();
    if (error || !data) throw error ?? new Error("Sin configuración");
    const s = data as SettingsRow;
    const dates = s.orders_enabled ? await getAvailability(admin, s) : [];
    return NextResponse.json(
      {
        ok: true,
        config: {
          ordersEnabled: s.orders_enabled,
          cashEnabled: s.cash_enabled,
          nequiEnabled: s.nequi_enabled && Boolean(s.nequi_number),
          nequiNumber: s.nequi_number,
          nequiHolder: s.nequi_holder,
          maxItems: s.max_items_per_order,
          pickupInstructions: s.pickup_instructions,
          address: s.address,
          businessName: s.business_name,
          whatsapp: s.contact_whatsapp,
        },
        dates,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("pedido-config", e);
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 500 });
  }
}
