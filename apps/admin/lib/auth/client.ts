import { createClient } from "@zeal/database/server";

export async function getClientSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
