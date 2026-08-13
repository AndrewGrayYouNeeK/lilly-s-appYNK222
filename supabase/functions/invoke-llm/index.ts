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
    const { prompt, file_urls, response_json_schema } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ fact: "Save a little each week and watch your goals grow!", tag: "Money 💰" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages = [{ role: "user", content: prompt }];
    const body: Record<string, unknown> = {
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    };

    if (response_json_schema) {
      body.response_format = { type: "json_object" };
      messages[0].content = `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}`;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (response_json_schema) {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
