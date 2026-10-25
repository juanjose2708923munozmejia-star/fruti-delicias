import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv, type CookieToSet } from "./env";

/** Refresca la sesión y bloquea /admin para quien no haya iniciado sesión. */
export async function updateSession(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    url.search = "";
    return NextResponse.redirect(url);
  };

  const env = getPublicEnv();
  if (!env) return isAdminPath ? redirectToLogin() : NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list: CookieToSet[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never));
      },
    },
  });

  // getUser() valida el token con Supabase (no confía solo en la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath && !user) return redirectToLogin();
  return response;
}
