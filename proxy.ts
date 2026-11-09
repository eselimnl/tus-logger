import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Giriş gerektirmeyen yollar. /auth e-postadaki bağlantıların doğrulandığı yerdir.
const PUBLIC = ["/login", "/kayit", "/sifremi-unuttum", "/auth"];
// Giriş yapmış kullanıcının görmesine gerek olmayanlar.
const GUEST_ONLY = ["/login", "/kayit"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(p + "/"));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !matches(path, PUBLIC)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && matches(path, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // statik dosyalar, ikonlar ve manifest hariç her şey
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|apple-icon\\.png).*)",
  ],
};
