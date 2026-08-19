import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const claimId = body?.claimId || body?.data?.id || body?.event?.entity_id;
    if (!claimId) {
      return new Response(JSON.stringify({ error: "claimId required" }), { status: 400, headers: corsHeaders });
    }

    const { data: claim } = await supabase.from("chore_claims").select("*").eq("id", claimId).single();
    if (!claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), { status: 404, headers: corsHeaders });
    }
    if (claim.requires_photo === false) {
      return new Response(JSON.stringify({ skipped: "photo not required" }), { headers: corsHeaders });
    }
    if (!claim.before_photo_url || !claim.after_photo_url) {
      return new Response(JSON.stringify({ skipped: "missing photos" }), { headers: corsHeaders });
    }
    if (claim.ai_verdict && claim.ai_verdict !== "pending") {
      return new Response(JSON.stringify({ skipped: "already verified" }), { headers: corsHeaders });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      await supabase.from("chore_claims").update({
        ai_verdict: "needs_review",
        ai_score: 50,
        ai_reasoning: "AI verification unavailable — please review manually.",
      }).eq("id", claimId);
      return new Response(JSON.stringify({ ok: true, verdict: "needs_review" }), { headers: corsHeaders });
    }

    const prompt = `Review a child's chore submission for "${claim.chore_title}". Compare before/after photos. Return JSON: { "verdict": "looks_good"|"needs_review"|"suspicious", "score": 0-100, "reasoning": "one sentence" }`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    await supabase.from("chore_claims").update({
      ai_verdict: result.verdict || "needs_review",
      ai_score: Math.round(result.score || 0),
      ai_reasoning: result.reasoning,
    }).eq("id", claimId);

    return new Response(JSON.stringify({ ok: true, ...result }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
