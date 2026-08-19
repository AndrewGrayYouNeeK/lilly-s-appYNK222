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

    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const dow = today.getUTCDay();

    const { data: allowances } = await supabase
      .from("allowances")
      .select("*")
      .eq("active", true)
      .eq("day_of_week", dow);

    let paid = 0;
    for (const a of allowances || []) {
      if (a.last_paid_date === iso) continue;
      await supabase.from("wallet_transactions").insert({
        kid_email: a.kid_email,
        family_id: a.family_id,
        amount: a.amount,
        type: "earn",
        description: "Weekly allowance",
      });
      await supabase.from("allowances").update({ last_paid_date: iso }).eq("id", a.id);
      await supabase.from("notifications").insert({
        recipient_email: a.kid_email,
        family_id: a.family_id,
        type: "approval",
        emoji: "💰",
        title: `Allowance paid: ${a.amount}`,
        body: "Your weekly allowance just landed in your wallet",
        link: "/kid/wallet",
        read: false,
      });
      paid++;
    }

    return new Response(JSON.stringify({ paid, total: (allowances || []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
