import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  "sin-permiso": "Esta cuenta no tiene acceso al panel administrativo.",
  config: "El acceso no está disponible en este momento. Intenta más tarde.",
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (getPublicEnv()) {
    try {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) {
        const { data: admin } = await sb.from("admins").select("id").eq("id", user.id).maybeSingle();
        if (admin) redirect("/admin");
      }
    } catch (e) {
      // `redirect` lanza una excepción especial que debe continuar su camino.
      if (e && typeof e === "object" && "digest" in e) throw e;
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Link href="/" className="link-btn">← Volver al sitio</Link>
        <h1>Acceso administrativo</h1>
        <p className="muted">Solo para quienes administran el emprendimiento.</p>
        {error && ERRORS[error] && <p className="notice" role="alert">{ERRORS[error]}</p>}
        <LoginForm />
      </div>
    </main>
  );
}
