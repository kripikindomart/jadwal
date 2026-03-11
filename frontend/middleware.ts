import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Subdomain yang dituju
  const portalDomain = "layanan.ppsuika.ac.id";

  // Jika hostname mencocokkan subdomain portal
  if (hostname === portalDomain || hostname === `www.${portalDomain}`) {
    // Jika akses root '/' atau halaman index, rewrite secara internal ke /layanan-surat
    if (url.pathname === "/") {
      return NextResponse.rewrite(new URL("/layanan-surat", request.url));
    }
  }

  return NextResponse.next();
}

// Hanya jalankan middleware pada path tertentu untuk efisiensi
export const config = {
  matcher: ["/", "/index.html"],
};
