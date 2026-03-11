// @ts-nocheck
/**
 * Vercel Middleware (Edge)
 * Digunakan untuk menangani routing subdomain 'layanan.ppsuika.ac.id'
 * agar langsung mengarah ke portal layanan surat.
 */
export default function middleware(req: Request) {
  const url = new URL(req.url);
  const hostname = req.headers.get("host") || "";

  // Subdomain yang dituju
  const portalDomain = "layanan.ppsuika.ac.id";

  // Jika hostname mencocokkan subdomain portal kita arahkan ke /layanan-surat
  if (hostname === portalDomain || hostname === `www.${portalDomain}`) {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      // Rewrite internal (URL di browser tetap sama, tapi isi yang dimuat dari /layanan-surat)
      url.pathname = "/layanan-surat";
      return Response.redirect(url);
      // Catatan: Rewrite murni biasanya memerlukan NextResponse dari 'next/server'.
      // Untuk platform generic, kita gunakan redirect atau pastikan routing SPA menangani domain.
    }
  }

  return null;
}

export const config = {
  matcher: ["/", "/index.html"],
};
