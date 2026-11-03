"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseCredentials(data: FormData) {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!email || email.length > 254 || !email.includes("@") ||
      password.length < 8 || password.length > 1000) return null;
  return { email, password };
}

export async function signInAction(data: FormData) {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/sign-in?error=not-configured");
  const credentials = parseCredentials(data);
  if (!credentials) redirect("/sign-in?error=invalid-input");
  const { error } = await client.auth.signInWithPassword(credentials);
  if (error?.code === "email_not_confirmed") redirect("/sign-in?error=email-not-confirmed");
  if (error) redirect("/sign-in?error=sign-in-failed");
  redirect("/secure");
}

export async function signUpAction(data: FormData) {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/sign-in?error=not-configured");
  const credentials = parseCredentials(data);
  if (!credentials) redirect("/sign-in?error=invalid-input");
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  // Supabase dashboard's Site URL must be set separately; never derive this from a Host header.
  const emailRedirectTo = origin?.startsWith("https://")
    ? new URL("/auth/callback", origin).toString() : undefined;
  const { error } = await client.auth.signUp({
    ...credentials,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) redirect("/sign-in?error=sign-up-failed");
  redirect("/sign-in?notice=check-email");
}

/**
 * Email confirmation retry. This does not reveal whether an address has an
 * account and is subject to Supabase's built-in email send rate limiting.
 */
export async function resendConfirmationAction(data: FormData) {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/sign-in?error=not-configured");
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !email.includes("@")) {
    redirect("/sign-in?error=invalid-email");
  }
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const emailRedirectTo = origin?.startsWith("https://")
    ? new URL("/auth/callback", origin).toString() : undefined;
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit") {
    redirect("/sign-in?error=send-rate-limited");
  }
  // Avoid exposing whether the email has an existing account to strangers.
  redirect("/sign-in?notice=confirmation-requested");
}

export async function signOutAction() {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();
  redirect("/sign-in?notice=signed-out");
}
