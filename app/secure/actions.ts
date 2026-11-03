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

function validUuid(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function validAmount(value: FormDataEntryValue | null, allowNegative = false) {
  const text = typeof value === "string" ? value.trim() : "";
  const negative = allowNegative && text.startsWith("-");
  const digits = negative ? text.slice(1) : text;
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(digits)) return null;
  const [dollars, fractional = ""] = digits.split(".");
  const cents = Number(dollars) * 100 + Number(fractional.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 999999999) return null;
  if (!allowNegative && cents === 0) return null;
  return negative ? -cents : cents;
}

function validDate(value: FormDataEntryValue | null): string | null {
  const date = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const dt = new Date(date + "T00:00:00.000Z");
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === date ? date : null;
}

function validDescription(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 && text.length <= 150 ? text : null;
}

// All mutations have server-verified identity and authorization inside
// PostgreSQL RLS-backed RPCs; clients never write balances directly.
export async function recordEntryAction(form: FormData) {
  const client = await authenticatedClient();
  const id = validUuid(form.get("account"));
  const op = validUuid(form.get("operation"));
  const kind = String(form.get("kind") ?? "");
  const amount = validAmount(form.get("amount"));
  const description = validDescription(form.get("description"));
  const date = validDate(form.get("date"));
  if (!id || !op || !["expense","income"].includes(kind) ||
      amount === null || !description || !date) {
    redirect("/secure?error=entry-input");
  }
  const { error } = await client.rpc("record_manual_entry", {
    _account_id:id, _entry_kind:kind, _amount_cents:amount,
    _description:description, _occurred_on:date, _operation_id:op,
  });
  if (error) redirect("/secure?error=entry-save");
  revalidatePath("/secure");
  redirect("/secure?notice=entry-recorded");
}

export async function recordTransferAction(form: FormData) {
  const client = await authenticatedClient();
  const from = validUuid(form.get("from"));
  const to = validUuid(form.get("to"));
  const op = validUuid(form.get("operation"));
  const amount = validAmount(form.get("amount"));
  const description = validDescription(form.get("description"));
  const date = validDate(form.get("date"));
  if (!from || !to || !op || from===to || amount===null || !description || !date) {
    redirect("/secure?error=entry-input");
  }
  const { error } = await client.rpc("record_manual_transfer", {
    _from_id:from, _to_id:to, _amount_cents:amount, _description:description,
    _occurred_on:date, _operation_id:op,
  });
  if (error) redirect("/secure?error=transfer-save");
  revalidatePath("/secure");
  redirect("/secure?notice=transfer-recorded");
}

export async function setInitialBalanceAction(form: FormData) {
  const client = await authenticatedClient();
  const account = validUuid(form.get("account"));
  const amount = validAmount(form.get("amount"), true);
  if (!account || amount===null) redirect("/secure?error=entry-input");
  const { error } = await client.rpc("set_account_opening_balance", {
    _account_id:account, _new_balance_cents:amount,
  });
  if (error) redirect("/secure?error=opening-save");
  revalidatePath("/secure");
  redirect("/secure?notice=opening-recorded");
}

export async function changeVisibilityAction(form: FormData) {
  const client = await authenticatedClient();
  const account = validUuid(form.get("account"));
  const visibility = String(form.get("visibility") ?? "");
  if (!account || !["private","balance","summary","full"].includes(visibility))
    redirect("/secure?error=entry-input");
  const { error } = await client.rpc("set_personal_account_visibility", {
    _account_id:account, _visibility:visibility,
  });
  if (error) redirect("/secure?error=visibility-save");
  revalidatePath("/secure");
  redirect("/secure?notice=visibility-updated");
}
