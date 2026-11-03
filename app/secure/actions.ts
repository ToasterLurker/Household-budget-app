"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function authenticatedClient() {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/sign-in");
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/sign-in");
  return client;
}

function validName(data: FormData, key: string) {
  const name = String(data.get(key) ?? "").trim();
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export async function createHouseholdAction(data: FormData) {
  const client = await authenticatedClient();
  const name = validName(data, "name");
  if (!name) redirect("/secure?error=invalid-name");
  const { error } = await client.rpc("create_household", { _name: name });
  if (error) redirect("/secure?error=household");
  revalidatePath("/secure");
  redirect("/secure");
}

export async function createPersonalAccountAction(data: FormData) {
  const client = await authenticatedClient();
  const name = validName(data, "name");
  if (!name) redirect("/secure?error=invalid-name");
  const { error } = await client.rpc("create_personal_account", { _name: name });
  if (error) redirect("/secure?error=account");
  revalidatePath("/secure");
  redirect("/secure");
}
