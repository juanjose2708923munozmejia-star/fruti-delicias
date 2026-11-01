import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PromoRow = {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  one_per_phone: boolean;
  expires_at: string | null;
  is_active: boolean;
};

const INVALID = "Ese código de descuento no es válido o ya no está disponible.";

/** Revisa un código para mostrar el descuento. El valor definitivo siempre lo recalcula el servidor al confirmar el pedido. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { code?: unknown; phone?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase().slice(0, 30) : "";
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("promo_codes")
      .select("id, code, discount_percent, discount_amount, max_uses, used_count, one_per_phone, expires_at, is_active")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    const row = (data as PromoRow | null) ?? null;
    const usable =
      row !== null &&
      row.is_active &&
      (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()) &&
      (row.max_uses === null || row.used_count < row.max_uses);
    if (!row || !usable) return NextResponse.json({ ok: false, error: INVALID }, { status: 404 });

    const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
    if (phone && row.one_per_phone) {
      const used = await admin.from("promo_redemptions").select("id", { count: "exact", head: true }).eq("code_id", row.id).eq("phone", phone);
      if ((used.count ?? 0) > 0) return NextResponse.json({ ok: false, error: "Ya usaste este código de descuento." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, code: row.code, percent: row.discount_percent, amount: row.discount_amount });
  } catch (e) {
    console.error("cupon", e);
    return NextResponse.json({ ok: false, error: "Lo sentimos, ocurrió un problema. Intenta nuevamente." }, { status: 500 });
  }
}
