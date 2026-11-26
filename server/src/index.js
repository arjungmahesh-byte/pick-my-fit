// Pick My Fit AI helper: a tiny Cloudflare Worker that keeps your Anthropic API key
// off the phone. The app sends {prompt, images, tier}; this calls Claude and returns {text}.
import Anthropic from "@anthropic-ai/sdk";

const MAX_IMAGES = 4;
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-app-key",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {...cors, "content-type": "application/json"}});

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, {headers: cors});
    if (request.method !== "POST") return json({error: "POST only"}, 405);
    if (env.APP_KEY && request.headers.get("x-app-key") !== env.APP_KEY) return json({error: "unauthorized"}, 401);

    let body;
    try { body = await request.json(); } catch { return json({error: "bad json"}, 400); }
    const prompt = String(body.prompt || "").slice(0, 60000);
    if (!prompt) return json({error: "empty prompt"}, 400);
    const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    const content = [
      ...images
        .filter(i => i && okTypes.includes(i.media_type) && typeof i.data === "string" && i.data.length < 7_000_000)
        .map(i => ({type: "image", source: {type: "base64", media_type: i.media_type, data: i.data}})),
      {type: "text", text: prompt},
    ];

    const client = new Anthropic({apiKey: env.ANTHROPIC_API_KEY});
    try {
      const response = await client.beta.messages.create({
        model: env.MODEL || "claude-opus-5-5",
        max_tokens: 4000,
        output_config: {effort: body.tier === "quick" ? "low" : "medium"},
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: "You are the styling assistant inside Pick My Fit, a wardrobe app. Be friendly, short and concrete. When asked for JSON, reply with only that JSON.",
        messages: [{role: "user", content}],
      });
      if (response.stop_reason === "refusal") return json({text: "", refused: true});
      const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
      return json({text, truncated: response.stop_reason === "max_tokens"});
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json({error: "busy"}, 429);
      if (e instanceof Anthropic.APIError) return json({error: "ai error"}, 502);
      return json({error: "server error"}, 500);
    }
  },
};
