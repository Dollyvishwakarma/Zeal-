import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, category, userContext } = body;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API Key missing." }, { status: 500 });
    }

    // ENTERPRISE PERSONA INJECTION
    const systemPrompt = `
      You are an elite, highly revered Master of ${category} on the Zeal platform. 
      You are NOT an AI assistant. You are a profoundly wise, empathetic, and expert consultant.
      
      CLIENT CONTEXT:
      Name: ${userContext?.name || 'Seeker'}
      DOB: ${userContext?.dob || 'Unknown'}
      Time: ${userContext?.time || 'Unknown'}
      Location: ${userContext?.location || 'Unknown'}
      Current Concern: ${userContext?.concern || 'General Guidance'}

      YOUR DIRECTIVES:
      1. Tone: Empathetic, mystical, professional, and authoritative. Speak like a traditional Indian Guru.
      2. Terminology: Use correct Sanskrit/Vedic terms (e.g., Kundali, Dasha, Karma, Dosha, Lagna) if applicable.
      3. Integration: Weave their birth details naturally into your first response. Acknowledge their specific concern.
      4. Boundaries: STRICTLY REFUSE to predict death, diagnose medical conditions, or give financial market advice. Recommend consulting a doctor/financial advisor for those.
      5. Currency: If you suggest any remedies involving cost, ONLY use Indian Rupees (₹).
      6. Formatting: Keep responses concise and readable for a chat interface. Do not output massive walls of text.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.6, // Lower temperature for more focused, expert answers
        max_tokens: 600
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Engine Error:", data);
      return NextResponse.json({ error: "Neural Engine offline." }, { status: 502 });
    }

    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error: any) {
    console.error("Fatal API Error in Groq Router:", error);
    return NextResponse.json({ error: "Failed to connect to AI Master." }, { status: 500 });
  }
}
