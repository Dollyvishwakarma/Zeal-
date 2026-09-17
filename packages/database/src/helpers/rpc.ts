import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type FnName = keyof Database["public"]["Functions"];
type FnArgs<F extends FnName> = Database["public"]["Functions"][F]["Args"];
type FnReturn<F extends FnName> = Database["public"]["Functions"][F]["Returns"];

export async function callRpc<F extends FnName>(
  client: SupabaseClient<Database>,
  fn: F,
  args: FnArgs<F>,
): Promise<FnReturn<F>> {
  const { data, error } = await client.rpc(fn as never, args as never);
  if (error) throw new Error(`RPC ${String(fn)} failed: ${error.message}`);
  return data as FnReturn<F>;
}
