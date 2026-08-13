import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COACH_SYSTEM = `You are ChoreCoach, a friendly family chore coach for parents.
Help plan age-appropriate chores, review patterns, and give allowance advice.
Keep responses concise, practical, and encouraging.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { conversation_id, message } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ reply: "I'm your Chore Coach! Set up OPENAI_API_KEY in Supabase to enable AI responses. For now, try creating chores from the Chores tab." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_date", { ascending: true })
      .limit(20);

    const messages = [
      { role: "system", content: COACH_SYSTEM },
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.7 }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
