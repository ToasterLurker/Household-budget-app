import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Old Supabase confirmation links no longer enroll users on this legacy site.
  return NextResponse.redirect(new URL("/sign-in", request.url));
}
