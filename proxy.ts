import { NextResponse, type NextRequest } from "next/server";

// Legacy Vercel demo is browser-local; Supabase sign-in has been retired.
// Do not make auth calls to an unneeded third-party service.
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}
export const config = { matcher: ["/secure/:path*", "/sign-in", "/auth/:path*"] };
