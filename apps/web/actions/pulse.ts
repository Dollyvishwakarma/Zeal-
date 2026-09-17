"use server";
import { createClient } from "@zeal/database/server";

export async function executeConsultationPulse(consultationId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return { success: false, error: "Unauthorized Node Request." };

    // Execute the Postgres Function securely on the database layer
    const { data, error } = await supabase.rpc("pulse_deduct_inr", {
      p_consultation_id: consultationId,
      p_client_id: user.id
    });

    if (error) {
      console.error("Pulse Engine Fault:", error);
      return { success: false, error: "System fault on billing pulse." };
    }

    return data; 
  } catch (err) {
    return { success: false, error: "Fatal server error during billing pulse." };
  }
}

export async function triggerImpressionSpark(consultantId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_spark", { p_consultant_id: consultantId });
}
