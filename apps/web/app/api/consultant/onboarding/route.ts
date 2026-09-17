import { NextResponse } from "next/server";
import { createClient } from "@zeal/database/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. Validate Session using native Supabase SSR
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // 2. Strong Error-Handled Upsert to the Consultant Table
    // We use 'as any' on the payload to bypass strict inference issues 
    // when inserting JSON objects into Supabase via TypeScript during build time.
    const { data: consultant, error: consultantError } = await supabase
      .from("Consultant")
      .upsert({
        id: crypto.randomUUID(),
        userId: session.user.id,
        category: body.category || "ASTROLOGER",
        specialties: body.specialties || [],
        languages: body.languages || ["English"],
        bio: body.bio || null,
        perMinuteRate: body.perMinuteRate || 50,
        availability: body.availability || {},
        verificationDocs: body.verificationDocs || {},
        status: "PENDING",
        bufferMinutes: 10,
        updatedAt: new Date().toISOString()
      } as any, { onConflict: "userId" })
      .select()
      .single();

    if (consultantError) {
      throw new Error(`Failed to create consultant profile: ${consultantError.message}`);
    }

    // 3. Flag user metadata to reflect application status
    const { error: authError } = await supabase.auth.updateUser({
      data: { is_consultant_applicant: true }
    });

    if (authError) {
      console.warn("Failed to update user auth metadata, but consultant profile was created.");
    }

    // 4. Return strict NextResponse
    return NextResponse.json({ 
      success: true, 
      consultant,
      message: "Onboarding application submitted successfully."
    });

  } catch (error: any) {
    console.error("Consultant Onboarding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
