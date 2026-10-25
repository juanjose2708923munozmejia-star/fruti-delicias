import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (getPublicEnv()) {
    try {
      const sb = await createClient();
      await sb.auth.signOut();
    } catch {
      // Aunque falle, se continúa hacia la pantalla de acceso.
    }
  }
  return NextResponse.redirect(new URL("/acceso", request.url), { status: 303 });
}
